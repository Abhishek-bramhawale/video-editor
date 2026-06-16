import type { KenBurnsEffectId, TransitionId } from '@shared/types'
import { getTransitionFamily } from '@shared/transitions/catalog'
import { KEN_BURNS_EFFECTS } from '../effects'
import { TRANSITION_EFFECTS } from '../transitions'

const EFFECT_IDS = KEN_BURNS_EFFECTS.map((e) => e.id)
const TRANSITION_IDS = TRANSITION_EFFECTS.map((t) => t.id)

/** Group effects by movement direction so we don't repeat the same pan/zoom direction in a row */
const EFFECT_FAMILY: Record<KenBurnsEffectId, string> = {
  'slow-zoom-center': 'zoom-center',
  'slow-zoom-in': 'zoom-center',
  'slow-zoom-out': 'zoom-center',
  'zoom-to-face': 'zoom-center',
  dolly: 'zoom-center',
  'push-in': 'zoom-center',
  'pull-out': 'zoom-center',
  documentary: 'zoom-center',
  'zoom-left': 'left',
  'pan-left': 'left',
  'zoom-right': 'right',
  'pan-right': 'right',
  'zoom-top': 'up',
  'pan-up': 'up',
  'zoom-bottom': 'down',
  'pan-down': 'down',
  'pan-diagonal': 'diagonal',
  'zoom-while-panning': 'horizontal',
  parallax: 'diagonal',
  'subtle-float': 'drift',
  'cinematic-drift': 'drift'
}

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
    const lastFamily = last ? EFFECT_FAMILY[last] : null
    const prevTwo = this.recentEffects.slice(-2).map((id) => EFFECT_FAMILY[id])
    const repeatedFamily =
      prevTwo.length === 2 && prevTwo[0] === prevTwo[1] ? prevTwo[0] : null

    const exclude = EFFECT_IDS.filter((id) => {
      const family = EFFECT_FAMILY[id]
      if (lastFamily && family === lastFamily) return true
      if (repeatedFamily && family === repeatedFamily) return true
      return false
    })

    const picked = pickRandom(EFFECT_IDS, exclude)
    this.recentEffects.push(picked)
    if (this.recentEffects.length > 8) {
      this.recentEffects = this.recentEffects.slice(-8)
    }
    return picked
  }

  pickTransition(): TransitionId {
    const last = this.recentTransitions[this.recentTransitions.length - 1]
    const lastFamily = last ? getTransitionFamily(last) : null
    const prevTwo = this.recentTransitions.slice(-2).map((id) => getTransitionFamily(id))
    const repeatedFamily =
      prevTwo.length === 2 && prevTwo[0] === prevTwo[1] ? prevTwo[0] : null

    const exclude = TRANSITION_IDS.filter((id) => {
      const family = getTransitionFamily(id)
      if (lastFamily && family === lastFamily) return true
      if (repeatedFamily && family === repeatedFamily) return true
      return false
    })

    const picked = pickRandom(TRANSITION_IDS, exclude)
    this.recentTransitions.push(picked)
    if (this.recentTransitions.length > 8) {
      this.recentTransitions = this.recentTransitions.slice(-8)
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
