import type { TransitionId } from '@shared/types'

export interface TransitionEffect {
  id: TransitionId
  name: string
  ffmpegName: string
  durationSeconds: number
}

export const TRANSITION_EFFECTS: TransitionEffect[] = [
  { id: 'crossfade', name: 'Crossfade', ffmpegName: 'fade', durationSeconds: 1 },
  { id: 'dissolve', name: 'Dissolve', ffmpegName: 'dissolve', durationSeconds: 1.2 },
  { id: 'smooth-fade', name: 'Smooth Fade', ffmpegName: 'fadeblack', durationSeconds: 0.8 },
  { id: 'dip-to-black', name: 'Dip to Black', ffmpegName: 'fadeblack', durationSeconds: 1 },
  { id: 'dip-to-white', name: 'Dip to White', ffmpegName: 'fadewhite', durationSeconds: 1 },
  { id: 'slide-left', name: 'Slide Left', ffmpegName: 'slideleft', durationSeconds: 0.9 },
  { id: 'slide-right', name: 'Slide Right', ffmpegName: 'slideright', durationSeconds: 0.9 },
  { id: 'slide-up', name: 'Slide Up', ffmpegName: 'slideup', durationSeconds: 0.9 },
  { id: 'slide-down', name: 'Slide Down', ffmpegName: 'slidedown', durationSeconds: 0.9 },
  { id: 'push', name: 'Push', ffmpegName: 'coverleft', durationSeconds: 1 },
  { id: 'zoom', name: 'Zoom', ffmpegName: 'zoomin', durationSeconds: 1 },
  { id: 'blur', name: 'Blur', ffmpegName: 'hblur', durationSeconds: 1 },
  { id: 'directional-wipe', name: 'Directional Wipe', ffmpegName: 'wipeleft', durationSeconds: 0.8 },
  { id: 'soft-wipe', name: 'Soft Wipe', ffmpegName: 'wipetl', durationSeconds: 1 },
  { id: 'cinematic-wipe', name: 'Cinematic Wipe', ffmpegName: 'circlecrop', durationSeconds: 1.1 }
]

export const TRANSITION_MAP = new Map(TRANSITION_EFFECTS.map((t) => [t.id, t]))

export function getTransition(id: TransitionId): TransitionEffect {
  return TRANSITION_MAP.get(id) ?? TRANSITION_EFFECTS[0]
}
