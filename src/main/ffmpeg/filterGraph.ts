import type { KenBurnsEffectId, TransitionId } from '../../shared/types'
import { RESOLUTION_MAP } from '../../shared/types'
import { getTransitionFfmpegName } from '../../shared/transitions/catalog'

/** Effect zoom/pan expressions — mirrored from renderer effects for FFmpeg */
const EFFECT_FFMPEG: Record<
  KenBurnsEffectId,
  { zoom: [number, number]; panX: [number, number]; panY: [number, number] }
> = {
  'slow-zoom-center': { zoom: [1, 1.15], panX: [0, 0], panY: [0, 0] },
  'slow-zoom-in': { zoom: [1, 1.25], panX: [0, 0], panY: [0, 0] },
  'slow-zoom-out': { zoom: [1.25, 1], panX: [0, 0], panY: [0, 0] },
  'zoom-to-face': { zoom: [1, 1.35], panX: [0, -40], panY: [0, -60] },
  'zoom-left': { zoom: [1.05, 1.2], panX: [30, -50], panY: [0, 0] },
  'zoom-right': { zoom: [1.05, 1.2], panX: [-30, 50], panY: [0, 0] },
  'zoom-top': { zoom: [1.05, 1.18], panX: [0, 0], panY: [40, -50] },
  'zoom-bottom': { zoom: [1.05, 1.18], panX: [0, 0], panY: [-40, 50] },
  'pan-left': { zoom: [1.12, 1.12], panX: [80, -80], panY: [0, 0] },
  'pan-right': { zoom: [1.12, 1.12], panX: [-80, 80], panY: [0, 0] },
  'pan-up': { zoom: [1.12, 1.12], panX: [0, 0], panY: [60, -60] },
  'pan-down': { zoom: [1.12, 1.12], panX: [0, 0], panY: [-60, 60] },
  'pan-diagonal': { zoom: [1.1, 1.15], panX: [-60, 60], panY: [45, -45] },
  'zoom-while-panning': { zoom: [1, 1.22], panX: [-50, 50], panY: [0, 0] },
  dolly: { zoom: [1.08, 1.28], panX: [0, 0], panY: [0, 0] },
  'push-in': { zoom: [1, 1.3], panX: [0, 0], panY: [0, 0] },
  'pull-out': { zoom: [1.3, 1], panX: [0, 0], panY: [0, 0] },
  'subtle-float': { zoom: [1.06, 1.1], panX: [-15, 15], panY: [8, -8] },
  'cinematic-drift': { zoom: [1.08, 1.14], panX: [-25, 25], panY: [15, -20] },
  documentary: { zoom: [1, 1.12], panX: [-10, 20], panY: [5, -15] },
  parallax: { zoom: [1.1, 1.18], panX: [-35, 35], panY: [20, -20] }
}


export function buildZoompanFilter(
  effectId: KenBurnsEffectId,
  width: number,
  height: number,
  fps: number,
  durationSeconds: number
): string {
  const effect = EFFECT_FFMPEG[effectId] ?? EFFECT_FFMPEG['slow-zoom-center']
  // zoompan expressions below interpolate using a denominator derived from frame count.
  // Ensure we never end up with 0 (or negative) to avoid invalid filter graphs.
  const frames = Math.max(2, Math.round(durationSeconds * fps))
  const denom = Math.max(1, frames - 1)
  const [z0, z1] = effect.zoom
  const [x0, x1] = effect.panX
  const [y0, y1] = effect.panY

  const zExpr = `${z0}+${z1 - z0}*(-0.5*cos(PI*on/${denom})+0.5)`
  const xExpr = `iw/2-(iw/zoom/2)+(${x1 - x0})*(-0.5*cos(PI*on/${denom})+0.5)+${x0}`
  const yExpr = `ih/2-(ih/zoom/2)+(${y1 - y0})*(-0.5*cos(PI*on/${denom})+0.5)+${y0}`

  const overscan = 1.4
  const scaleW = Math.round(width * overscan)
  const scaleH = Math.round(height * overscan)

  return `scale=${scaleW}:${scaleH}:force_original_aspect_ratio=increase,crop=${scaleW}:${scaleH},zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=${width}x${height}:fps=${fps}`
}


export interface SlideshowClip {
  effectId: KenBurnsEffectId | null
  transitionId: TransitionId | null
}

export function buildSlideshowFilterComplex(
  clips: SlideshowClip[],
  width: number,
  height: number,
  fps: number,
  perImageDuration: number,
  transitionSeconds: number,
  audio?: { inputIndex: number; targetDuration: number; fadeIn: number; fadeOut: number }
): { filterComplex: string; videoLabel: string; audioLabel?: string } {
  const parts: string[] = []

  for (let i = 0; i < clips.length; i++) {
    const vf = buildZoompanFilter(
      clips[i].effectId ?? 'slow-zoom-center',
      width,
      height,
      fps,
      perImageDuration
    )
    parts.push(`[${i}:v]${vf},setpts=PTS-STARTPTS[v${i}]`)
  }

  let videoLabel = 'v0'
  if (clips.length > 1) {
    let prevLabel = 'v0'
    let accumulatedDuration = perImageDuration

    for (let i = 1; i < clips.length; i++) {
      const xfadeName = getXfadeName(clips[i - 1].transitionId ?? 'crossfade')
      const offset = Math.max(0, accumulatedDuration - transitionSeconds)
      const outLabel = i === clips.length - 1 ? 'vout' : `t${i}`
      parts.push(
        `[${prevLabel}][v${i}]xfade=transition=${xfadeName}:duration=${transitionSeconds}:offset=${offset.toFixed(3)}[${outLabel}]`
      )
      prevLabel = outLabel
      accumulatedDuration += perImageDuration - transitionSeconds
    }
    videoLabel = 'vout'
  }

  let audioLabel: string | undefined
  if (audio) {
    const fadeOutStart = Math.max(0, audio.targetDuration - audio.fadeOut)
    audioLabel = 'aout'
    parts.push(
      `[${audio.inputIndex}:a]atrim=0:${audio.targetDuration},afade=t=in:st=0:d=${audio.fadeIn},afade=t=out:st=${fadeOutStart}:d=${audio.fadeOut}[${audioLabel}]`
    )
  }

  return { filterComplex: parts.join(';'), videoLabel, audioLabel }
}

export function getResolution(resolution: '720p' | '1080p'): { width: number; height: number } {
  return RESOLUTION_MAP[resolution]
}

export function getXfadeName(transitionId: string): string {
  return getTransitionFfmpegName(transitionId)
}

export function computePerImageDuration(
  targetSeconds: number,
  imageCount: number,
  transitionSeconds: number
): number {
  if (imageCount <= 0) return 0
  if (imageCount === 1) return targetSeconds
  return (targetSeconds + (imageCount - 1) * transitionSeconds) / imageCount
}

export function getCodecArgs(codec: 'h264' | 'h265' | 'mov'): { vcodec: string; extra: string[] } {
  switch (codec) {
    case 'h265':
      return { vcodec: 'libx265', extra: ['-preset', 'veryfast', '-crf', '22', '-tag:v', 'hvc1'] }
    case 'mov':
      return { vcodec: 'libx264', extra: ['-preset', 'veryfast', '-crf', '20', '-movflags', '+faststart'] }
    default:
      return { vcodec: 'libx264', extra: ['-preset', 'veryfast', '-crf', '20', '-movflags', '+faststart', '-threads', '0'] }
  }
}
