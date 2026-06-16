import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  previewHeight: number
  timelineHeight: number
  imageThumbMin: number
  setPreviewHeight: (height: number) => void
  setTimelineHeight: (height: number) => void
  setImageThumbMin: (size: number) => void
  adjustImageThumbMin: (delta: number) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      previewHeight: 360,
      timelineHeight: 200,
      imageThumbMin: 120,
      setPreviewHeight: (height) =>
        set({ previewHeight: Math.max(200, Math.min(720, height)) }),
      setTimelineHeight: (height) =>
        set({ timelineHeight: Math.max(120, Math.min(400, height)) }),
      setImageThumbMin: (size) =>
        set({ imageThumbMin: Math.max(72, Math.min(240, size)) }),
      adjustImageThumbMin: (delta) => {
        const next = get().imageThumbMin + delta
        set({ imageThumbMin: Math.max(72, Math.min(240, next)) })
      }
    }),
    { name: 'cinematic-slideshow-ui' }
  )
)
