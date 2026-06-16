import { useCallback, useEffect, useRef, useState } from 'react'
import { getEffect } from '@renderer/lib/effects'
import { getTransition } from '@renderer/lib/transitions'
import { computeTotalFromDurations } from '@renderer/lib/duration'
import { useProjectStore } from '@renderer/stores/projectStore'
import { DEFAULT_TRANSITION_SECONDS } from '@renderer/types'

export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  totalDuration: number
  currentImageIndex: number
  localProgress: number
  inTransition: boolean
  transitionT: number
}

function findSegmentAtTime(
  time: number,
  durations: number[]
): { index: number; localT: number; inTransition: boolean; transitionT: number } {
  if (durations.length === 0) {
    return { index: 0, localT: 0, inTransition: false, transitionT: 0 }
  }

  let elapsed = 0
  for (let i = 0; i < durations.length; i++) {
    const perImage = durations[i]
    const segStart = elapsed
    const segEnd = segStart + perImage
    if (time < segEnd || i === durations.length - 1) {
      const localT = Math.max(0, Math.min(1, (time - segStart) / perImage))
      const transitionStart = segEnd - DEFAULT_TRANSITION_SECONDS
      const inTransition =
        i < durations.length - 1 && time >= transitionStart && time < segEnd
      const transitionT = inTransition
        ? (time - transitionStart) / DEFAULT_TRANSITION_SECONDS
        : 0
      return { index: i, localT, inTransition, transitionT }
    }
    elapsed = segEnd - DEFAULT_TRANSITION_SECONDS
  }

  return { index: durations.length - 1, localT: 1, inTransition: false, transitionT: 0 }
}

export function usePreviewPlayback(): {
  state: PlaybackState
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (time: number) => void
  getTransform: () => { scale: number; translateX: number; translateY: number }
} {
  const images = useProjectStore((s) => s.images)
  const targetDuration = useProjectStore((s) => s.targetDurationSeconds)
  const fps = useProjectStore((s) => s.exportSettings.fps)
  const durations = images.map((img) => img.durationSeconds)
  const totalDuration =
    durations.length > 0 ? computeTotalFromDurations(durations) : targetDuration

  const quantStep = fps > 0 ? 1 / fps : 0
  const quantize = (time: number): number => {
    if (quantStep <= 0) return time
    return Math.round(time / quantStep) * quantStep
  }

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const rafRef = useRef<number>(0)
  const lastTickRef = useRef<number>(0)

  const pause = useCallback(() => setIsPlaying(false), [])
  const play = useCallback(() => {
    if (images.length === 0) return
    setIsPlaying(true)
  }, [images.length])

  const toggle = useCallback(() => {
    setIsPlaying((p) => !p)
  }, [])

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(totalDuration, time))
      setCurrentTime(quantize(clamped))
    },
    [totalDuration, quantStep]
  )

  useEffect(() => {
    setCurrentTime((time) => quantize(Math.min(time, totalDuration)))
  }, [totalDuration, quantStep])

  useEffect(() => {
    if (!isPlaying) return

    lastTickRef.current = performance.now()

    const tick = (now: number): void => {
      const delta = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      setCurrentTime((t) => {
        const next = t + delta
        if (next >= totalDuration) {
          setIsPlaying(false)
          return totalDuration
        }
        return quantize(next)
      })
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, totalDuration])

  const segment = findSegmentAtTime(currentTime, durations)
  const currentImage = images[segment.index]

  const getTransform = useCallback(() => {
    if (!currentImage?.effectId) {
      return { scale: 1, translateX: 0, translateY: 0 }
    }
    const effect = getEffect(currentImage.effectId)
    const t = effect.getTransform(segment.localT)
    return { scale: t.scale, translateX: t.translateX, translateY: t.translateY }
  }, [currentImage, segment.localT])

  return {
    state: {
      isPlaying,
      currentTime,
      totalDuration,
      currentImageIndex: segment.index,
      localProgress: segment.localT,
      inTransition: segment.inTransition,
      transitionT: segment.transitionT
    },
    play,
    pause,
    toggle,
    seek,
    getTransform
  }
}
