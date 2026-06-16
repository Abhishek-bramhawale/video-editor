export type TransitionFamily =
  | 'fade'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'zoom'
  | 'wipe'
  | 'circle'
  | 'slice'
  | 'wind'
  | 'stylized'
  | 'diagonal'

export interface TransitionDefinition {
  id: string
  name: string
  ffmpegName: string
  durationSeconds: number
  family: TransitionFamily
  /** Key used by preview renderer */
  previewKind: string
}

/** FFmpeg xfade transitions + stylized cinematic presets (export uses ffmpegName) */
export const TRANSITION_CATALOG = [
  // —— Fades & dissolves ——
  { id: 'crossfade', name: 'Crossfade', ffmpegName: 'fade', durationSeconds: 1, family: 'fade', previewKind: 'crossfade' },
  { id: 'dissolve', name: 'Dissolve', ffmpegName: 'dissolve', durationSeconds: 1.2, family: 'fade', previewKind: 'dissolve' },
  { id: 'dreamy-glow', name: 'Dreamy Glow', ffmpegName: 'dissolve', durationSeconds: 1.3, family: 'fade', previewKind: 'dreamy-glow' },
  { id: 'smooth-fade', name: 'Smooth Fade', ffmpegName: 'fadeblack', durationSeconds: 0.9, family: 'fade', previewKind: 'dip-to-black' },
  { id: 'dip-to-black', name: 'Dip to Black', ffmpegName: 'fadeblack', durationSeconds: 1, family: 'fade', previewKind: 'dip-to-black' },
  { id: 'dip-to-white', name: 'Dip to White', ffmpegName: 'fadewhite', durationSeconds: 1, family: 'fade', previewKind: 'dip-to-white' },
  { id: 'fade-grays', name: 'Fade to Gray', ffmpegName: 'fadegrays', durationSeconds: 1, family: 'fade', previewKind: 'fade-grays' },
  { id: 'fast-fade', name: 'Fast Cut Fade', ffmpegName: 'fadefast', durationSeconds: 0.5, family: 'fade', previewKind: 'fast-fade' },
  { id: 'slow-fade', name: 'Slow Cinematic Fade', ffmpegName: 'fadeslow', durationSeconds: 1.5, family: 'fade', previewKind: 'slow-fade' },
  { id: 'cinematic-fade', name: 'Cinematic Fade', ffmpegName: 'fadeslow', durationSeconds: 1.4, family: 'fade', previewKind: 'cinematic-fade' },
  { id: 'flash-cut', name: 'Flash Cut', ffmpegName: 'fadefast', durationSeconds: 0.4, family: 'stylized', previewKind: 'flash-cut' },

  // —— Slides & covers ——
  { id: 'slide-left', name: 'Slide Left', ffmpegName: 'slideleft', durationSeconds: 0.9, family: 'left', previewKind: 'slide-left' },
  { id: 'slide-right', name: 'Slide Right', ffmpegName: 'slideright', durationSeconds: 0.9, family: 'right', previewKind: 'slide-right' },
  { id: 'slide-up', name: 'Slide Up', ffmpegName: 'slideup', durationSeconds: 0.9, family: 'up', previewKind: 'slide-up' },
  { id: 'slide-down', name: 'Slide Down', ffmpegName: 'slidedown', durationSeconds: 0.9, family: 'down', previewKind: 'slide-down' },
  { id: 'push', name: 'Push Left', ffmpegName: 'coverleft', durationSeconds: 1, family: 'left', previewKind: 'push' },
  { id: 'cover-right', name: 'Cover Right', ffmpegName: 'coverright', durationSeconds: 1, family: 'right', previewKind: 'cover-right' },
  { id: 'cover-up', name: 'Cover Up', ffmpegName: 'coverup', durationSeconds: 1, family: 'up', previewKind: 'cover-up' },
  { id: 'cover-down', name: 'Cover Down', ffmpegName: 'coverdown', durationSeconds: 1, family: 'down', previewKind: 'cover-down' },
  { id: 'reveal-left', name: 'Reveal Left', ffmpegName: 'revealleft', durationSeconds: 1, family: 'left', previewKind: 'reveal-left' },
  { id: 'reveal-right', name: 'Reveal Right', ffmpegName: 'revealright', durationSeconds: 1, family: 'right', previewKind: 'reveal-right' },
  { id: 'reveal-up', name: 'Reveal Up', ffmpegName: 'revealup', durationSeconds: 1, family: 'up', previewKind: 'reveal-up' },
  { id: 'reveal-down', name: 'Reveal Down', ffmpegName: 'revealdown', durationSeconds: 1, family: 'down', previewKind: 'reveal-down' },
  { id: 'smooth-slide-left', name: 'Smooth Slide Left', ffmpegName: 'smoothleft', durationSeconds: 1.1, family: 'left', previewKind: 'smooth-slide-left' },
  { id: 'smooth-slide-right', name: 'Smooth Slide Right', ffmpegName: 'smoothright', durationSeconds: 1.1, family: 'right', previewKind: 'smooth-slide-right' },
  { id: 'smooth-slide-up', name: 'Smooth Slide Up', ffmpegName: 'smoothup', durationSeconds: 1.1, family: 'up', previewKind: 'smooth-slide-up' },
  { id: 'smooth-slide-down', name: 'Smooth Slide Down', ffmpegName: 'smoothdown', durationSeconds: 1.1, family: 'down', previewKind: 'smooth-slide-down' },

  // —— Wipes ——
  { id: 'directional-wipe', name: 'Wipe Left', ffmpegName: 'wipeleft', durationSeconds: 0.8, family: 'left', previewKind: 'wipe-left' },
  { id: 'wipe-right', name: 'Wipe Right', ffmpegName: 'wiperight', durationSeconds: 0.8, family: 'right', previewKind: 'wipe-right' },
  { id: 'wipe-up', name: 'Wipe Up', ffmpegName: 'wipeup', durationSeconds: 0.8, family: 'up', previewKind: 'wipe-up' },
  { id: 'wipe-down', name: 'Wipe Down', ffmpegName: 'wipedown', durationSeconds: 0.8, family: 'down', previewKind: 'wipe-down' },
  { id: 'soft-wipe', name: 'Soft Diagonal Wipe', ffmpegName: 'wipetl', durationSeconds: 1, family: 'diagonal', previewKind: 'soft-wipe' },
  { id: 'wipe-corner-tr', name: 'Wipe Top Right', ffmpegName: 'wipetr', durationSeconds: 0.9, family: 'diagonal', previewKind: 'wipe-corner-tr' },
  { id: 'wipe-corner-bl', name: 'Wipe Bottom Left', ffmpegName: 'wipebl', durationSeconds: 0.9, family: 'diagonal', previewKind: 'wipe-corner-bl' },
  { id: 'wipe-corner-br', name: 'Wipe Bottom Right', ffmpegName: 'wipebr', durationSeconds: 0.9, family: 'diagonal', previewKind: 'wipe-corner-br' },
  { id: 'diag-wipe-tl', name: 'Diagonal Slice TL', ffmpegName: 'diagtl', durationSeconds: 0.9, family: 'diagonal', previewKind: 'diag-wipe-tl' },
  { id: 'diag-wipe-tr', name: 'Diagonal Slice TR', ffmpegName: 'diagtr', durationSeconds: 0.9, family: 'diagonal', previewKind: 'diag-wipe-tr' },
  { id: 'diag-wipe-bl', name: 'Diagonal Slice BL', ffmpegName: 'diagbl', durationSeconds: 0.9, family: 'diagonal', previewKind: 'diag-wipe-bl' },
  { id: 'diag-wipe-br', name: 'Diagonal Slice BR', ffmpegName: 'diagbr', durationSeconds: 0.9, family: 'diagonal', previewKind: 'diag-wipe-br' },

  // —— Circles, squares, zoom ——
  { id: 'cinematic-wipe', name: 'Circle Crop', ffmpegName: 'circlecrop', durationSeconds: 1.1, family: 'circle', previewKind: 'cinematic-wipe' },
  { id: 'circle-open', name: 'Circle Open', ffmpegName: 'circleopen', durationSeconds: 1.1, family: 'circle', previewKind: 'circle-open' },
  { id: 'circle-close', name: 'Circle Close', ffmpegName: 'circleclose', durationSeconds: 1.1, family: 'circle', previewKind: 'circle-close' },
  { id: 'iris-in', name: 'Iris In', ffmpegName: 'circleopen', durationSeconds: 1.2, family: 'circle', previewKind: 'iris-in' },
  { id: 'iris-out', name: 'Iris Out', ffmpegName: 'circleclose', durationSeconds: 1.2, family: 'circle', previewKind: 'iris-out' },
  { id: 'radial-burst', name: 'Radial Burst', ffmpegName: 'radial', durationSeconds: 1.1, family: 'zoom', previewKind: 'radial-burst' },
  { id: 'lens-flare', name: 'Lens Flare', ffmpegName: 'radial', durationSeconds: 1.2, family: 'zoom', previewKind: 'lens-flare' },
  { id: 'zoom', name: 'Zoom In', ffmpegName: 'zoomin', durationSeconds: 1, family: 'zoom', previewKind: 'zoom' },
  { id: 'portal-zoom', name: 'Portal Zoom', ffmpegName: 'zoomin', durationSeconds: 1.2, family: 'zoom', previewKind: 'portal-zoom' },
  { id: 'distance-zoom', name: 'Distance Zoom', ffmpegName: 'distance', durationSeconds: 1.1, family: 'zoom', previewKind: 'distance-zoom' },
  { id: 'rect-crop', name: 'Rect Crop', ffmpegName: 'rectcrop', durationSeconds: 1, family: 'circle', previewKind: 'rect-crop' },
  { id: 'vertical-open', name: 'Vertical Blinds Open', ffmpegName: 'vertopen', durationSeconds: 1, family: 'slice', previewKind: 'vertical-open' },
  { id: 'vertical-close', name: 'Vertical Blinds Close', ffmpegName: 'vertclose', durationSeconds: 1, family: 'slice', previewKind: 'vertical-close' },
  { id: 'horizontal-open', name: 'Horizontal Blinds Open', ffmpegName: 'horzopen', durationSeconds: 1, family: 'slice', previewKind: 'horizontal-open' },
  { id: 'horizontal-close', name: 'Horizontal Blinds Close', ffmpegName: 'horzclose', durationSeconds: 1, family: 'slice', previewKind: 'horizontal-close' },
  { id: 'shutter-horizontal', name: 'Shutter Horizontal', ffmpegName: 'horzclose', durationSeconds: 0.9, family: 'slice', previewKind: 'shutter-horizontal' },
  { id: 'shutter-vertical', name: 'Shutter Vertical', ffmpegName: 'vertclose', durationSeconds: 0.9, family: 'slice', previewKind: 'shutter-vertical' },

  // —— Slices & squeeze ——
  { id: 'slice-horizontal-left', name: 'Slice Left', ffmpegName: 'hlslice', durationSeconds: 0.9, family: 'slice', previewKind: 'slice-horizontal-left' },
  { id: 'slice-horizontal-right', name: 'Slice Right', ffmpegName: 'hrslice', durationSeconds: 0.9, family: 'slice', previewKind: 'slice-horizontal-right' },
  { id: 'slice-vertical-up', name: 'Slice Up', ffmpegName: 'vuslice', durationSeconds: 0.9, family: 'slice', previewKind: 'slice-vertical-up' },
  { id: 'slice-vertical-down', name: 'Slice Down', ffmpegName: 'vdslice', durationSeconds: 0.9, family: 'slice', previewKind: 'slice-vertical-down' },
  { id: 'squeeze-horizontal', name: 'Squeeze Horizontal', ffmpegName: 'squeezeh', durationSeconds: 1, family: 'slice', previewKind: 'squeeze-horizontal' },
  { id: 'squeeze-vertical', name: 'Squeeze Vertical', ffmpegName: 'squeezev', durationSeconds: 1, family: 'slice', previewKind: 'squeeze-vertical' },

  // —— Wind & blur ——
  { id: 'blur', name: 'Blur Crossfade', ffmpegName: 'hblur', durationSeconds: 1, family: 'fade', previewKind: 'blur' },
  { id: 'wind-left', name: 'Wind Left', ffmpegName: 'hlwind', durationSeconds: 1, family: 'wind', previewKind: 'wind-left' },
  { id: 'wind-right', name: 'Wind Right', ffmpegName: 'hrwind', durationSeconds: 1, family: 'wind', previewKind: 'wind-right' },
  { id: 'wind-up', name: 'Wind Up', ffmpegName: 'vuwind', durationSeconds: 1, family: 'wind', previewKind: 'wind-up' },
  { id: 'wind-down', name: 'Wind Down', ffmpegName: 'vdwind', durationSeconds: 1, family: 'wind', previewKind: 'wind-down' },
  { id: 'pixelize', name: 'Pixelize', ffmpegName: 'pixelize', durationSeconds: 1, family: 'stylized', previewKind: 'pixelize' },
  { id: 'vhs-glitch', name: 'VHS Glitch', ffmpegName: 'pixelize', durationSeconds: 0.8, family: 'stylized', previewKind: 'vhs-glitch' }
] as const satisfies readonly TransitionDefinition[]

export type TransitionId = (typeof TRANSITION_CATALOG)[number]['id']

const VALID_XFADE = new Set([
  'fade', 'wipeleft', 'wiperight', 'wipeup', 'wipedown',
  'slideleft', 'slideright', 'slideup', 'slidedown',
  'circlecrop', 'rectcrop', 'distance', 'fadeblack', 'fadewhite', 'radial',
  'smoothleft', 'smoothright', 'smoothup', 'smoothdown',
  'circleopen', 'circleclose', 'vertopen', 'vertclose', 'horzopen', 'horzclose',
  'dissolve', 'pixelize', 'diagtl', 'diagtr', 'diagbl', 'diagbr',
  'hlslice', 'hrslice', 'vuslice', 'vdslice', 'hblur', 'fadegrays',
  'wipetl', 'wipetr', 'wipebl', 'wipebr', 'squeezeh', 'squeezev', 'zoomin',
  'fadefast', 'fadeslow', 'hlwind', 'hrwind', 'vuwind', 'vdwind',
  'coverleft', 'coverright', 'coverup', 'coverdown',
  'revealleft', 'revealright', 'revealup', 'revealdown'
])

const catalogMap = new Map<string, TransitionDefinition>(
  TRANSITION_CATALOG.map((t) => [t.id, t])
)

export function getTransitionDefinition(id: string): TransitionDefinition {
  return catalogMap.get(id) ?? TRANSITION_CATALOG[0]
}

export function getTransitionFfmpegName(id: string): string {
  const name = getTransitionDefinition(id).ffmpegName
  return VALID_XFADE.has(name) ? name : 'fade'
}

export function getTransitionFamily(id: string): TransitionFamily {
  return getTransitionDefinition(id).family
}
