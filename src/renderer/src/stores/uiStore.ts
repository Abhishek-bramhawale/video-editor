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
  setPreviewHeight: (height: number) => void
  setTimelineHeight: (height: number) => void
  setImageThumbMin: (size: number) => void
  adjustImageThumbMin: (delta: number) => void
  resetLayout: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      previewHeight: DEFAULT_PREVIEW_HEIGHT,
      timelineHeight: DEFAULT_TIMELINE_HEIGHT,
      imageThumbMin: 120,
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
      resetLayout: () =>
        set({
          previewHeight: DEFAULT_PREVIEW_HEIGHT,
          timelineHeight: DEFAULT_TIMELINE_HEIGHT,
          imageThumbMin: 120
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
          useUiStore.setState({ previewHeight, timelineHeight, imageThumbMin })
        })
      }
    }
  )
)
