/** Cubic ease-in-out */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Cubic ease-in */
export function easeInCubic(t: number): number {
  return t * t * t
}

/** Cubic ease-out */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Smooth sine ease-in-out */
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

/** Cubic bezier approximation (0.42, 0, 0.58, 1) — CSS ease-in-out */
export function cubicBezierEase(t: number): number {
  const p0 = 0
  const p1 = 0.42
  const p2 = 0.58
  const p3 = 1
  const u = 1 - t
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

/** Interpolate between two values with easing */
export function interpolate(
  start: number,
  end: number,
  t: number,
  easing: (v: number) => number = easeInOutCubic
): number {
  return start + (end - start) * easing(Math.max(0, Math.min(1, t)))
}

/** FFmpeg cosine ease expression fragment for frame `on` of `d` frames */
export function ffmpegCosineEase(factor: string): string {
  return `(1-${factor})*0.5*cos(PI*on/(d-1))+${factor}*0.5+0.5`
}
