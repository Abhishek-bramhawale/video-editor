import { getTransitionDefinition } from '@shared/transitions/catalog'

export interface TransitionStylePair {
  current: React.CSSProperties
  next: React.CSSProperties
  overlay?: React.CSSProperties
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function crossfade(t: number): TransitionStylePair {
  return { current: { opacity: 1 - t }, next: { opacity: t } }
}

function dip(color: string, t: number): TransitionStylePair {
  const overlayOpacity = t < 0.5 ? t * 2 : (1 - t) * 2
  return {
    current: { opacity: 1 },
    next: { opacity: 1 },
    overlay: { opacity: overlayOpacity, backgroundColor: color }
  }
}

function slide(axis: 'x' | 'y', dir: 1 | -1, t: number): TransitionStylePair {
  const out = lerp(0, dir * 100, t)
  const inn = lerp(-dir * 100, 0, t)
  const prop = axis === 'x' ? 'translateX' : 'translateY'
  return {
    current: { opacity: 1, transform: `${prop}(${out}%)` },
    next: { opacity: 1, transform: `${prop}(${inn}%)` }
  }
}

function wipeInset(side: 'left' | 'right' | 'top' | 'bottom', t: number): TransitionStylePair {
  const p = Math.round((1 - t) * 100)
  const clip =
    side === 'left'
      ? `inset(0 ${p}% 0 0)`
      : side === 'right'
        ? `inset(0 0 0 ${p}%)`
        : side === 'top'
          ? `inset(${p}% 0 0 0)`
          : `inset(0 0 ${p}% 0)`
  return { current: { opacity: 1 }, next: { opacity: 1, clipPath: clip } }
}

function circleReveal(t: number, invert = false): TransitionStylePair {
  const r = invert ? lerp(150, 0, t) : lerp(0, 150, t)
  return { current: { opacity: 1 }, next: { opacity: 1, clipPath: `circle(${r}% at 50% 50%)` } }
}

function squareReveal(t: number, invert = false): TransitionStylePair {
  const inset = invert ? lerp(0, 50, t) : lerp(50, 0, t)
  return {
    current: { opacity: 1 },
    next: { opacity: 1, clipPath: `inset(${inset}% ${inset}% ${inset}% ${inset}%)` }
  }
}

function blinds(axis: 'x' | 'y', open: boolean, t: number): TransitionStylePair {
  const stripes = 8
  const p = Math.round((open ? t : 1 - t) * 100)
  if (axis === 'x') {
    const step = 100 / stripes
    const parts: string[] = []
    for (let i = 0; i < stripes; i++) {
      const y0 = i * step
      const y1 = y0 + p * (step / 100)
      parts.push(`0% ${y0}%, 100% ${y0}%, 100% ${y1}%, 0% ${y1}%`)
    }
    return { current: { opacity: 1 }, next: { opacity: 1, clipPath: `polygon(${parts.join(', ')})` } }
  }
  const step = 100 / stripes
  const parts: string[] = []
  for (let i = 0; i < stripes; i++) {
    const x0 = i * step
    const x1 = x0 + p * (step / 100)
    parts.push(`${x0}% 0%, ${x1}% 0%, ${x1}% 100%, ${x0}% 100%`)
  }
  return { current: { opacity: 1 }, next: { opacity: 1, clipPath: `polygon(${parts.join(', ')})` } }
}

function colorSwipe(color: string, axis: 'x' | 'y', dir: 1 | -1, t: number): TransitionStylePair {
  const base = slide(axis, dir, t)
  const overlayOpacity = t < 0.55 ? Math.sin(t * Math.PI) * 0.85 : (1 - t) * 1.5
  return {
    ...base,
    overlay: { opacity: Math.max(0, overlayOpacity), backgroundColor: color }
  }
}

function filmBurn(dark: boolean, t: number): TransitionStylePair {
  const warm = dark ? '#1a0a00' : '#fff5e0'
  const peak = t < 0.45 ? t / 0.45 : (1 - t) / 0.55
  return {
    current: { opacity: 1, filter: `brightness(${lerp(1, dark ? 0.4 : 1.8, peak)})` },
    next: { opacity: lerp(0, 1, Math.max(0, (t - 0.35) / 0.65)) },
    overlay: {
      opacity: peak * 0.9,
      background: dark
        ? `radial-gradient(ellipse at center, ${warm} 0%, #000 70%)`
        : `radial-gradient(ellipse at center, #fff 0%, ${warm} 40%, #ff6b00 100%)`
    }
  }
}

function smoke(t: number): TransitionStylePair {
  const blur = lerp(0, 18, Math.sin(t * Math.PI))
  return {
    current: { opacity: 1 - t * 0.7, filter: `blur(${blur}px)` },
    next: { opacity: t, filter: `blur(${lerp(12, 0, t)}px)` },
    overlay: {
      opacity: Math.sin(t * Math.PI) * 0.5,
      background: 'radial-gradient(circle, rgba(200,200,200,0.6) 0%, transparent 70%)'
    }
  }
}

export function getTransitionPreviewStyles(
  transitionId: string | null | undefined,
  tRaw: number
): TransitionStylePair {
  const t = clamp01(tRaw)
  const kind = getTransitionDefinition(transitionId ?? 'crossfade').previewKind

  switch (kind) {
    case 'crossfade':
    case 'dissolve':
    case 'dreamy-glow':
      return kind === 'dreamy-glow'
        ? {
            current: { opacity: 1 - t, filter: `blur(${lerp(0, 6, t)}px)` },
            next: { opacity: t, filter: `blur(${lerp(6, 0, t)}px)` }
          }
        : crossfade(t)
    case 'dip-to-black':
    case 'smooth-fade':
    case 'fade-grays':
      return dip(kind === 'fade-grays' ? '#888' : '#000', t)
    case 'dip-to-white':
    case 'fast-fade':
      return dip('#fff', t)
    case 'slow-fade':
    case 'cinematic-fade':
      return crossfade(t)
    case 'flash-cut':
      return {
        current: { opacity: 1 },
        next: { opacity: t },
        overlay: { opacity: t < 0.15 ? (0.15 - t) / 0.15 : 0, backgroundColor: '#fff' }
      }
    case 'slide-left':
    case 'push':
    case 'reveal-left':
    case 'smooth-slide-left':
    case 'wind-left':
      return slide('x', -1, t)
    case 'slide-right':
    case 'cover-right':
    case 'reveal-right':
    case 'smooth-slide-right':
    case 'wind-right':
      return slide('x', 1, t)
    case 'slide-up':
    case 'cover-up':
    case 'reveal-up':
    case 'smooth-slide-up':
    case 'wind-up':
      return slide('y', -1, t)
    case 'slide-down':
    case 'cover-down':
    case 'reveal-down':
    case 'smooth-slide-down':
    case 'wind-down':
      return slide('y', 1, t)
    case 'wipe-left':
    case 'color-swipe-red':
      return wipeInset('left', t)
    case 'wipe-right':
    case 'color-swipe-blue':
      return wipeInset('right', t)
    case 'wipe-up':
      return wipeInset('top', t)
    case 'wipe-down':
      return wipeInset('bottom', t)
    case 'soft-wipe':
    case 'diag-wipe-tl': {
      const p = Math.round(t * 100)
      return { current: { opacity: 1 }, next: { opacity: 1, clipPath: `polygon(0 0, ${p}% 0, 0 ${p}%)` } }
    }
    case 'diag-wipe-tr': {
      const p = Math.round(t * 100)
      return { current: { opacity: 1 }, next: { opacity: 1, clipPath: `polygon(${100 - p}% 0, 100% 0, 100% ${p}%)` } }
    }
    case 'diag-wipe-bl': {
      const p = Math.round(t * 100)
      return { current: { opacity: 1 }, next: { opacity: 1, clipPath: `polygon(0 ${100 - p}%, 0 100%, ${p}% 100%)` } }
    }
    case 'diag-wipe-br': {
      const p = Math.round(t * 100)
      return { current: { opacity: 1 }, next: { opacity: 1, clipPath: `polygon(100% ${100 - p}%, 100% 100%, ${100 - p}% 100%)` } }
    }
    case 'wipe-corner-tr':
    case 'wipe-corner-bl':
    case 'wipe-corner-br':
      return circleReveal(t)
    case 'cinematic-wipe':
    case 'radial-burst':
    case 'lens-flare':
      return kind === 'lens-flare'
        ? {
            current: { opacity: 1 - t * 0.5 },
            next: { opacity: t, clipPath: `circle(${lerp(0, 150, t)}% at 50% 50%)` },
            overlay: { opacity: Math.sin(t * Math.PI) * 0.6, background: 'radial-gradient(circle, #fff 0%, transparent 60%)' }
          }
        : circleReveal(t)
    case 'circle-open':
    case 'iris-in':
      return circleReveal(t)
    case 'circle-close':
    case 'iris-out':
      return circleReveal(t, true)
    case 'square-close':
    case 'shutter-horizontal':
    case 'shutter-vertical':
      return squareReveal(t)
    case 'square-open':
      return squareReveal(t, true)
    case 'vertical-open':
      return blinds('x', true, t)
    case 'vertical-close':
      return blinds('x', false, t)
    case 'horizontal-open':
      return blinds('y', true, t)
    case 'horizontal-close':
      return blinds('y', false, t)
    case 'zoom':
    case 'portal-zoom':
    case 'distance-zoom':
      return {
        current: { opacity: 1 - t, transform: `scale(${lerp(1, 1.1, t)})` },
        next: { opacity: t, transform: `scale(${lerp(1.15, 1, t)})` }
      }
    case 'blur':
    case 'smoke-blur':
      return {
        current: { opacity: 1 - t, filter: `blur(${lerp(0, 14, t)}px)` },
        next: { opacity: t, filter: `blur(${lerp(14, 0, t)}px)` }
      }
    case 'slice-horizontal-left':
      return wipeInset('left', t)
    case 'slice-horizontal-right':
      return wipeInset('right', t)
    case 'slice-vertical-up':
      return wipeInset('top', t)
    case 'slice-vertical-down':
      return wipeInset('bottom', t)
    case 'squeeze-horizontal':
      return {
        current: { opacity: 1, transform: `scaleX(${lerp(1, 0, t)})` },
        next: { opacity: t, transform: `scaleX(${lerp(0, 1, t)})` }
      }
    case 'squeeze-vertical':
      return {
        current: { opacity: 1, transform: `scaleY(${lerp(1, 0, t)})` },
        next: { opacity: t, transform: `scaleY(${lerp(0, 1, t)})` }
      }
    case 'pixelize':
    case 'vhs-glitch':
      return {
        current: { opacity: 1 - t, filter: kind === 'vhs-glitch' ? `blur(${lerp(0, 2, t)}px) contrast(1.5)` : 'none' },
        next: { opacity: t, transform: kind === 'vhs-glitch' ? `translateX(${Math.sin(t * 40) * 2}%)` : undefined }
      }
    case 'film-burn':
      return filmBurn(false, t)
    case 'film-burn-dark':
      return filmBurn(true, t)
    case 'smoke-dissolve':
      return smoke(t)
    case 'color-swipe-gold':
      return colorSwipe('#f5a623', 'x', -1, t)
    case 'color-swipe-cyan':
      return colorSwipe('#00d4ff', 'x', 1, t)
    case 'color-swipe-magenta':
      return colorSwipe('#ff00aa', 'y', -1, t)
    case 'color-swipe-lime':
      return colorSwipe('#a8ff00', 'y', 1, t)
    default:
      return crossfade(t)
  }
}
