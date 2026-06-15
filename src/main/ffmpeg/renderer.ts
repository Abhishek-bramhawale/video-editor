import { spawn } from 'child_process'
import { mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { ExportRequest, RenderProgress } from '../../shared/types'
import { DEFAULT_TRANSITION_SECONDS } from '../../shared/types'
import {
  buildZoompanFilter,
  computePerImageDuration,
  getCodecArgs,
  getResolution,
  getXfadeName
} from './filterGraph'

type ProgressCallback = (progress: RenderProgress) => void

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { windowsHide: true })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.slice(-500) || `FFmpeg exited with code ${code}`))
    })
    proc.on('error', (err) => reject(err))
  })
}

export async function checkFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version'], { windowsHide: true })
    proc.on('close', (code) => resolve(code === 0))
    proc.on('error', () => resolve(false))
  })
}

export async function renderSlideshow(
  request: ExportRequest,
  onProgress: ProgressCallback
): Promise<void> {
  const { project, outputPath } = request
  const images = [...project.images].sort((a, b) => a.order - b.order)
  if (images.length === 0) throw new Error('No images to render')

  const { width, height } = getResolution(project.exportSettings.resolution)
  const fps = project.exportSettings.fps
  const transitionSeconds = DEFAULT_TRANSITION_SECONDS
  const perImageDuration = computePerImageDuration(
    project.targetDurationSeconds,
    images.length,
    transitionSeconds
  )

  const workDir = join(tmpdir(), `cinematic-slideshow-${Date.now()}`)
  await mkdir(workDir, { recursive: true })

  try {
    const segmentPaths: string[] = []

    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      const effectId = img.effectId ?? 'slow-zoom-center'
      const segmentPath = join(workDir, `seg_${i.toString().padStart(4, '0')}.mp4`)
      const vf = buildZoompanFilter(effectId, width, height, fps, perImageDuration)

      onProgress({
        stage: 'segments',
        current: i + 1,
        total: images.length,
        message: `Rendering segment ${i + 1} of ${images.length}`,
        percent: Math.round(((i + 1) / (images.length + 3)) * 100)
      })

      await runFfmpeg([
        '-y',
        '-hwaccel', 'auto',
        '-loop', '1',
        '-i', img.filePath,
        '-vf', vf,
        '-c:v', 'libx264',
        '-t', perImageDuration.toFixed(3),
        '-pix_fmt', 'yuv420p',
        '-an',
        segmentPath
      ])

      segmentPaths.push(segmentPath)
    }

    let videoPath = segmentPaths[0]

    if (segmentPaths.length > 1) {
      onProgress({
        stage: 'transitions',
        current: 0,
        total: segmentPaths.length - 1,
        message: 'Applying cinematic transitions',
        percent: 60
      })

      let currentPath = segmentPaths[0]
      let accumulatedDuration = perImageDuration

      for (let i = 1; i < segmentPaths.length; i++) {
        const transitionId = images[i - 1].transitionId ?? 'crossfade'
        const xfadeName = getXfadeName(transitionId)
        const offset = Math.max(0, accumulatedDuration - transitionSeconds)
        const mergedPath = join(workDir, `merged_${i}.mp4`)

        onProgress({
          stage: 'transitions',
          current: i,
          total: segmentPaths.length - 1,
          message: `Transition ${i} of ${segmentPaths.length - 1}`,
          percent: 60 + Math.round((i / (segmentPaths.length - 1)) * 20)
        })

        await runFfmpeg([
          '-y',
          '-hwaccel', 'auto',
          '-i', currentPath,
          '-i', segmentPaths[i],
          '-filter_complex',
          `[0:v][1:v]xfade=transition=${xfadeName}:duration=${transitionSeconds}:offset=${offset.toFixed(3)}[v]`,
          '-map', '[v]',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          mergedPath
        ])

        currentPath = mergedPath
        accumulatedDuration = accumulatedDuration + perImageDuration - transitionSeconds
      }

      videoPath = currentPath
    }

    const { vcodec, extra } = getCodecArgs(project.exportSettings.codec)
    const finalArgs = [
      '-y',
      '-hwaccel', 'auto',
      '-i', videoPath
    ]

    if (project.audio) {
      onProgress({
        stage: 'audio',
        current: 1,
        total: 1,
        message: 'Mixing background music',
        percent: 85
      })

      const fadeOutStart = Math.max(0, project.targetDurationSeconds - project.audio.fadeOutSeconds)
      finalArgs.push(
        '-i', project.audio.filePath,
        '-filter_complex',
        `[1:a]atrim=0:${project.targetDurationSeconds},afade=t=in:st=0:d=${project.audio.fadeInSeconds},afade=t=out:st=${fadeOutStart}:d=${project.audio.fadeOutSeconds}[a]`,
        '-map', '0:v',
        '-map', '[a]',
        '-c:v', vcodec,
        ...extra,
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        outputPath
      )
    } else {
      onProgress({
        stage: 'finalize',
        current: 1,
        total: 1,
        message: 'Finalizing video',
        percent: 90
      })

      finalArgs.push('-c:v', vcodec, ...extra, outputPath)
    }

    await runFfmpeg(finalArgs)

    onProgress({
      stage: 'done',
      current: 1,
      total: 1,
      message: 'Export complete',
      percent: 100
    })
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}
