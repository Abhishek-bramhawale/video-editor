import { spawn } from 'child_process'
import type { ExportRequest, RenderProgress } from '../../shared/types'
import { DEFAULT_TRANSITION_SECONDS } from '../../shared/types'
import { computeTotalFromDurations } from '../../shared/lib/duration'
import {
  buildSlideshowFilterComplex,
  getCodecArgs,
  getResolution
} from './filterGraph'

type ProgressCallback = (progress: RenderProgress) => void

function runFfmpegWithProgress(
  args: string[],
  totalSeconds: number,
  onProgress: ProgressCallback
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { windowsHide: true })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    let stdoutBuf = ''
    let lastPercent = -1

    proc.stdout?.on('data', (d) => {
      stdoutBuf += d.toString()
      let idx: number
      while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
        const line = stdoutBuf.slice(0, idx).trim()
        stdoutBuf = stdoutBuf.slice(idx + 1)
        const eq = line.indexOf('=')
        if (eq <= 0) continue
        const key = line.slice(0, eq)
        const value = line.slice(eq + 1)

        if (key === 'out_time_ms') {
          const outTimeMs = parseInt(value, 10)
          if (!Number.isFinite(outTimeMs) || totalSeconds <= 0) continue
          const pct = Math.max(0, Math.min(99, Math.floor((outTimeMs / 1_000_000 / totalSeconds) * 100)))
          if (pct !== lastPercent) {
            lastPercent = pct
            onProgress({
              stage: 'segments',
              current: 1,
              total: 1,
              message: `Exporting… ${pct}%`,
              percent: pct
            })
          }
        }
      }
    })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.slice(-800) || `FFmpeg exited with code ${code}`))
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
  const clips = [...project.clips].sort((a, b) => a.order - b.order)
  if (clips.length === 0) throw new Error('No clips to render')

  const { width, height } = getResolution(project.exportSettings.resolution)
  const fps = project.exportSettings.fps
  const transitionSeconds = project.transitionSeconds ?? DEFAULT_TRANSITION_SECONDS
  const durations = clips.map((c) => c.durationSeconds)
  const outputDuration = computeTotalFromDurations(durations, transitionSeconds)

  const exportClips = clips.map((c) => ({
    mediaType: c.mediaType,
    durationSeconds: Math.max(1 / Math.max(1, fps), c.durationSeconds),
    effectId: c.effectId,
    transitionId: c.transitionId
  }))

  const { vcodec, extra } = getCodecArgs(project.exportSettings.codec)
  const { filterComplex, videoLabel, audioLabel } = buildSlideshowFilterComplex(
    exportClips,
    width,
    height,
    fps,
    transitionSeconds,
    outputDuration,
    project.audio
      ? {
          inputIndex: clips.length,
          fadeIn: project.audio.fadeInSeconds,
          fadeOut: project.audio.fadeOutSeconds
        }
      : undefined
  )

  const args = ['-y']
  for (const clip of clips) {
    const durationStr = Math.max(1 / Math.max(1, fps), clip.durationSeconds).toFixed(3)
    if (clip.mediaType === 'image') {
      args.push('-loop', '1', '-t', durationStr, '-i', clip.filePath)
    } else {
      args.push('-i', clip.filePath)
    }
  }
  if (project.audio) {
    args.push('-i', project.audio.filePath)
  }

  onProgress({
    stage: 'segments',
    current: 1,
    total: 1,
    message: `Starting export (${clips.length} clips)`,
    percent: 0
  })

  args.push(
    '-nostats',
    '-progress', 'pipe:1',
    '-filter_complex', filterComplex,
    '-map', `[${videoLabel}]`,
    '-c:v', vcodec,
    ...extra,
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    '-t', outputDuration.toFixed(3)
  )

  if (audioLabel) {
    onProgress({
      stage: 'audio',
      current: 1,
      total: 1,
      message: 'Mixing background music',
      percent: 70
    })
    args.push('-map', `[${audioLabel}]`, '-c:a', 'aac', '-b:a', '192k', '-shortest')
  }

  args.push(outputPath)

  await runFfmpegWithProgress(args, outputDuration, onProgress)

  onProgress({
    stage: 'done',
    current: 1,
    total: 1,
    message: 'Export complete',
    percent: 100
  })
}
