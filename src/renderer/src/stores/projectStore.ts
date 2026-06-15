import { create } from 'zustand'
import type {
  AppPanel,
  AudioTrack,
  ExportSettings,
  SlideshowImage
} from '@renderer/types'
import {
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_TARGET_DURATION_SECONDS
} from '@renderer/types'

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
  setImages: (images: SlideshowImage[]) => void
  setAudio: (audio: AudioTrack | null) => void
  setExportSettings: (settings: Partial<ExportSettings>) => void
  markClean: () => void
  resetProject: () => void
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

export const useProjectStore = create<ProjectState>((set) => ({
  ...initialState,

  setActivePanel: (panel) => set({ activePanel: panel }),

  setProjectName: (name) => set({ projectName: name, isDirty: true }),

  setTargetDurationSeconds: (seconds) =>
    set({ targetDurationSeconds: Math.max(1, seconds), isDirty: true }),

  setImages: (images) => set({ images, isDirty: true }),

  setAudio: (audio) => set({ audio, isDirty: true }),

  setExportSettings: (settings) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...settings },
      isDirty: true
    })),

  markClean: () => set({ isDirty: false }),

  resetProject: () => set({ ...initialState })
}))

/** Derived: seconds allocated per image based on target duration */
export function usePerImageDuration(): number {
  const images = useProjectStore((s) => s.images)
  const targetDurationSeconds = useProjectStore((s) => s.targetDurationSeconds)
  if (images.length === 0) return 0
  return targetDurationSeconds / images.length
}
