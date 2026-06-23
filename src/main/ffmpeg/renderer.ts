import { spawn } from 'child_process'
import { availableParallelism } from 'os'
import { copyFile, link, mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { extname, join } from 'path'
import type { ExportRequest, RenderProgress, TimelineClip, TransitionId } from '../../shared/types'
import { DEFAULT_TRANSITION_SECONDS } from '../../shared/types'
import { computeTotalFromDurations } from '../../shared/lib/duration'
import { runFfmpeg, runFfmpegWithFilterScript, runFfmpegWithProgress, writeFilterScript } from './ffmpegSpawn'
import {
  buildAudioFilter,
  buildClipFilter,
  buildSlideshowFilterComplex,
  getCodecArgs,
  getResolution,
  getXfadeName
} from './filterGraph'

type ProgressCallback = (progress: RenderProgress) => void

/** Above this clip count, single-pass filter graphs exhaust RAM on Windows. */
const SINGLE_PASS_MAX_CLIPS = 10
const SEGMENT_CONCURRENCY = Math.min(4, Math.max(2, availableParallelism()))
const MERGE_CONCURRENCY = 2

interface MergeNode {
  path: string
  duration: number
  startClipIndex: number
  clipCount: number
}

async function stageMediaPath(sourcePath: string, destPath: string): Promise<void> {
  try {
    await link(sourcePath, destPath)
  } catch {
    await copyFile(sourcePath, destPath)
  }
}

function clipDurationSeconds(clip: TimelineClip, fps: number): number {
  return Math.max(1 / Math.max(1, fps), clip.durationSeconds)
}

async function stageClipsForExport(
  clips: TimelineClip[],
  workDir: string
): Promise<TimelineClip[]> {
  const staged: TimelineClip[] = []
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const ext = extname(clip.filePath) || (clip.mediaType === 'image' ? '.jpg' : '.mp4')
    const shortPath = join(workDir, `in_${i}${ext}`)
    await stageMediaPath(clip.filePath, shortPath)
    staged.push({ ...clip, filePath: shortPath })
  }
  return staged
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let next = 0
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++
      await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
}

async function renderClipSegment(
  clip: TimelineClip,
  outputPath: string,
  width: number,
  height: number,
  fps: number,
  workDir: string
): Promise<void> {
  const duration = clipDurationSeconds(clip, fps)
  const durationStr = duration.toFixed(3)
  const vf = buildClipFilter(
    {
      mediaType: clip.mediaType,
      durationSeconds: duration,
      effectId: clip.effectId,
      transitionId: null
    },
    width,
    height,
    fps
  )

  const inputArgs = ['-y']
  if (clip.mediaType === 'image') {
    inputArgs.push('-loop', '1', '-t', durationStr, '-i', clip.filePath)
  } else {
    inputArgs.push('-i', clip.filePath)
  }

  await runFfmpegWithFilterScript(
    workDir,
    inputArgs,
    `[0:v]${vf}[out]`,
    [
      '-map', '[out]',
      '-an',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      '-t', durationStr,
      outputPath
    ]
  )
}

async function mergeTwoWithXfade(
  leftPath: string,
  rightPath: string,
  outputPath: string,
  transitionId: TransitionId | null,
  transitionSeconds: number,
  leftDuration: number,
  workDir: string
): Promise<void> {
  const xfadeName = getXfadeName(transitionId ?? 'crossfade')
  const offset = Math.max(0, leftDuration - transitionSeconds)
  const filter = `[0:v][1:v]xfade=transition=${xfadeName}:duration=${transitionSeconds}:offset=${offset.toFixed(3)},format=yuv420p[v]`

  await runFfmpegWithFilterScript(
    workDir,
    ['-y', '-i', leftPath, '-i', rightPath],
    filter,
    [
      '-map', '[v]',
      '-an',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      outputPath
    ]
  )
}

async function binaryMergeSegments(
  nodes: MergeNode[],
  clips: TimelineClip[],
  transitionSeconds: number,
  workDir: string,
  onProgress: ProgressCallback
): Promise<MergeNode> {
  let level = nodes
  let round = 0
  const totalMerges = nodes.length - 1
  let mergesDone = 0

  while (level.length > 1) {
    const nextLevel: MergeNode[] = []
    const jobs: {
      left: MergeNode
      right: MergeNode
      outPath: string
      transitionId: TransitionId | null
    }[] = []

    for (let i = 0; i + 1 < level.length; i += 2) {
      const left = level[i]
      const right = level[i + 1]
      const boundaryClipIndex = left.startClipIndex + left.clipCount - 1
      jobs.push({
        left,
        right,
        outPath: join(workDir, `bt_${round}_${i}.mp4`),
        transitionId: clips[boundaryClipIndex]?.transitionId ?? null
      })
    }

    await runPool(jobs, MERGE_CONCURRENCY, async (job) => {
      await mergeTwoWithXfade(
        job.left.path,
        job.right.path,
        job.outPath,
        job.transitionId,
        transitionSeconds,
        job.left.duration,
        workDir
      )
      mergesDone++
      onProgress({
        stage: 'transitions',
        current: mergesDone,
        total: totalMerges,
        message: `Blending transitions (${mergesDone}/${totalMerges})…`,
        percent: 58 + Math.floor((mergesDone / totalMerges) * 28)
      })
    })

    for (let i = 0; i + 1 < level.length; i += 2) {
      const left = level[i]
      const right = level[i + 1]
      const outPath = join(workDir, `bt_${round}_${i}.mp4`)
      nextLevel.push({
        path: outPath,
        duration: left.duration + right.duration - transitionSeconds,
        startClipIndex: left.startClipIndex,
        clipCount: left.clipCount + right.clipCount
      })
    }

    if (level.length % 2 === 1) {
      nextLevel.push(level[level.length - 1])
    }

    level = nextLevel
    round++
  }

  return level[0]
}

async function finalizeExport(
  videoPath: string,
  outputPath: string,
  outputDuration: number,
  project: ExportRequest['project'],
  workDir: string
): Promise<void> {
  const { vcodec, extra } = getCodecArgs(project.exportSettings.codec)
  const passthrough = extra.filter(
    (a, i, arr) => a !== '-preset' && a !== 'veryfast' && a !== '-crf' && !(arr[i - 1] === '-crf')
  )

  if (project.audio) {
    const audioExt = extname(project.audio.filePath) || '.mpeg'
    const stagedAudio = join(workDir, `audio${audioExt}`)
    await stageMediaPath(project.audio.filePath, stagedAudio)

    const { filter, label } = buildAudioFilter(
      1,
      outputDuration,
      project.audio.fadeInSeconds,
      project.audio.fadeOutSeconds,
      project.audio.startOffsetSeconds ?? 0
    )
    await runFfmpegWithFilterScript(workDir, ['-y', '-i', videoPath, '-i', stagedAudio], filter, [
      '-map', '0:v',
      '-map', `[${label}]`,
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-c:v', vcodec,
      '-preset', 'ultrafast',
      '-crf', '21',
      ...passthrough,
      '-pix_fmt', 'yuv420p',
      '-r', String(project.exportSettings.fps),
      '-t', outputDuration.toFixed(3),
      outputPath
    ])
    return
  }

  await runFfmpeg([
    '-y', '-i', videoPath,
    '-map', '0:v',
    '-c:v', vcodec,
    '-preset', 'ultrafast',
    '-crf', '21',
    ...passthrough,
    '-pix_fmt', 'yuv420p',
    '-r', String(project.exportSettings.fps),
    '-t', outputDuration.toFixed(3),
    outputPath
  ])
}

async function renderSinglePass(
  request: ExportRequest,
  stagedClips: TimelineClip[],
  tempDir: string,
  width: number,
  height: number,
  fps: number,
  transitionSeconds: number,
  outputDuration: number,
  onProgress: ProgressCallback
): Promise<void> {
  const { project, outputPath } = request
  const { extra } = getCodecArgs(project.exportSettings.codec)
  const passthrough = extra.filter(
    (a, i, arr) => a !== '-preset' && a !== 'veryfast' && a !== '-crf' && !(arr[i - 1] === '-crf')
  )

  const exportClips = stagedClips.map((c) => ({
    mediaType: c.mediaType,
    durationSeconds: clipDurationSeconds(c, fps),
    effectId: c.effectId,
    transitionId: c.transitionId
  }))

  const { filterComplex, videoLabel, audioLabel } = buildSlideshowFilterComplex(
    exportClips,
    width,
    height,
    fps,
    transitionSeconds,
    outputDuration,
    project.audio
      ? {
          inputIndex: stagedClips.length,
          fadeIn: project.audio.fadeInSeconds,
          fadeOut: project.audio.fadeOutSeconds,
          startOffset: project.audio.startOffsetSeconds ?? 0
        }
      : undefined
  )

  const inputArgs: string[] = ['-y']
  for (const clip of stagedClips) {
    const durationStr = clipDurationSeconds(clip, fps).toFixed(3)
    if (clip.mediaType === 'image') {
      inputArgs.push('-loop', '1', '-t', durationStr, '-i', clip.filePath)
    } else {
      inputArgs.push('-i', clip.filePath)
    }
  }

  if (project.audio) {
    const audioExt = extname(project.audio.filePath) || '.mpeg'
    const stagedAudio = join(tempDir, `audio${audioExt}`)
    await stageMediaPath(project.audio.filePath, stagedAudio)
    inputArgs.push('-i', stagedAudio)
  }

  const filterPath = await writeFilterScript(tempDir, filterComplex)
  const tail = [
    '-map', `[${videoLabel}]`,
    '-c:v', project.exportSettings.codec === 'h265' ? 'libx265' : 'libx264',
    '-preset', 'ultrafast',
    '-crf', '21',
    ...passthrough,
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    '-threads', '0',
    '-t', outputDuration.toFixed(3)
  ]
  if (project.audio && audioLabel) {
    tail.push('-map', `[${audioLabel}]`, '-c:a', 'aac', '-b:a', '192k', '-shortest')
  }
  tail.push(outputPath)

  await runFfmpegWithProgress(
    [...inputArgs, '-nostats', '-progress', 'pipe:1', '-filter_complex_script', filterPath, ...tail],
    outputDuration,
    (p) => {
      onProgress({
        ...p,
        message: `Encoding… ${p.percent}%`,
        percent: Math.max(2, p.percent)
      })
    }
  )
}

async function renderParallelPipeline(
  request: ExportRequest,
  stagedClips: TimelineClip[],
  tempDir: string,
  width: number,
  height: number,
  fps: number,
  transitionSeconds: number,
  outputDuration: number,
  onProgress: ProgressCallback
): Promise<void> {
  const { project, outputPath } = request
  const segmentPaths: string[] = new Array(stagedClips.length)
  let segmentsDone = 0

  onProgress({
    stage: 'segments',
    current: 0,
    total: stagedClips.length,
    message: `Rendering clips (${SEGMENT_CONCURRENCY} at a time)…`,
    percent: 2
  })

  await runPool(stagedClips, SEGMENT_CONCURRENCY, async (clip, i) => {
    const segPath = join(tempDir, `seg_${i}.mp4`)
    await renderClipSegment(clip, segPath, width, height, fps, tempDir)
    segmentPaths[i] = segPath
    segmentsDone++
    onProgress({
      stage: 'segments',
      current: segmentsDone,
      total: stagedClips.length,
      message: `Rendered clip ${segmentsDone}/${stagedClips.length}`,
      percent: 2 + Math.floor((segmentsDone / stagedClips.length) * 54)
    })
  })

  const nodes: MergeNode[] = segmentPaths.map((path, i) => ({
    path,
    duration: clipDurationSeconds(stagedClips[i], fps),
    startClipIndex: i,
    clipCount: 1
  }))

  const merged = await binaryMergeSegments(
    nodes,
    stagedClips,
    transitionSeconds,
    tempDir,
    onProgress
  )

  onProgress({
    stage: project.audio ? 'audio' : 'finalize',
    current: 1,
    total: 1,
    message: project.audio ? 'Mixing music…' : 'Finalizing…',
    percent: 90
  })

  await finalizeExport(merged.path, outputPath, outputDuration, project, tempDir)
}

export async function renderSlideshow(
  request: ExportRequest,
  onProgress: ProgressCallback
): Promise<void> {
  const { project } = request
  const clips = project.clips.map((clip, index) => ({ ...clip, order: index }))
  if (clips.length === 0) throw new Error('No clips to render')

  const { width, height } = getResolution(project.exportSettings.resolution)
  const fps = project.exportSettings.fps
  const transitionSeconds = project.transitionSeconds ?? DEFAULT_TRANSITION_SECONDS
  const tempDir = await mkdtemp(join(tmpdir(), 'cs-export-'))

  try {
    onProgress({
      stage: 'segments',
      current: 0,
      total: clips.length,
      message: `Preparing ${clips.length} clips…`,
      percent: 0
    })

    const stagedClips = await stageClipsForExport(clips, tempDir)
    const outputDuration = computeTotalFromDurations(
      stagedClips.map((c) => clipDurationSeconds(c, fps)),
      transitionSeconds
    )

    if (clips.length <= SINGLE_PASS_MAX_CLIPS) {
      onProgress({
        stage: 'segments',
        current: 1,
        total: 1,
        message: `Encoding ${clips.length} clips…`,
        percent: 2
      })
      await renderSinglePass(
        request,
        stagedClips,
        tempDir,
        width,
        height,
        fps,
        transitionSeconds,
        outputDuration,
        onProgress
      )
    } else {
      await renderParallelPipeline(
        request,
        stagedClips,
        tempDir,
        width,
        height,
        fps,
        transitionSeconds,
        outputDuration,
        onProgress
      )
    }

    onProgress({
      stage: 'done',
      current: 1,
      total: 1,
      message: 'Export complete',
      percent: 100
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function checkFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version'], { windowsHide: true })
    proc.on('close', (code) => resolve(code === 0))
    proc.on('error', () => resolve(false))
  })
}
