import { spawn } from 'child_process'
import type { ExportRequest, RenderProgress } from '../../shared/types'
import { DEFAULT_TRANSITION_SECONDS } from '../../shared/types'
import {
  buildSlideshowFilterComplex,
  computePerImageDuration,
  getCodecArgs,
  getResolution
} from './filterGraph'

type ProgressCallback = (progress: RenderProgress) => void

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { windowsHide: true })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
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
  const computedPerImageDuration = computePerImageDuration(
    project.targetDurationSeconds,
    images.length,
    transitionSeconds
  )
  const perImageDuration = Math.max(1 / Math.max(1, fps), computedPerImageDuration)
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
    message: `Rendering ${images.length} images in a single pass`,
    percent: 10
  })

  args.push(
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

  await runFfmpeg(args)

  onProgress({
    stage: 'done',
    current: 1,
    total: 1,
    message: 'Export complete',
    percent: 100
  })
}
