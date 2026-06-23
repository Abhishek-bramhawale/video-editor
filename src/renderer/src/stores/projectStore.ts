import { create } from 'zustand'
import type {
  AppPanel,
  AudioTrack,
  EditorMode,
  ExportSettings,
  LoadedImage,
  ProjectData,
  TimelineClip,
  TransitionId
} from '@renderer/types'
import { DEFAULT_EXPORT_SETTINGS, DEFAULT_PER_IMAGE_DURATION_SECONDS, DEFAULT_TRANSITION_SECONDS } from '@renderer/types'
import { getBaseName, sortByBaseName } from '@shared/lib/filenames'
import {
  computeTotalFromDurations,
  fitDurationsToTargetTotal
} from '@shared/lib/duration'
import { slideshowRandomizer } from '@renderer/lib/randomizer'

interface ProjectState {
  projectName: string
  activePanel: AppPanel
  editorMode: EditorMode
  defaultImageClipSeconds: number
  targetTotalDurationSeconds: number | null
  clips: TimelineClip[]
  loadedImages: LoadedImage[]
  transitionSeconds: number
  audio: AudioTrack | null
  exportSettings: ExportSettings
  isDirty: boolean

  setActivePanel: (panel: AppPanel) => void
  setEditorMode: (mode: EditorMode) => void
  setProjectName: (name: string) => void
  setDefaultImageClipSeconds: (seconds: number) => void
  setTargetTotalDuration: (seconds: number) => void
  setTransitionSeconds: (seconds: number) => void
  setClipTransition: (clipIndex: number, transitionId: TransitionId) => void
  setClipDuration: (clipId: string, seconds: number) => void
  addVideos: (clips: TimelineClip[]) => void
  addImagesToTimeline: (images: LoadedImage[]) => void
  loadImages: (images: LoadedImage[]) => void
  replaceClipWithImage: (clipId: string) => { ok: true } | { ok: false; error: string }
  removeClip: (id: string) => void
  reorderClips: (fromIndex: number, toIndex: number) => void
  setAudio: (audio: AudioTrack | null) => void
  setAudioStartOffset: (seconds: number) => void
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

function assignImageEffectsAndTransitions(clips: TimelineClip[]): TimelineClip[] {
  return clips.map((clip, i) => ({
    ...clip,
    effectId: slideshowRandomizer.pickEffect(),
    transitionId: i < clips.length - 1 ? slideshowRandomizer.pickTransition() : null
  }))
}

function bridgeTransitionToNewClips(existing: TimelineClip[]): TimelineClip[] {
  if (existing.length === 0) return existing
  const lastIdx = existing.length - 1
  if (existing[lastIdx].transitionId) return existing
  return existing.map((c, i) =>
    i === lastIdx ? { ...c, transitionId: slideshowRandomizer.pickTransition() } : c
  )
}

function finalizeClipList(clips: TimelineClip[]): TimelineClip[] {
  return clips.map((clip, index, arr) =>
    index === arr.length - 1 ? { ...clip, transitionId: null } : clip
  )
}

function applyImagesDurationFit(
  clips: TimelineClip[],
  transitionSeconds: number,
  targetTotal: number | null
): {
  clips: TimelineClip[]
  transitionSeconds: number
  defaultImageClipSeconds?: number
} {
  const finalized = finalizeClipList(normalizeOrders(clips))
  if (targetTotal == null || finalized.length === 0) {
    return { clips: finalized, transitionSeconds }
  }

  const { clipDurations, transitionSeconds: newTransition } = fitDurationsToTargetTotal(
    finalized.map((c) => c.durationSeconds),
    transitionSeconds,
    targetTotal
  )
  const fitted = finalized.map((clip, i) => ({
    ...clip,
    durationSeconds: clipDurations[i] ?? clip.durationSeconds
  }))

  return {
    clips: fitted,
    transitionSeconds: newTransition,
    defaultImageClipSeconds: clipDurations[0]
  }
}

function normalizeAudioTrack(audio: AudioTrack): AudioTrack {
  return {
    ...audio,
    startOffsetSeconds: audio.startOffsetSeconds ?? 0
  }
}

function maxAudioStartOffset(audio: AudioTrack, timelineTotal: number): number {
  return Math.max(0, audio.durationSeconds - timelineTotal)
}

const initialState = {
  projectName: 'Untitled Project',
  activePanel: 'images' as AppPanel,
  editorMode: 'images' as EditorMode,
  defaultImageClipSeconds: DEFAULT_PER_IMAGE_DURATION_SECONDS,
  targetTotalDurationSeconds: null as number | null,
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

  setEditorMode: (mode) => {
    const state = get()
    if (mode === state.editorMode) return
    if (state.clips.length > 0 || state.loadedImages.length > 0) {
      const ok = window.confirm(
        'Switching mode clears the timeline and image buffer. Continue?'
      )
      if (!ok) return
    }
    slideshowRandomizer.reset()
    set({
      editorMode: mode,
      clips: [],
      loadedImages: [],
      targetTotalDurationSeconds: null,
      isDirty: true
    })
  },

  setProjectName: (name) => set({ projectName: name, isDirty: true }),

  setDefaultImageClipSeconds: (seconds) => {
    const value = Math.max(0.1, seconds)
    set({ defaultImageClipSeconds: value, isDirty: true })
  },

  setTargetTotalDuration: (seconds) => {
    const target = Math.max(0.1, seconds)
    set((state) => {
      if (state.clips.length === 0) {
        return { targetTotalDurationSeconds: target, isDirty: true }
      }
      const fit = applyImagesDurationFit(state.clips, state.transitionSeconds, target)
      return {
        targetTotalDurationSeconds: target,
        clips: fit.clips,
        transitionSeconds: fit.transitionSeconds,
        ...(fit.defaultImageClipSeconds != null
          ? { defaultImageClipSeconds: fit.defaultImageClipSeconds }
          : {}),
        isDirty: true
      }
    })
  },

  setTransitionSeconds: (seconds) => {
    const transition = Math.max(0.1, Math.min(3, seconds))
    set((state) => {
      if (
        state.editorMode !== 'images' ||
        state.targetTotalDurationSeconds == null ||
        state.clips.length === 0
      ) {
        return { transitionSeconds: transition, isDirty: true }
      }
      const fit = applyImagesDurationFit(
        state.clips,
        transition,
        state.targetTotalDurationSeconds
      )
      return {
        transitionSeconds: fit.transitionSeconds,
        clips: fit.clips,
        ...(fit.defaultImageClipSeconds != null
          ? { defaultImageClipSeconds: fit.defaultImageClipSeconds }
          : {}),
        isDirty: true
      }
    })
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
    if (get().editorMode !== 'video') return
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

  addImagesToTimeline: (newImages) => {
    if (get().editorMode !== 'images') return
    set((state) => {
      const sorted = sortByBaseName(newImages)
      const startOrder = state.clips.length
      const draft = sorted.map((img, i) =>
        loadedImageToTimelineClip(
          img,
          crypto.randomUUID(),
          startOrder + i,
          state.defaultImageClipSeconds
        )
      )
      const withFx = assignImageEffectsAndTransitions(draft)
      const existing = bridgeTransitionToNewClips(state.clips)
      let clips = normalizeOrders([...existing, ...withFx])

      if (state.targetTotalDurationSeconds != null) {
        const fit = applyImagesDurationFit(
          clips,
          state.transitionSeconds,
          state.targetTotalDurationSeconds
        )
        return {
          clips: fit.clips,
          transitionSeconds: fit.transitionSeconds,
          ...(fit.defaultImageClipSeconds != null
            ? { defaultImageClipSeconds: fit.defaultImageClipSeconds }
            : {}),
          isDirty: true
        }
      }

      return { clips: finalizeClipList(clips), isDirty: true }
    })
  },

  loadImages: (newImages) => {
    if (get().editorMode !== 'video') return
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
    set((state) => {
      const remaining = normalizeOrders(state.clips.filter((c) => c.id !== id))
      if (remaining.length === 0) {
        return { clips: remaining, isDirty: true }
      }

      if (state.editorMode === 'images') {
        const currentTotal = computeTotalFromDurations(
          state.clips.map((c) => c.durationSeconds),
          state.transitionSeconds
        )
        const target = state.targetTotalDurationSeconds ?? currentTotal
        const fit = applyImagesDurationFit(remaining, state.transitionSeconds, target)
        return {
          clips: fit.clips,
          transitionSeconds: fit.transitionSeconds,
          targetTotalDurationSeconds: target,
          ...(fit.defaultImageClipSeconds != null
            ? { defaultImageClipSeconds: fit.defaultImageClipSeconds }
            : {}),
          isDirty: true
        }
      }

      return { clips: finalizeClipList(remaining), isDirty: true }
    })
  },

  reorderClips: (fromIndex, toIndex) => {
    set((state) => {
      const items = [...state.clips]
      const [moved] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, moved)
      return { clips: normalizeOrders(items), isDirty: true }
    })
  },

  setAudio: (audio) =>
    set((state) => {
      if (!audio) return { audio: null, isDirty: true }
      const timelineTotal =
        state.clips.length > 0
          ? computeTotalFromDurations(
              state.clips.map((c) => c.durationSeconds),
              state.transitionSeconds
            )
          : 0
      const normalized = normalizeAudioTrack(audio)
      const maxOffset = maxAudioStartOffset(normalized, timelineTotal)
      return {
        audio: {
          ...normalized,
          startOffsetSeconds: Math.min(normalized.startOffsetSeconds, maxOffset)
        },
        isDirty: true
      }
    }),

  setAudioStartOffset: (seconds) => {
    set((state) => {
      if (!state.audio) return state
      const timelineTotal =
        state.clips.length > 0
          ? computeTotalFromDurations(
              state.clips.map((c) => c.durationSeconds),
              state.transitionSeconds
            )
          : 0
      const maxOffset = maxAudioStartOffset(state.audio, timelineTotal)
      return {
        audio: {
          ...state.audio,
          startOffsetSeconds: Math.max(0, Math.min(maxOffset, seconds))
        },
        isDirty: true
      }
    })
  },

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
    const hasVideo = data.clips.some((c) => c.mediaType === 'video')
    set({
      projectName: data.name,
      editorMode: data.editorMode ?? (hasVideo ? 'video' : 'images'),
      defaultImageClipSeconds: data.defaultImageClipSeconds ?? DEFAULT_PER_IMAGE_DURATION_SECONDS,
      targetTotalDurationSeconds: data.targetTotalDurationSeconds ?? null,
      transitionSeconds: data.transitionSeconds ?? DEFAULT_TRANSITION_SECONDS,
      clips: normalizeOrders(data.clips),
      loadedImages: data.loadedImages ?? [],
      audio: data.audio ? normalizeAudioTrack(data.audio) : null,
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
    editorMode: state.editorMode,
    defaultImageClipSeconds: state.defaultImageClipSeconds,
    targetTotalDurationSeconds: state.targetTotalDurationSeconds,
    clips: state.clips,
    loadedImages: state.loadedImages,
    audio: state.audio,
    exportSettings: state.exportSettings
  }
}

/** Lean project payload for FFmpeg export (no base64 thumbnails). */
export function buildExportProjectData(): ProjectData {
  const data = buildProjectData()
  return {
    ...data,
    clips: data.clips.map(({ thumbnailUrl: _t, ...clip }) => ({
      ...clip,
      thumbnailUrl: ''
    })),
    loadedImages: data.loadedImages.map(({ thumbnailUrl: _t, ...img }) => ({
      ...img,
      thumbnailUrl: ''
    }))
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

export function loadedImageToTimelineClip(
  img: LoadedImage,
  id: string,
  order: number,
  durationSeconds: number
): TimelineClip {
  return {
    id,
    filePath: img.filePath,
    fileName: img.fileName,
    baseName: img.baseName,
    mediaType: 'image',
    thumbnailUrl: img.thumbnailUrl,
    width: img.width,
    height: img.height,
    order,
    durationSeconds,
    effectId: null,
    transitionId: null,
    format: img.format
  }
}
