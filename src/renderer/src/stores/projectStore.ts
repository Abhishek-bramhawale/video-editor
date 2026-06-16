import { create } from 'zustand'
import type {
  AppPanel,
  AudioTrack,
  DurationMode,
  ExportSettings,
  SlideshowImage,
  TransitionId
} from '@renderer/types'
import {
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_PER_IMAGE_DURATION_SECONDS,
  DEFAULT_TRANSITION_SECONDS
} from '@renderer/types'
import {
  computePerImageFromTotal,
  computeTotalFromPerImage
} from '@renderer/lib/duration'
import { slideshowRandomizer } from '@renderer/lib/randomizer'

interface ProjectState {
  projectName: string
  activePanel: AppPanel
  images: SlideshowImage[]
  targetDurationSeconds: number
  durationMode: DurationMode
  perImageDurationSeconds: number
  transitionSeconds: number
  audio: AudioTrack | null
  exportSettings: ExportSettings
  isDirty: boolean

  setActivePanel: (panel: AppPanel) => void
  setProjectName: (name: string) => void
  setTargetDurationSeconds: (seconds: number) => void
  setPerImageDurationSeconds: (seconds: number) => void
  setTransitionSeconds: (seconds: number) => void
  setImageTransition: (imageIndex: number, transitionId: TransitionId) => void
  addImages: (images: SlideshowImage[]) => void
  removeImage: (id: string) => void
  reorderImages: (fromIndex: number, toIndex: number) => void
  setAudio: (audio: AudioTrack | null) => void
  setExportSettings: (settings: Partial<ExportSettings>) => void
  randomizeEffects: () => void
  loadProject: (data: {
    name: string
    targetDurationSeconds: number
    durationMode?: DurationMode
    perImageDurationSeconds?: number
    transitionSeconds?: number
    images: SlideshowImage[]
    audio: AudioTrack | null
    exportSettings: ExportSettings
  }) => void
  markClean: () => void
  resetProject: () => void
}

function normalizeOrders(images: SlideshowImage[]): SlideshowImage[] {
  return images.map((img, index) => ({ ...img, order: index }))
}

function applyPerImageToImages(
  images: SlideshowImage[],
  perImage: number
): SlideshowImage[] {
  return images.map((img) => ({ ...img, durationSeconds: perImage }))
}

function syncFromTotal(
  images: SlideshowImage[],
  targetSeconds: number,
  transitionSeconds: number
): { images: SlideshowImage[]; perImageDurationSeconds: number } {
  const perImage = computePerImageFromTotal(targetSeconds, images.length, transitionSeconds)
  return {
    images: applyPerImageToImages(images, perImage),
    perImageDurationSeconds: perImage
  }
}

function syncFromPerImage(
  images: SlideshowImage[],
  perImage: number,
  transitionSeconds: number
): { images: SlideshowImage[]; targetDurationSeconds: number } {
  return {
    images: applyPerImageToImages(images, perImage),
    targetDurationSeconds: computeTotalFromPerImage(perImage, images.length, transitionSeconds)
  }
}

const initialState = {
  projectName: 'Untitled Project',
  activePanel: 'images' as AppPanel,
  images: [] as SlideshowImage[],
  targetDurationSeconds: DEFAULT_PER_IMAGE_DURATION_SECONDS,
  durationMode: 'per-image' as DurationMode,
  perImageDurationSeconds: DEFAULT_PER_IMAGE_DURATION_SECONDS,
  transitionSeconds: DEFAULT_TRANSITION_SECONDS,
  audio: null as AudioTrack | null,
  exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
  isDirty: false
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialState,

  setActivePanel: (panel) => set({ activePanel: panel }),

  setProjectName: (name) => set({ projectName: name, isDirty: true }),

  setTargetDurationSeconds: (seconds) => {
    const target = Math.max(1, seconds)
    set((state) => {
      const synced = syncFromTotal(state.images, target, state.transitionSeconds)
      return {
        durationMode: 'total',
        targetDurationSeconds: target,
        perImageDurationSeconds: synced.perImageDurationSeconds,
        images: synced.images,
        isDirty: true
      }
    })
  },

  setPerImageDurationSeconds: (seconds) => {
    const perImage = Math.max(0.1, seconds)
    set((state) => {
      const synced = syncFromPerImage(state.images, perImage, state.transitionSeconds)
      return {
        durationMode: 'per-image',
        perImageDurationSeconds: perImage,
        targetDurationSeconds: synced.targetDurationSeconds,
        images: synced.images,
        isDirty: true
      }
    })
  },

  setTransitionSeconds: (seconds) => {
    const transition = Math.max(0.1, Math.min(3, seconds))
    set((state) => {
      if (state.durationMode === 'per-image') {
        const synced = syncFromPerImage(state.images, state.perImageDurationSeconds, transition)
        return { transitionSeconds: transition, ...synced, isDirty: true }
      }
      const synced = syncFromTotal(state.images, state.targetDurationSeconds, transition)
      return {
        transitionSeconds: transition,
        images: synced.images,
        perImageDurationSeconds: synced.perImageDurationSeconds,
        isDirty: true
      }
    })
  },

  setImageTransition: (imageIndex, transitionId) => {
    set((state) => ({
      images: state.images.map((img, i) =>
        i === imageIndex ? { ...img, transitionId } : img
      ),
      isDirty: true
    }))
  },

  addImages: (newImages) => {
    set((state) => {
      const combined = normalizeOrders([...state.images, ...newImages])
      if (state.durationMode === 'per-image') {
        const synced = syncFromPerImage(combined, state.perImageDurationSeconds, state.transitionSeconds)
        return { ...synced, images: synced.images, isDirty: true }
      }
      const synced = syncFromTotal(combined, state.targetDurationSeconds, state.transitionSeconds)
      return {
        images: synced.images,
        perImageDurationSeconds: synced.perImageDurationSeconds,
        isDirty: true
      }
    })
    get().randomizeEffects()
  },

  removeImage: (id) => {
    set((state) => {
      const filtered = normalizeOrders(state.images.filter((img) => img.id !== id))
      if (state.durationMode === 'per-image') {
        const synced = syncFromPerImage(filtered, state.perImageDurationSeconds, state.transitionSeconds)
        return { ...synced, isDirty: true }
      }
      const synced = syncFromTotal(filtered, state.targetDurationSeconds, state.transitionSeconds)
      return {
        images: synced.images,
        perImageDurationSeconds: synced.perImageDurationSeconds,
        isDirty: true
      }
    })
    get().randomizeEffects()
  },

  reorderImages: (fromIndex, toIndex) => {
    set((state) => {
      const items = [...state.images]
      const [moved] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, moved)
      return { images: normalizeOrders(items), isDirty: true }
    })
  },

  setAudio: (audio) => set({ audio, isDirty: true }),

  setExportSettings: (settings) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...settings },
      isDirty: true
    })),

  randomizeEffects: () => {
    set((state) => {
      if (state.images.length === 0) return state
      slideshowRandomizer.reset()
      const { effects, transitions } = slideshowRandomizer.assignToImages(state.images.length)
      const images = state.images.map((img, i) => ({
        ...img,
        effectId: effects[i],
        transitionId: i < transitions.length ? transitions[i] : null
      }))
      return { images, isDirty: true }
    })
  },

  loadProject: (data) => {
    slideshowRandomizer.reset()
    const images = normalizeOrders(data.images)
    const durationMode = data.durationMode ?? 'total'
    const transitionSeconds = data.transitionSeconds ?? DEFAULT_TRANSITION_SECONDS
    const perImage =
      data.perImageDurationSeconds ??
      (images[0]?.durationSeconds ||
        computePerImageFromTotal(data.targetDurationSeconds, images.length, transitionSeconds))

    set({
      projectName: data.name,
      durationMode,
      perImageDurationSeconds: perImage,
      transitionSeconds,
      targetDurationSeconds: data.targetDurationSeconds,
      images:
        durationMode === 'per-image'
          ? applyPerImageToImages(images, perImage)
          : syncFromTotal(images, data.targetDurationSeconds, transitionSeconds).images,
      audio: data.audio,
      exportSettings: data.exportSettings,
      isDirty: false
    })
  },

  markClean: () => set({ isDirty: false }),

  resetProject: () => {
    slideshowRandomizer.reset()
    set({ ...initialState, exportSettings: { ...DEFAULT_EXPORT_SETTINGS } })
  }
}))

export function usePerImageDuration(): number {
  const images = useProjectStore((s) => s.images)
  const perImageDurationSeconds = useProjectStore((s) => s.perImageDurationSeconds)
  if (images.length === 0) return perImageDurationSeconds
  return images[0].durationSeconds
}

export function buildProjectData(): import('@renderer/types').ProjectData {
  const state = useProjectStore.getState()
  const now = new Date().toISOString()
  return {
    version: 1,
    name: state.projectName,
    createdAt: now,
    updatedAt: now,
    targetDurationSeconds: state.targetDurationSeconds,
    durationMode: state.durationMode,
    perImageDurationSeconds: state.perImageDurationSeconds,
    transitionSeconds: state.transitionSeconds,
    images: state.images,
    audio: state.audio,
    exportSettings: state.exportSettings
  }
}
