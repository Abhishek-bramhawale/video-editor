import { DEFAULT_TRANSITION_SECONDS } from '@renderer/types'

export type DurationMode = 'per-image' | 'total'

export function computeTotalFromPerImage(
  perImage: number,
  imageCount: number,
  transitionSeconds = DEFAULT_TRANSITION_SECONDS
): number {
  if (imageCount <= 0) return 0
  if (imageCount === 1) return perImage
  return imageCount * perImage - (imageCount - 1) * transitionSeconds
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

export function computeTotalFromDurations(
  durations: number[],
  transitionSeconds = DEFAULT_TRANSITION_SECONDS
): number {
  if (durations.length === 0) return 0
  if (durations.length === 1) return durations[0]
  const sum = durations.reduce((total, duration) => total + duration, 0)
  return sum - (durations.length - 1) * transitionSeconds
}
