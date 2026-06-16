import { spawn } from 'child_process'
import type { ExportRequest, RenderProgress } from '../../shared/types'
import { DEFAULT_TRANSITION_SECONDS } from '../../shared/types'
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

    // FFmpeg -progress key/value lines come on stdout
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
  const images = [...project.images].sort((a, b) => a.order - b.order)
  if (images.length === 0) throw new Error('No images to render')

  const { width, height } = getResolution(project.exportSettings.resolution)
  const fps = project.exportSettings.fps
  const transitionSeconds = DEFAULT_TRANSITION_SECONDS
  const perImageDuration = Math.max(
    1 / Math.max(1, fps),
    images[0]?.durationSeconds ?? project.targetDurationSeconds
  )
  const durationStr = perImageDuration.toFixed(3)

  const { vcodec, extra } = getCodecArgs(project.exportSettings.codec)
  const { filterComplex, videoLabel, audioLabel } = buildSlideshowFilterComplex(
    images.map((img) => ({ effectId: img.effectId, transitionId: img.transitionId })),
    width,
    height,
    fps,
    perImageDuration,
    transitionSeconds,
    project.audio
      ? {
          inputIndex: images.length,
          targetDuration: project.targetDurationSeconds,
          fadeIn: project.audio.fadeInSeconds,
          fadeOut: project.audio.fadeOutSeconds
        }
      : undefined
  )

  const args = ['-y']
  for (const img of images) {
    args.push('-loop', '1', '-t', durationStr, '-i', img.filePath)
  }
  if (project.audio) {
    args.push('-i', project.audio.filePath)
  }

  onProgress({
    stage: 'segments',
    current: 1,
    total: 1,
    message: `Starting export (${images.length} images)`,
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
    '-t', String(project.targetDurationSeconds)
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

  await runFfmpegWithProgress(args, project.targetDurationSeconds, onProgress)

  onProgress({
    stage: 'done',
    current: 1,
    total: 1,
    message: 'Export complete',
    percent: 100
  })
}
