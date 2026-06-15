import type { KenBurnsEffectId, TransitionId } from '@shared/types'
import { KEN_BURNS_EFFECTS } from '../effects'
import { TRANSITION_EFFECTS } from '../transitions'

const EFFECT_IDS = KEN_BURNS_EFFECTS.map((e) => e.id)
const TRANSITION_IDS = TRANSITION_EFFECTS.map((t) => t.id)

const RECENT_EFFECT_WINDOW = 4
const RECENT_TRANSITION_WINDOW = 5

function pickRandom<T>(items: T[], exclude: T[]): T {
  const pool = items.filter((item) => !exclude.includes(item))
  const source = pool.length > 0 ? pool : items
  return source[Math.floor(Math.random() * source.length)]
}

export class SlideshowRandomizer {
  private recentEffects: KenBurnsEffectId[] = []
  private recentTransitions: TransitionId[] = []

  pickEffect(): KenBurnsEffectId {
    const last = this.recentEffects[this.recentEffects.length - 1]
    const exclude = [...this.recentEffects.slice(-RECENT_EFFECT_WINDOW)]
    if (last) exclude.push(last)

    const picked = pickRandom(EFFECT_IDS, exclude)
    this.recentEffects.push(picked)
    if (this.recentEffects.length > RECENT_EFFECT_WINDOW * 2) {
      this.recentEffects = this.recentEffects.slice(-RECENT_EFFECT_WINDOW * 2)
    }
    return picked
  }

  pickTransition(): TransitionId {
    const last = this.recentTransitions[this.recentTransitions.length - 1]
    const exclude = [...this.recentTransitions.slice(-RECENT_TRANSITION_WINDOW)]
    if (last) exclude.push(last)

    const picked = pickRandom(TRANSITION_IDS, exclude)
    this.recentTransitions.push(picked)
    if (this.recentTransitions.length > RECENT_TRANSITION_WINDOW * 2) {
      this.recentTransitions = this.recentTransitions.slice(-RECENT_TRANSITION_WINDOW * 2)
    }
    return picked
  }

  assignToImages(count: number): { effects: KenBurnsEffectId[]; transitions: TransitionId[] } {
    const effects: KenBurnsEffectId[] = []
    const transitions: TransitionId[] = []

    for (let i = 0; i < count; i++) {
      effects.push(this.pickEffect())
      if (i < count - 1) transitions.push(this.pickTransition())
    }

    return { effects, transitions }
  }

  reset(): void {
    this.recentEffects = []
    this.recentTransitions = []
  }
}

export const slideshowRandomizer = new SlideshowRandomizer()
