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

function buildScaleCrop(width: number, height: number): string {
  return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`
}

export interface ExportClip {
  mediaType: 'video' | 'image'
  durationSeconds: number
  effectId: KenBurnsEffectId | null
  transitionId: TransitionId | null
}

export function buildClipFilter(
  clip: ExportClip,
  width: number,
  height: number,
  fps: number
): string {
  const d = Math.max(1 / fps, clip.durationSeconds).toFixed(3)

  if (clip.mediaType === 'video') {
    return `trim=0:${d},setpts=PTS-STARTPTS,${buildScaleCrop(width, height)},format=yuv420p,fps=${fps}`
  }

  if (clip.effectId) {
    return `${buildZoompanFilter(clip.effectId, width, height, fps, clip.durationSeconds)},format=yuv420p,setpts=PTS-STARTPTS`
  }

  const frames = Math.max(2, Math.round(clip.durationSeconds * fps))
  return `${buildScaleCrop(width, height)},format=yuv420p,loop=loop=${frames}:size=1:start=0,trim=duration=${d},setpts=PTS-STARTPTS,fps=${fps}`
}

export function buildAudioFilter(
  audioInputIndex: number,
  outputDuration: number,
  fadeIn: number,
  fadeOut: number,
  startOffset: number
): { filter: string; label: string } {
  const fadeOutStart = Math.max(0, outputDuration - fadeOut)
  const trimStart = Math.max(0, startOffset)
  const trimEnd = trimStart + outputDuration
  const label = 'aout'
  const filter = `[${audioInputIndex}:a]atrim=start=${trimStart.toFixed(3)}:end=${trimEnd.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}[${label}]`
  return { filter, label }
}

export function buildSlideshowFilterComplex(
  clips: ExportClip[],
  width: number,
  height: number,
  fps: number,
  transitionSeconds: number,
  outputDuration: number,
  audio?: { inputIndex: number; fadeIn: number; fadeOut: number; startOffset: number }
): { filterComplex: string; videoLabel: string; audioLabel?: string } {
  const parts: string[] = []

  for (let i = 0; i < clips.length; i++) {
    const vf = buildClipFilter(clips[i], width, height, fps)
    parts.push(`[${i}:v]${vf}[v${i}]`)
  }

  let videoLabel = 'v0'
  if (clips.length > 1) {
    let prevLabel = 'v0'
    let accumulatedDuration = clips[0].durationSeconds

    for (let i = 1; i < clips.length; i++) {
      const xfadeName = getXfadeName(clips[i - 1].transitionId ?? 'crossfade')
      const offset = Math.max(0, accumulatedDuration - transitionSeconds)
      const outLabel = i === clips.length - 1 ? 'vout' : `t${i}`
      parts.push(
        `[${prevLabel}][v${i}]xfade=transition=${xfadeName}:duration=${transitionSeconds}:offset=${offset.toFixed(3)}[${outLabel}]`
      )
      prevLabel = outLabel
      accumulatedDuration += clips[i].durationSeconds - transitionSeconds
    }
    videoLabel = 'vout'
  }

  let audioLabel: string | undefined
  if (audio) {
    const { filter, label } = buildAudioFilter(
      audio.inputIndex,
      outputDuration,
      audio.fadeIn,
      audio.fadeOut,
      audio.startOffset
    )
    audioLabel = label
    parts.push(filter)
  }

  return { filterComplex: parts.join(';'), videoLabel, audioLabel }
}

export function getResolution(resolution: '720p' | '1080p'): { width: number; height: number } {
  return RESOLUTION_MAP[resolution]
}

export function getXfadeName(transitionId: string): string {
  return getTransitionFfmpegName(transitionId)
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
