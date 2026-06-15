import type { KenBurnsEffectId } from '../../shared/types'
import { RESOLUTION_MAP } from '../../shared/types'

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

const XFADE_MAP: Record<string, string> = {
  crossfade: 'fade',
  dissolve: 'dissolve',
  'smooth-fade': 'fadeblack',
  'dip-to-black': 'fadeblack',
  'dip-to-white': 'fadewhite',
  'slide-left': 'slideleft',
  'slide-right': 'slideright',
  'slide-up': 'slideup',
  'slide-down': 'slidedown',
  push: 'pushleft',
  zoom: 'zoomin',
  blur: 'hblur',
  'directional-wipe': 'wipeleft',
  'soft-wipe': 'wipetl',
  'cinematic-wipe': 'circlecrop'
}

export function buildZoompanFilter(
  effectId: KenBurnsEffectId,
  width: number,
  height: number,
  fps: number,
  durationSeconds: number
): string {
  const effect = EFFECT_FFMPEG[effectId] ?? EFFECT_FFMPEG['slow-zoom-center']
  const frames = Math.max(1, Math.round(durationSeconds * fps))
  const [z0, z1] = effect.zoom
  const [x0, x1] = effect.panX
  const [y0, y1] = effect.panY

  const zExpr = `${z0}+${z1 - z0}*(-0.5*cos(PI*on/(d-1))+0.5)`
  const xExpr = `iw/2-(iw/zoom/2)+(${x1 - x0})*(-0.5*cos(PI*on/(d-1))+0.5)+${x0}`
  const yExpr = `ih/2-(ih/zoom/2)+(${y1 - y0})*(-0.5*cos(PI*on/(d-1))+0.5)+${y0}`

  return `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase,crop=${width * 2}:${height * 2},zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${frames}:s=${width}x${height}:fps=${fps}`
}

export function getResolution(resolution: '720p' | '1080p'): { width: number; height: number } {
  return RESOLUTION_MAP[resolution]
}

export function getXfadeName(transitionId: string): string {
  return XFADE_MAP[transitionId] ?? 'fade'
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
      return { vcodec: 'libx265', extra: ['-tag:v', 'hvc1'] }
    case 'mov':
      return { vcodec: 'libx264', extra: ['-movflags', '+faststart'] }
    default:
      return { vcodec: 'libx264', extra: ['-preset', 'medium', '-crf', '18', '-movflags', '+faststart'] }
  }
}
