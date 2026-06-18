import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  clampPreviewSectionHeight,
  clampTimelineHeight,
  clampImageThumbMin,
  DEFAULT_PREVIEW_HEIGHT,
  DEFAULT_TIMELINE_HEIGHT
} from '@renderer/lib/layout/bounds'

interface UiState {
  previewHeight: number
  timelineHeight: number
  imageThumbMin: number
  timelinePixelsPerSecond: number
  setPreviewHeight: (height: number) => void
  setTimelineHeight: (height: number) => void
  setImageThumbMin: (size: number) => void
  adjustImageThumbMin: (delta: number) => void
  setTimelinePixelsPerSecond: (value: number) => void
  adjustTimelinePixelsPerSecond: (delta: number) => void
  resetLayout: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      previewHeight: DEFAULT_PREVIEW_HEIGHT,
      timelineHeight: DEFAULT_TIMELINE_HEIGHT,
      imageThumbMin: 120,
      timelinePixelsPerSecond: 10,
      setPreviewHeight: (height) => {
        const previewHeight = clampPreviewSectionHeight(height)
        const timelineHeight = clampTimelineHeight(get().timelineHeight, previewHeight)
        set({ previewHeight, timelineHeight })
      },
      setTimelineHeight: (height) => {
        const previewHeight = clampPreviewSectionHeight(get().previewHeight)
        set({
          timelineHeight: clampTimelineHeight(height, previewHeight)
        })
      },
      setImageThumbMin: (size) => set({ imageThumbMin: clampImageThumbMin(size) }),
      adjustImageThumbMin: (delta) => {
        const next = get().imageThumbMin + delta
        set({ imageThumbMin: clampImageThumbMin(next) })
      },
      setTimelinePixelsPerSecond: (value) =>
        set({ timelinePixelsPerSecond: Math.max(4, Math.min(40, value)) }),
      adjustTimelinePixelsPerSecond: (delta) => {
        const next = get().timelinePixelsPerSecond + delta
        set({ timelinePixelsPerSecond: Math.max(4, Math.min(40, next)) })
      },
      resetLayout: () =>
        set({
          previewHeight: DEFAULT_PREVIEW_HEIGHT,
          timelineHeight: DEFAULT_TIMELINE_HEIGHT,
          imageThumbMin: 120,
          timelinePixelsPerSecond: 10
        })
    }),
    {
      name: 'cinematic-slideshow-ui',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (!state) return
        queueMicrotask(() => {
          const previewHeight = clampPreviewSectionHeight(
            state.previewHeight ?? DEFAULT_PREVIEW_HEIGHT
          )
          const timelineHeight = clampTimelineHeight(
            state.timelineHeight ?? DEFAULT_TIMELINE_HEIGHT,
            previewHeight
          )
          const imageThumbMin = clampImageThumbMin(state.imageThumbMin ?? 120)
          const timelinePixelsPerSecond = Math.max(
            4,
            Math.min(40, state.timelinePixelsPerSecond ?? 10)
          )
          useUiStore.setState({ previewHeight, timelineHeight, imageThumbMin, timelinePixelsPerSecond })
        })
      }
    }
  )
)
