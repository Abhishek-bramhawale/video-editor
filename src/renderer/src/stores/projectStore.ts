import { create } from 'zustand'
import type {
  AppPanel,
  AudioTrack,
  ExportSettings,
  SlideshowImage
} from '@renderer/types'
import {
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_TARGET_DURATION_SECONDS,
  DEFAULT_TRANSITION_SECONDS
} from '@renderer/types'
import { slideshowRandomizer } from '@renderer/lib/randomizer'

interface ProjectState {
  projectName: string
  activePanel: AppPanel
  images: SlideshowImage[]
  targetDurationSeconds: number
  audio: AudioTrack | null
  exportSettings: ExportSettings
  isDirty: boolean

  setActivePanel: (panel: AppPanel) => void
  setProjectName: (name: string) => void
  setTargetDurationSeconds: (seconds: number) => void
  addImages: (images: SlideshowImage[]) => void
  removeImage: (id: string) => void
  reorderImages: (fromIndex: number, toIndex: number) => void
  setAudio: (audio: AudioTrack | null) => void
  setExportSettings: (settings: Partial<ExportSettings>) => void
  randomizeEffects: () => void
  loadProject: (data: {
    name: string
    targetDurationSeconds: number
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

function applyDurations(images: SlideshowImage[], targetSeconds: number): SlideshowImage[] {
  if (images.length === 0) return images
  const perImage =
    images.length === 1
      ? targetSeconds
      : (targetSeconds + (images.length - 1) * DEFAULT_TRANSITION_SECONDS) / images.length
  return images.map((img) => ({ ...img, durationSeconds: perImage }))
}

const initialState = {
  projectName: 'Untitled Project',
  activePanel: 'images' as AppPanel,
  images: [] as SlideshowImage[],
  targetDurationSeconds: DEFAULT_TARGET_DURATION_SECONDS,
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
    set((state) => ({
      targetDurationSeconds: target,
      images: applyDurations(state.images, target),
      isDirty: true
    }))
  },

  addImages: (newImages) => {
    set((state) => {
      const combined = normalizeOrders([...state.images, ...newImages])
      return {
        images: applyDurations(combined, state.targetDurationSeconds),
        isDirty: true
      }
    })
    get().randomizeEffects()
  },

  removeImage: (id) => {
    set((state) => {
      const filtered = normalizeOrders(state.images.filter((img) => img.id !== id))
      return {
        images: applyDurations(filtered, state.targetDurationSeconds),
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
    set({
      projectName: data.name,
      targetDurationSeconds: data.targetDurationSeconds,
      images: applyDurations(normalizeOrders(data.images), data.targetDurationSeconds),
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
  const targetDurationSeconds = useProjectStore((s) => s.targetDurationSeconds)
  if (images.length === 0) return 0
  if (images.length === 1) return targetDurationSeconds
  return (
    (targetDurationSeconds + (images.length - 1) * DEFAULT_TRANSITION_SECONDS) /
    images.length
  )
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
    images: state.images,
    audio: state.audio,
    exportSettings: state.exportSettings
  }
}
