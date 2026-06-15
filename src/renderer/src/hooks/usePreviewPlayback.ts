import { useCallback, useEffect, useRef, useState } from 'react'
import { getEffect } from '@renderer/lib/effects'
import { getTransition } from '@renderer/lib/transitions'
import { usePerImageDuration, useProjectStore } from '@renderer/stores/projectStore'
import { DEFAULT_TRANSITION_SECONDS } from '@renderer/types'

export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  totalDuration: number
  currentImageIndex: number
  localProgress: number
}

function findSegmentAtTime(
  time: number,
  perImage: number,
  imageCount: number
): { index: number; localT: number; inTransition: boolean; transitionT: number } {
  if (imageCount === 0) return { index: 0, localT: 0, inTransition: false, transitionT: 0 }

  let elapsed = 0
  for (let i = 0; i < imageCount; i++) {
    const segStart = elapsed
    const segEnd = segStart + perImage
    if (time < segEnd || i === imageCount - 1) {
      const localT = Math.max(0, Math.min(1, (time - segStart) / perImage))
      const transitionStart = segEnd - DEFAULT_TRANSITION_SECONDS
      const inTransition = i < imageCount - 1 && time >= transitionStart && time < segEnd
      const transitionT = inTransition
        ? (time - transitionStart) / DEFAULT_TRANSITION_SECONDS
        : 0
      return { index: i, localT, inTransition, transitionT }
    }
    elapsed = segEnd - DEFAULT_TRANSITION_SECONDS
  }

  return { index: imageCount - 1, localT: 1, inTransition: false, transitionT: 0 }
}

export function usePreviewPlayback(): {
  state: PlaybackState
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (time: number) => void
  getTransform: () => { scale: number; translateX: number; translateY: number }
  getTransitionOpacity: () => number
} {
  const images = useProjectStore((s) => s.images)
  const targetDuration = useProjectStore((s) => s.targetDurationSeconds)
  const perImage = usePerImageDuration()

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
      setCurrentTime(Math.max(0, Math.min(targetDuration, time)))
    },
    [targetDuration]
  )

  useEffect(() => {
    if (!isPlaying) return

    lastTickRef.current = performance.now()

    const tick = (now: number): void => {
      const delta = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      setCurrentTime((t) => {
        const next = t + delta
        if (next >= targetDuration) {
          setIsPlaying(false)
          return targetDuration
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, targetDuration])

  const segment = findSegmentAtTime(currentTime, perImage, images.length)
  const currentImage = images[segment.index]

  const getTransform = useCallback(() => {
    if (!currentImage?.effectId) {
      return { scale: 1, translateX: 0, translateY: 0 }
    }
    const effect = getEffect(currentImage.effectId)
    const t = effect.getTransform(segment.localT)
    return { scale: t.scale, translateX: t.translateX, translateY: t.translateY }
  }, [currentImage, segment.localT])

  const getTransitionOpacity = useCallback(() => {
    if (!segment.inTransition) return 0
    const transition = currentImage?.transitionId
      ? getTransition(currentImage.transitionId)
      : null
    if (!transition) return segment.transitionT
    if (transition.id === 'dip-to-black' || transition.id === 'dip-to-white') {
      return segment.transitionT < 0.5
        ? segment.transitionT * 2
        : (1 - segment.transitionT) * 2
    }
    return segment.transitionT
  }, [segment.inTransition, segment.transitionT, currentImage])

  return {
    state: {
      isPlaying,
      currentTime,
      totalDuration: targetDuration,
      currentImageIndex: segment.index,
      localProgress: segment.localT
    },
    play,
    pause,
    toggle,
    seek,
    getTransform,
    getTransitionOpacity
  }
}
