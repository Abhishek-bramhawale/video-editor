import type { KenBurnsEffectId } from '@shared/types'
import { easeInOutCubic, easeInOutSine, interpolate } from '../easing'

export interface CameraTransform {
  scale: number
  translateX: number
  translateY: number
}

export interface KenBurnsEffect {
  id: KenBurnsEffectId
  name: string
  getTransform: (t: number) => CameraTransform
  zoomExpr: string
  xExpr: string
  yExpr: string
}

function makeEffect(
  id: KenBurnsEffectId,
  name: string,
  start: CameraTransform,
  end: CameraTransform,
  zoomRange: [number, number],
  panX: [number, number],
  panY: [number, number]
): KenBurnsEffect {
  return {
    id,
    name,
    getTransform: (t) => ({
      scale: interpolate(start.scale, end.scale, t, easeInOutCubic),
      translateX: interpolate(start.translateX, end.translateX, t, easeInOutSine),
      translateY: interpolate(start.translateY, end.translateY, t, easeInOutSine)
    }),
    zoomExpr: `${zoomRange[0]}+${zoomRange[1] - zoomRange[0]}*(-0.5*cos(PI*on/(d-1))+0.5)`,
    xExpr: `iw/2-(iw/zoom/2)+(${panX[1] - panX[0]})*(-0.5*cos(PI*on/(d-1))+0.5)+${panX[0]}`,
    yExpr: `ih/2-(ih/zoom/2)+(${panY[1] - panY[0]})*(-0.5*cos(PI*on/(d-1))+0.5)+${panY[0]}`
  }
}

export const KEN_BURNS_EFFECTS: KenBurnsEffect[] = [
  makeEffect('slow-zoom-center', 'Slow Zoom Center', { scale: 1, translateX: 0, translateY: 0 }, { scale: 1.15, translateX: 0, translateY: 0 }, [1, 1.15], [0, 0], [0, 0]),
  makeEffect('slow-zoom-in', 'Slow Zoom In', { scale: 1, translateX: 0, translateY: 0 }, { scale: 1.25, translateX: 0, translateY: 0 }, [1, 1.25], [0, 0], [0, 0]),
  makeEffect('slow-zoom-out', 'Slow Zoom Out', { scale: 1.25, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, [1.25, 1], [0, 0], [0, 0]),
  makeEffect('zoom-to-face', 'Zoom to Face', { scale: 1, translateX: 0, translateY: 0 }, { scale: 1.35, translateX: -8, translateY: -12 }, [1, 1.35], [-40, -40], [-60, -60]),
  makeEffect('zoom-left', 'Zoom Left', { scale: 1.05, translateX: 5, translateY: 0 }, { scale: 1.2, translateX: -8, translateY: 0 }, [1.05, 1.2], [30, -50], [0, 0]),
  makeEffect('zoom-right', 'Zoom Right', { scale: 1.05, translateX: -5, translateY: 0 }, { scale: 1.2, translateX: 8, translateY: 0 }, [1.05, 1.2], [-30, 50], [0, 0]),
  makeEffect('zoom-top', 'Zoom Top', { scale: 1.05, translateX: 0, translateY: 5 }, { scale: 1.18, translateX: 0, translateY: -10 }, [1.05, 1.18], [0, 0], [40, -50]),
  makeEffect('zoom-bottom', 'Zoom Bottom', { scale: 1.05, translateX: 0, translateY: -5 }, { scale: 1.18, translateX: 0, translateY: 10 }, [1.05, 1.18], [0, 0], [-40, 50]),
  makeEffect('pan-left', 'Pan Left', { scale: 1.12, translateX: 10, translateY: 0 }, { scale: 1.12, translateX: -10, translateY: 0 }, [1.12, 1.12], [80, -80], [0, 0]),
  makeEffect('pan-right', 'Pan Right', { scale: 1.12, translateX: -10, translateY: 0 }, { scale: 1.12, translateX: 10, translateY: 0 }, [1.12, 1.12], [-80, 80], [0, 0]),
  makeEffect('pan-up', 'Pan Up', { scale: 1.12, translateX: 0, translateY: 8 }, { scale: 1.12, translateX: 0, translateY: -8 }, [1.12, 1.12], [0, 0], [60, -60]),
  makeEffect('pan-down', 'Pan Down', { scale: 1.12, translateX: 0, translateY: -8 }, { scale: 1.12, translateX: 0, translateY: 8 }, [1.12, 1.12], [0, 0], [-60, 60]),
  makeEffect('pan-diagonal', 'Pan Diagonal', { scale: 1.1, translateX: -8, translateY: 6 }, { scale: 1.15, translateX: 8, translateY: -6 }, [1.1, 1.15], [-60, 60], [45, -45]),
  makeEffect('zoom-while-panning', 'Zoom While Panning', { scale: 1, translateX: -6, translateY: 0 }, { scale: 1.22, translateX: 6, translateY: 0 }, [1, 1.22], [-50, 50], [0, 0]),
  makeEffect('dolly', 'Dolly', { scale: 1.08, translateX: 0, translateY: 0 }, { scale: 1.28, translateX: 0, translateY: 0 }, [1.08, 1.28], [0, 0], [0, 0]),
  makeEffect('push-in', 'Push In', { scale: 1, translateX: 0, translateY: 0 }, { scale: 1.3, translateX: 0, translateY: 0 }, [1, 1.3], [0, 0], [0, 0]),
  makeEffect('pull-out', 'Pull Out', { scale: 1.3, translateX: 0, translateY: 0 }, { scale: 1, translateX: 0, translateY: 0 }, [1.3, 1], [0, 0], [0, 0]),
  makeEffect('subtle-float', 'Subtle Float', { scale: 1.06, translateX: -2, translateY: 1 }, { scale: 1.1, translateX: 2, translateY: -1 }, [1.06, 1.1], [-15, 15], [8, -8]),
  makeEffect('cinematic-drift', 'Cinematic Drift', { scale: 1.08, translateX: -4, translateY: 2 }, { scale: 1.14, translateX: 4, translateY: -3 }, [1.08, 1.14], [-25, 25], [15, -20]),
  makeEffect('documentary', 'Documentary', { scale: 1, translateX: 0, translateY: 0 }, { scale: 1.12, translateX: 3, translateY: -2 }, [1, 1.12], [-10, 20], [5, -15]),
  makeEffect('parallax', 'Parallax', { scale: 1.1, translateX: -6, translateY: 3 }, { scale: 1.18, translateX: 6, translateY: -3 }, [1.1, 1.18], [-35, 35], [20, -20])
]

export const EFFECT_MAP = new Map(KEN_BURNS_EFFECTS.map((e) => [e.id, e]))

export function getEffect(id: KenBurnsEffectId): KenBurnsEffect {
  return EFFECT_MAP.get(id) ?? KEN_BURNS_EFFECTS[0]
}
