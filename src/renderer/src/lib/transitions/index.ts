import type { TransitionId } from '@shared/transitions/catalog'
import {
  getTransitionDefinition,
  TRANSITION_CATALOG
} from '@shared/transitions/catalog'

export type { TransitionId, TransitionFamily } from '@shared/transitions/catalog'
export { TRANSITION_CATALOG, getTransitionDefinition, getTransitionFfmpegName, getTransitionFamily } from '@shared/transitions/catalog'

export interface TransitionEffect {
  id: TransitionId
  name: string
  ffmpegName: string
  durationSeconds: number
  family: string
  previewKind: string
}

export const TRANSITION_EFFECTS: TransitionEffect[] = TRANSITION_CATALOG.map((t) => ({
  id: t.id,
  name: t.name,
  ffmpegName: t.ffmpegName,
  durationSeconds: t.durationSeconds,
  family: t.family,
  previewKind: t.previewKind
}))

export const TRANSITION_MAP = new Map(TRANSITION_EFFECTS.map((t) => [t.id, t]))

export function getTransition(id: TransitionId | string): TransitionEffect {
  return TRANSITION_MAP.get(id as TransitionId) ?? TRANSITION_EFFECTS[0]
}
