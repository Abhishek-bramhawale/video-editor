import { create } from 'zustand'
import type {
  AppPanel,
  AudioTrack,
  ExportSettings,
  LoadedImage,
  ProjectData,
  TimelineClip,
  TransitionId
} from '@renderer/types'
import { DEFAULT_EXPORT_SETTINGS, DEFAULT_TRANSITION_SECONDS } from '@renderer/types'
import { getBaseName, sortByBaseName } from '@shared/lib/filenames'
import { computeTotalFromDurations } from '@renderer/lib/duration'
import { slideshowRandomizer } from '@renderer/lib/randomizer'

interface ProjectState {
  projectName: string
  activePanel: AppPanel
  clips: TimelineClip[]
  loadedImages: LoadedImage[]
  transitionSeconds: number
  audio: AudioTrack | null
  exportSettings: ExportSettings
  isDirty: boolean

  setActivePanel: (panel: AppPanel) => void
  setProjectName: (name: string) => void
  setTransitionSeconds: (seconds: number) => void
  setClipTransition: (clipIndex: number, transitionId: TransitionId) => void
  setClipDuration: (clipId: string, seconds: number) => void
  addVideos: (clips: TimelineClip[]) => void
  loadImages: (images: LoadedImage[]) => void
  replaceClipWithImage: (clipId: string) => { ok: true } | { ok: false; error: string }
  removeClip: (id: string) => void
  reorderClips: (fromIndex: number, toIndex: number) => void
  setAudio: (audio: AudioTrack | null) => void
  setExportSettings: (settings: Partial<ExportSettings>) => void
  randomizeImageEffects: () => void
  loadProject: (data: ProjectData) => void
  markClean: () => void
  resetProject: () => void
}

function normalizeOrders(clips: TimelineClip[]): TimelineClip[] {
  return clips.map((clip, index) => ({ ...clip, order: index }))
}

function assignTransitionsToNewClips(
  existing: TimelineClip[],
  added: TimelineClip[]
): TimelineClip[] {
  if (added.length === 0) return []

  const result: TimelineClip[] = added.map((clip) => ({
    ...clip,
    effectId: null,
    transitionId: null
  }))

  for (let i = 0; i < result.length - 1; i++) {
    result[i] = { ...result[i], transitionId: slideshowRandomizer.pickTransition() }
  }

  return result
}

const initialState = {
  projectName: 'Untitled Project',
  activePanel: 'images' as AppPanel,
  clips: [] as TimelineClip[],
  loadedImages: [] as LoadedImage[],
  transitionSeconds: DEFAULT_TRANSITION_SECONDS,
  audio: null as AudioTrack | null,
  exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
  isDirty: false
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialState,

  setActivePanel: (panel) => set({ activePanel: panel }),

  setProjectName: (name) => set({ projectName: name, isDirty: true }),

  setTransitionSeconds: (seconds) => {
    const transition = Math.max(0.1, Math.min(3, seconds))
    set({ transitionSeconds: transition, isDirty: true })
  },

  setClipTransition: (clipIndex, transitionId) => {
    set((state) => ({
      clips: state.clips.map((clip, i) =>
        i === clipIndex ? { ...clip, transitionId } : clip
      ),
      isDirty: true
    }))
  },

  setClipDuration: (clipId, seconds) => {
    const duration = Math.max(0.1, seconds)
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === clipId ? { ...clip, durationSeconds: duration } : clip
      ),
      isDirty: true
    }))
  },

  addVideos: (newClips) => {
    set((state) => {
      const sorted = sortByBaseName(newClips)
      const withTransitions = assignTransitionsToNewClips(state.clips, sorted)
      let existing = state.clips
      if (existing.length > 0 && withTransitions.length > 0) {
        const lastIdx = existing.length - 1
        const last = existing[lastIdx]
        if (!last.transitionId) {
          existing = existing.map((c, i) =>
            i === lastIdx ? { ...c, transitionId: slideshowRandomizer.pickTransition() } : c
          )
        }
      }
      const combined = normalizeOrders([...existing, ...withTransitions])
      return { clips: combined, isDirty: true }
    })
  },

  loadImages: (newImages) => {
    set((state) => {
      const byBase = new Map(state.loadedImages.map((img) => [img.baseName, img]))
      for (const img of newImages) {
        byBase.set(img.baseName, img)
      }
      return { loadedImages: Array.from(byBase.values()), isDirty: true }
    })
  },

  replaceClipWithImage: (clipId) => {
    const state = get()
    const clipIndex = state.clips.findIndex((c) => c.id === clipId)
    if (clipIndex < 0) return { ok: false, error: 'Clip not found' }
    const clip = state.clips[clipIndex]
    if (clip.mediaType !== 'video') return { ok: false, error: 'Only video clips can be replaced' }

    const match = state.loadedImages.find((img) => img.baseName === clip.baseName)
    if (!match) {
      return {
        ok: false,
        error: `No image named "${clip.baseName}" in loaded images`
      }
    }

    const effectId = slideshowRandomizer.pickEffect()
    const updated: TimelineClip = {
      ...clip,
      mediaType: 'image',
      filePath: match.filePath,
      fileName: match.fileName,
      format: match.format,
      width: match.width,
      height: match.height,
      thumbnailUrl: match.thumbnailUrl,
      effectId,
      durationSeconds: clip.durationSeconds
    }

    set((s) => ({
      clips: s.clips.map((c, i) => (i === clipIndex ? updated : c)),
      isDirty: true
    }))
    return { ok: true }
  },

  removeClip: (id) => {
    set((state) => ({
      clips: normalizeOrders(state.clips.filter((c) => c.id !== id)),
      isDirty: true
    }))
  },

  reorderClips: (fromIndex, toIndex) => {
    set((state) => {
      const items = [...state.clips]
      const [moved] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, moved)
      return { clips: normalizeOrders(items), isDirty: true }
    })
  },

  setAudio: (audio) => set({ audio, isDirty: true }),

  setExportSettings: (settings) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...settings },
      isDirty: true
    })),

  randomizeImageEffects: () => {
    set((state) => {
      const imageIndices = state.clips
        .map((c, i) => (c.mediaType === 'image' ? i : -1))
        .filter((i) => i >= 0)
      if (imageIndices.length === 0) return state

      slideshowRandomizer.reset()
      const clips = [...state.clips]
      for (const i of imageIndices) {
        clips[i] = { ...clips[i], effectId: slideshowRandomizer.pickEffect() }
      }
      return { clips, isDirty: true }
    })
  },

  loadProject: (data) => {
    slideshowRandomizer.reset()
    set({
      projectName: data.name,
      transitionSeconds: data.transitionSeconds ?? DEFAULT_TRANSITION_SECONDS,
      clips: normalizeOrders(data.clips),
      loadedImages: data.loadedImages ?? [],
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

export function useTimelineTotalDuration(): number {
  const clips = useProjectStore((s) => s.clips)
  const transitionSeconds = useProjectStore((s) => s.transitionSeconds)
  if (clips.length === 0) return 0
  return computeTotalFromDurations(
    clips.map((c) => c.durationSeconds),
    transitionSeconds
  )
}

export function hasMatchingLoadedImage(baseName: string): boolean {
  return useProjectStore.getState().loadedImages.some((img) => img.baseName === baseName)
}

export function buildProjectData(): ProjectData {
  const state = useProjectStore.getState()
  const now = new Date().toISOString()
  return {
    version: 2,
    name: state.projectName,
    createdAt: now,
    updatedAt: now,
    transitionSeconds: state.transitionSeconds,
    clips: state.clips,
    loadedImages: state.loadedImages,
    audio: state.audio,
    exportSettings: state.exportSettings
  }
}

/** Build a TimelineClip from video metadata */
export function videoMetadataToClip(
  meta: import('@renderer/types').VideoMetadata,
  id: string,
  order: number
): TimelineClip {
  return {
    id,
    filePath: meta.filePath,
    fileName: meta.fileName,
    baseName: getBaseName(meta.fileName),
    mediaType: 'video',
    thumbnailUrl: meta.thumbnailUrl,
    width: meta.width,
    height: meta.height,
    order,
    durationSeconds: meta.durationSeconds,
    nativeDurationSeconds: meta.durationSeconds,
    effectId: null,
    transitionId: null,
    format: meta.format
  }
}

/** Build a LoadedImage from image metadata */
export function imageMetadataToLoaded(
  meta: import('@renderer/types').ImageMetadata,
  id: string
): LoadedImage {
  return {
    id,
    filePath: meta.filePath,
    fileName: meta.fileName,
    baseName: getBaseName(meta.fileName),
    format: meta.format,
    width: meta.width,
    height: meta.height,
    thumbnailUrl: meta.thumbnailUrl
  }
}
