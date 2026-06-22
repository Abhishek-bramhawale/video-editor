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
