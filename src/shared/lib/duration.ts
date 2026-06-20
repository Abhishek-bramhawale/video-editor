import { DEFAULT_TRANSITION_SECONDS } from '../types'

export function computeTotalFromDurations(
  durations: number[],
  transitionSeconds = DEFAULT_TRANSITION_SECONDS
): number {
  if (durations.length === 0) return 0
  if (durations.length === 1) return durations[0]
  const sum = durations.reduce((total, duration) => total + duration, 0)
  return sum - (durations.length - 1) * transitionSeconds
}

export function computePerImageFromTotal(
  targetSeconds: number,
  imageCount: number,
  transitionSeconds = DEFAULT_TRANSITION_SECONDS
): number {
  if (imageCount <= 0) return 0
  if (imageCount === 1) return targetSeconds
  return (targetSeconds + (imageCount - 1) * transitionSeconds) / imageCount
}

/** Scale clip hold times and transition overlap to match a target timeline length */
export function fitDurationsToTargetTotal(
  clipDurations: number[],
  transitionSeconds: number,
  targetTotal: number
): { clipDurations: number[]; transitionSeconds: number } {
  const n = clipDurations.length
  if (n === 0) return { clipDurations, transitionSeconds }

  const target = Math.max(0.1, targetTotal)

  if (n === 1) {
    return { clipDurations: [target], transitionSeconds }
  }

  const currentTotal = computeTotalFromDurations(clipDurations, transitionSeconds)
  if (currentTotal <= 0) {
    const perImage = computePerImageFromTotal(target, n, transitionSeconds)
    return {
      clipDurations: clipDurations.map(() => Math.max(0.1, perImage)),
      transitionSeconds
    }
  }

  const scale = target / currentTotal
  const newTransition = Math.max(0.1, Math.min(3, transitionSeconds * scale))
  const newPerImage = computePerImageFromTotal(target, n, newTransition)
  return {
    clipDurations: clipDurations.map(() => Math.max(0.1, newPerImage)),
    transitionSeconds: newTransition
  }
}
