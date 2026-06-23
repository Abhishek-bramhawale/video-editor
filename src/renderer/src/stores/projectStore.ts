import { create } from 'zustand'
import type {
  AppPanel,
  AudioTrack,
  EditorMode,
  ExportSettings,
  LoadedImage,
  ProjectData,
  Scene,
  SceneMediaItem,
  ScenesConfig,
  TimelineClip,
  TransitionId
} from '@renderer/types'
import { DEFAULT_EXPORT_SETTINGS, DEFAULT_PER_IMAGE_DURATION_SECONDS, DEFAULT_TRANSITION_SECONDS } from '@renderer/types'
import { getBaseName, sortByBaseName } from '@shared/lib/filenames'
import {
  computeTotalFromDurations,
  fitDurationsToTargetTotal,
  getSceneSpanSeconds
} from '@shared/lib/duration'
import { slideshowRandomizer } from '@renderer/lib/randomizer'

interface ProjectState {
  projectName: string
  activePanel: AppPanel
  editorMode: EditorMode
  defaultImageClipSeconds: number
  targetTotalDurationSeconds: number | null
  scenesConfig: ScenesConfig | null
  sceneReplacementMedia: SceneMediaItem[]
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
  setSceneCount: (count: number) => void
  setSceneName: (sceneId: string, name: string) => void
  setSceneStartTime: (sceneIndex: number, seconds: number) => void
  setScenesEndTime: (seconds: number) => void
  addMediaToScene: (sceneId: string, items: SceneMediaItem[]) => void
  loadSceneReplacementMedia: (items: SceneMediaItem[]) => void
  removeSceneReplacementMedia: (mediaId: string) => void
  removeMediaFromScene: (sceneId: string, mediaId: string) => void
  replaceSceneMedia: (sceneId: string, mediaId: string) => { ok: true } | { ok: false; error: string }
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
  undo: () => void
  setPreviewActiveClipId: (clipId: string | null) => void
  markClean: () => void
  resetProject: () => void
  undoPast: UndoSnapshot[]
  undoFuture: UndoSnapshot[]
  previewActiveClipId: string | null
}

type UndoSnapshot = Pick<
  ProjectState,
  | 'projectName'
  | 'editorMode'
  | 'defaultImageClipSeconds'
  | 'targetTotalDurationSeconds'
  | 'scenesConfig'
  | 'sceneReplacementMedia'
  | 'clips'
  | 'loadedImages'
  | 'transitionSeconds'
  | 'audio'
  | 'exportSettings'
  | 'isDirty'
>

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

function createDefaultScenesConfig(count: number): ScenesConfig {
  const scenes: Scene[] = []
  for (let i = 0; i < count; i++) {
    scenes.push({
      id: crypto.randomUUID(),
      name: `Scene ${i + 1}`,
      order: i,
      startTimeSeconds: i === 0 ? 0 : i * 60,
      media: []
    })
  }
  return {
    scenes,
    endTimeSeconds: Math.max(60, count * 60)
  }
}

function assignSceneClipEffects(clips: TimelineClip[]): TimelineClip[] {
  return clips.map((clip, i) => ({
    ...clip,
    effectId: clip.mediaType === 'image' ? slideshowRandomizer.pickEffect() : null,
    transitionId: i < clips.length - 1 ? slideshowRandomizer.pickTransition() : null
  }))
}

function sceneMediaToTimelineClip(
  item: SceneMediaItem,
  order: number,
  durationSeconds: number,
  sceneId: string
): TimelineClip {
  return {
    id: item.id,
    filePath: item.filePath,
    fileName: item.fileName,
    baseName: item.baseName,
    mediaType: item.mediaType,
    thumbnailUrl: item.thumbnailUrl,
    width: item.width,
    height: item.height,
    order,
    durationSeconds,
    nativeDurationSeconds: item.nativeDurationSeconds,
    effectId: null,
    transitionId: null,
    format: item.format,
    sceneId
  }
}

function buildClipsFromScenesConfig(
  config: ScenesConfig,
  transitionSeconds: number
): TimelineClip[] {
  let clips: TimelineClip[] = []

  for (let si = 0; si < config.scenes.length; si++) {
    const scene = config.scenes[si]
    if (scene.media.length === 0) continue

    const span = getSceneSpanSeconds(si, config.scenes, config.endTimeSeconds)
    const hasNextScene = si < config.scenes.length - 1
    const transitionCount = scene.media.length > 0
      ? (scene.media.length - 1) + (hasNextScene ? 1 : 0)
      : 0
    const perClip =
      scene.media.length <= 0
        ? 0
        : Math.max(
            0.1,
            (span + transitionCount * transitionSeconds) / scene.media.length
          )
    const sceneDraft = scene.media.map((item, mi) =>
      sceneMediaToTimelineClip(item, clips.length + mi, perClip, scene.id)
    )
    const withFx = assignSceneClipEffects(sceneDraft)
    const existing = bridgeTransitionToNewClips(clips)
    clips = normalizeOrders([...existing, ...withFx])
  }

  return finalizeClipList(clips)
}

function applyScenesRebuild(
  scenesConfig: ScenesConfig | null,
  transitionSeconds: number
): { clips: TimelineClip[] } {
  if (!scenesConfig) return { clips: [] }
  slideshowRandomizer.reset()
  return { clips: buildClipsFromScenesConfig(scenesConfig, transitionSeconds) }
}

function takeUndoSnapshot(state: ProjectState): UndoSnapshot {
  return {
    projectName: state.projectName,
    editorMode: state.editorMode,
    defaultImageClipSeconds: state.defaultImageClipSeconds,
    targetTotalDurationSeconds: state.targetTotalDurationSeconds,
    scenesConfig: state.scenesConfig,
    sceneReplacementMedia: state.sceneReplacementMedia,
    clips: state.clips,
    loadedImages: state.loadedImages,
    transitionSeconds: state.transitionSeconds,
    audio: state.audio,
    exportSettings: state.exportSettings,
    isDirty: state.isDirty
  }
}

function applyUndoSnapshot(
  state: ProjectState,
  snapshot: UndoSnapshot,
  undoPast: UndoSnapshot[],
  undoFuture: UndoSnapshot[]
): Partial<ProjectState> {
  return {
    ...snapshot,
    undoPast,
    undoFuture
  }
}

const initialState = {
  projectName: 'Untitled Project',
  activePanel: 'images' as AppPanel,
  editorMode: 'images' as EditorMode,
  defaultImageClipSeconds: DEFAULT_PER_IMAGE_DURATION_SECONDS,
  targetTotalDurationSeconds: null as number | null,
  scenesConfig: null as ScenesConfig | null,
  sceneReplacementMedia: [] as SceneMediaItem[],
  clips: [] as TimelineClip[],
  loadedImages: [] as LoadedImage[],
  transitionSeconds: DEFAULT_TRANSITION_SECONDS,
  audio: null as AudioTrack | null,
  exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
  isDirty: false,
  undoPast: [] as UndoSnapshot[],
  undoFuture: [] as UndoSnapshot[],
  previewActiveClipId: null as string | null
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialState,

  setActivePanel: (panel) => set({ activePanel: panel }),

  undo: () => {
    set((state) => {
      if (state.undoPast.length === 0) return state
      const prev = state.undoPast[state.undoPast.length - 1]
      const current = takeUndoSnapshot(state)
      return applyUndoSnapshot(
        state,
        prev,
        state.undoPast.slice(0, -1),
        [current, ...state.undoFuture].slice(0, 100)
      )
    })
  },

  setPreviewActiveClipId: (clipId) => set({ previewActiveClipId: clipId }),

  setEditorMode: (mode) => {
    const state = get()
    if (mode === state.editorMode) return
    if (
      state.clips.length > 0 ||
      state.loadedImages.length > 0 ||
      state.scenesConfig != null
    ) {
      const ok = window.confirm(
        'Switching mode clears the timeline, scenes, and image buffer. Continue?'
      )
      if (!ok) return
    }
    slideshowRandomizer.reset()
    set((s) => ({
      editorMode: mode,
      clips: [],
      loadedImages: [],
      scenesConfig: null,
      sceneReplacementMedia: [],
      targetTotalDurationSeconds: null,
      isDirty: true,
      undoPast: [...s.undoPast, takeUndoSnapshot(s)].slice(-100),
      undoFuture: []
    }))
  },

  setProjectName: (name) =>
    set((s) => ({
      projectName: name,
      isDirty: true,
      undoPast: [...s.undoPast, takeUndoSnapshot(s)].slice(-100),
      undoFuture: []
    })),

  setDefaultImageClipSeconds: (seconds) => {
    const value = Math.max(0.1, seconds)
    set((s) => ({
      defaultImageClipSeconds: value,
      isDirty: true,
      undoPast: [...s.undoPast, takeUndoSnapshot(s)].slice(-100),
      undoFuture: []
    }))
  },

  setTargetTotalDuration: (seconds) => {
    const target = Math.max(0.1, seconds)
    set((state) => {
      if (state.clips.length === 0) {
        return {
          targetTotalDurationSeconds: target,
          isDirty: true,
          undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
          undoFuture: []
        }
      }
      const fit = applyImagesDurationFit(state.clips, state.transitionSeconds, target)
      return {
        targetTotalDurationSeconds: target,
        clips: fit.clips,
        transitionSeconds: fit.transitionSeconds,
        ...(fit.defaultImageClipSeconds != null
          ? { defaultImageClipSeconds: fit.defaultImageClipSeconds }
          : {}),
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  setTransitionSeconds: (seconds) => {
    const transition = Math.max(0.1, Math.min(3, seconds))
    set((state) => {
      if (state.editorMode === 'scenes' && state.scenesConfig) {
        const { clips } = applyScenesRebuild(state.scenesConfig, transition)
        return {
          transitionSeconds: transition,
          clips,
          isDirty: true,
          undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
          undoFuture: []
        }
      }
      if (
        state.editorMode !== 'images' ||
        state.targetTotalDurationSeconds == null ||
        state.clips.length === 0
      ) {
        return {
          transitionSeconds: transition,
          isDirty: true,
          undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
          undoFuture: []
        }
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
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  setSceneCount: (count) => {
    if (get().editorMode !== 'scenes') return
    const n = Math.max(1, Math.min(20, Math.floor(count)))
    set((state) => {
      const prev = state.scenesConfig
      if (prev && n < prev.scenes.length) {
        const trimmed = prev.scenes.slice(0, n)
        const lostMedia = prev.scenes.slice(n).some((s) => s.media.length > 0)
        if (lostMedia) {
          const ok = window.confirm(
            'Reducing scene count removes media from deleted scenes. Continue?'
          )
          if (!ok) return state
        }
        const endTimeSeconds = Math.max(
          trimmed[trimmed.length - 1]?.startTimeSeconds ?? 0,
          prev.endTimeSeconds
        )
        const scenesConfig: ScenesConfig = { scenes: trimmed, endTimeSeconds }
        const { clips } = applyScenesRebuild(scenesConfig, state.transitionSeconds)
        return {
          scenesConfig,
          clips,
          isDirty: true,
          undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
          undoFuture: []
        }
      }

      if (prev && n > prev.scenes.length) {
        const scenes = [...prev.scenes]
        const lastStart = scenes[scenes.length - 1]?.startTimeSeconds ?? 0
        for (let i = scenes.length; i < n; i++) {
          scenes.push({
            id: crypto.randomUUID(),
            name: `Scene ${i + 1}`,
            order: i,
            startTimeSeconds: lastStart + (i - scenes.length + 1) * 60,
            media: []
          })
        }
        const endTimeSeconds = Math.max(prev.endTimeSeconds, scenes[scenes.length - 1].startTimeSeconds + 60)
        const scenesConfig: ScenesConfig = { scenes, endTimeSeconds }
        const { clips } = applyScenesRebuild(scenesConfig, state.transitionSeconds)
        return {
          scenesConfig,
          clips,
          isDirty: true,
          undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
          undoFuture: []
        }
      }

      if (!prev) {
        const scenesConfig = createDefaultScenesConfig(n)
        return {
          scenesConfig,
          clips: [],
          isDirty: true,
          undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
          undoFuture: []
        }
      }

      return state
    })
  },

  setSceneName: (sceneId, name) => {
    if (get().editorMode !== 'scenes') return
    set((state) => {
      if (!state.scenesConfig) return state
      const scenes = state.scenesConfig.scenes.map((s) =>
        s.id === sceneId ? { ...s, name: name.trim() || s.name } : s
      )
      return {
        scenesConfig: { ...state.scenesConfig, scenes },
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  setSceneStartTime: (sceneIndex, seconds) => {
    if (get().editorMode !== 'scenes' || sceneIndex <= 0) return
    set((state) => {
      if (!state.scenesConfig || sceneIndex >= state.scenesConfig.scenes.length) return state
      const prevStart = state.scenesConfig.scenes[sceneIndex - 1].startTimeSeconds
      const startTimeSeconds = Math.max(prevStart + 1, seconds)
      const scenes = state.scenesConfig.scenes.map((s, i) =>
        i === sceneIndex ? { ...s, startTimeSeconds } : s
      )
      const scenesConfig = { ...state.scenesConfig, scenes }
      const { clips } = applyScenesRebuild(scenesConfig, state.transitionSeconds)
      return {
        scenesConfig,
        clips,
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  setScenesEndTime: (seconds) => {
    if (get().editorMode !== 'scenes') return
    set((state) => {
      if (!state.scenesConfig) return state
      const lastStart =
        state.scenesConfig.scenes[state.scenesConfig.scenes.length - 1]?.startTimeSeconds ?? 0
      const endTimeSeconds = Math.max(lastStart + 1, seconds)
      const scenesConfig = { ...state.scenesConfig, endTimeSeconds }
      const { clips } = applyScenesRebuild(scenesConfig, state.transitionSeconds)
      return {
        scenesConfig,
        clips,
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  addMediaToScene: (sceneId, items) => {
    if (get().editorMode !== 'scenes' || items.length === 0) return
    set((state) => {
      if (!state.scenesConfig) return state
      const scenes = state.scenesConfig.scenes.map((s) =>
        s.id === sceneId ? { ...s, media: [...s.media, ...items] } : s
      )
      const scenesConfig = { ...state.scenesConfig, scenes }
      const { clips } = applyScenesRebuild(scenesConfig, state.transitionSeconds)
      return {
        scenesConfig,
        clips,
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  loadSceneReplacementMedia: (items) => {
    if (get().editorMode !== 'scenes' || items.length === 0) return
    set((state) => {
      const byKey = new Map(
        state.sceneReplacementMedia.map((m) => [`${m.baseName}:${m.mediaType}`, m] as const)
      )
      for (const item of items) {
        byKey.set(`${item.baseName}:${item.mediaType}`, item)
      }
      return {
        sceneReplacementMedia: Array.from(byKey.values()),
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  removeSceneReplacementMedia: (mediaId) => {
    if (get().editorMode !== 'scenes') return
    set((state) => ({
      sceneReplacementMedia: state.sceneReplacementMedia.filter((m) => m.id !== mediaId),
      isDirty: true,
      undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
      undoFuture: []
    }))
  },

  removeMediaFromScene: (sceneId, mediaId) => {
    if (get().editorMode !== 'scenes') return
    set((state) => {
      if (!state.scenesConfig) return state
      const scenes = state.scenesConfig.scenes.map((s) =>
        s.id === sceneId ? { ...s, media: s.media.filter((m) => m.id !== mediaId) } : s
      )
      const scenesConfig = { ...state.scenesConfig, scenes }
      const { clips } = applyScenesRebuild(scenesConfig, state.transitionSeconds)
      return {
        scenesConfig,
        clips,
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  replaceSceneMedia: (_sceneId, mediaId) => {
    const state = get()
    if (state.editorMode !== 'scenes' || !state.scenesConfig) {
      return { ok: false, error: 'Scenes mode is required' }
    }

    let source: SceneMediaItem | null = null
    for (const s of state.scenesConfig.scenes) {
      const found = s.media.find((m) => m.id === mediaId)
      if (found) {
        source = found
        break
      }
    }
    if (!source) return { ok: false, error: 'Media not found' }

    const targetType: SceneMediaItem['mediaType'] =
      source.mediaType === 'image' ? 'video' : 'image'

    let match: SceneMediaItem | null = null
    for (const s of state.scenesConfig.scenes) {
      const found = s.media.find(
        (m) => m.baseName === source?.baseName && m.mediaType === targetType
      )
      if (found) {
        match = found
        break
      }
    }
    if (!match) {
      match =
        state.sceneReplacementMedia.find(
          (m) => m.baseName === source?.baseName && m.mediaType === targetType
        ) ?? null
    }
    if (!match) {
      return { ok: false, error: `No ${targetType} named "${source.baseName}" found in scenes` }
    }

    set((s) => {
      if (!s.scenesConfig) return s
      const scenes = s.scenesConfig.scenes.map((scene) => ({
        ...scene,
        media: scene.media.map((m) =>
          m.id === mediaId
            ? {
                ...m,
                mediaType: match!.mediaType,
                filePath: match!.filePath,
                fileName: match!.fileName,
                format: match!.format,
                width: match!.width,
                height: match!.height,
                thumbnailUrl: match!.thumbnailUrl,
                nativeDurationSeconds: match!.nativeDurationSeconds
              }
            : m
        )
      }))
      const scenesConfig = { ...s.scenesConfig, scenes }
      const { clips } = applyScenesRebuild(scenesConfig, s.transitionSeconds)
      return {
        scenesConfig,
        clips,
        isDirty: true,
        undoPast: [...s.undoPast, takeUndoSnapshot(s)].slice(-100),
        undoFuture: []
      }
    })
    return { ok: true }
  },

  setClipTransition: (clipIndex, transitionId) => {
    set((state) => ({
      clips: state.clips.map((clip, i) =>
        i === clipIndex ? { ...clip, transitionId } : clip
      ),
      isDirty: true,
      undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
      undoFuture: []
    }))
  },

  setClipDuration: (clipId, seconds) => {
    if (get().editorMode === 'scenes') return
    const duration = Math.max(0.1, seconds)
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === clipId ? { ...clip, durationSeconds: duration } : clip
      ),
      isDirty: true,
      undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
      undoFuture: []
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
      return {
        clips: combined,
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
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
          isDirty: true,
          undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
          undoFuture: []
        }
      }

      return {
        clips: finalizeClipList(clips),
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  loadImages: (newImages) => {
    if (get().editorMode !== 'video') return
    set((state) => {
      const byBase = new Map(state.loadedImages.map((img) => [img.baseName, img]))
      for (const img of newImages) {
        byBase.set(img.baseName, img)
      }
      return {
        loadedImages: Array.from(byBase.values()),
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
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
      isDirty: true,
      undoPast: [...s.undoPast, takeUndoSnapshot(s)].slice(-100),
      undoFuture: []
    }))
    return { ok: true }
  },

  removeClip: (id) => {
    set((state) => {
      if (state.editorMode === 'scenes' && state.scenesConfig) {
        const scenes = state.scenesConfig.scenes.map((s) => ({
          ...s,
          media: s.media.filter((m) => m.id !== id)
        }))
        const scenesConfig = { ...state.scenesConfig, scenes }
        const { clips } = applyScenesRebuild(scenesConfig, state.transitionSeconds)
        return {
          scenesConfig,
          clips,
          isDirty: true,
          undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
          undoFuture: []
        }
      }

      const remaining = normalizeOrders(state.clips.filter((c) => c.id !== id))
      if (remaining.length === 0) {
        return {
          clips: remaining,
          isDirty: true,
          undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
          undoFuture: []
        }
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
          isDirty: true,
          undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
          undoFuture: []
        }
      }

      return {
        clips: finalizeClipList(remaining),
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  reorderClips: (fromIndex, toIndex) => {
    if (get().editorMode === 'scenes') return
    set((state) => {
      const items = [...state.clips]
      const [moved] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, moved)
      return {
        clips: normalizeOrders(items),
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  setAudio: (audio) =>
    set((state) => {
      if (!audio) {
        return {
          audio: null,
          isDirty: true,
          undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
          undoFuture: []
        }
      }
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
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
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
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  setExportSettings: (settings) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...settings },
      isDirty: true,
      undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
      undoFuture: []
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
      return {
        clips,
        isDirty: true,
        undoPast: [...state.undoPast, takeUndoSnapshot(state)].slice(-100),
        undoFuture: []
      }
    })
  },

  loadProject: (data) => {
    slideshowRandomizer.reset()
    const hasVideo = data.clips.some((c) => c.mediaType === 'video')
    const editorMode = data.editorMode ?? (hasVideo ? 'video' : 'images')
    const scenesConfig = data.scenesConfig ?? null
    const transitionSeconds = data.transitionSeconds ?? DEFAULT_TRANSITION_SECONDS
    const clips =
      editorMode === 'scenes' && scenesConfig
        ? buildClipsFromScenesConfig(scenesConfig, transitionSeconds)
        : normalizeOrders(data.clips)

    set({
      projectName: data.name,
      editorMode,
      defaultImageClipSeconds: data.defaultImageClipSeconds ?? DEFAULT_PER_IMAGE_DURATION_SECONDS,
      targetTotalDurationSeconds: data.targetTotalDurationSeconds ?? null,
      scenesConfig,
      sceneReplacementMedia: data.sceneReplacementMedia ?? [],
      transitionSeconds,
      clips,
      loadedImages: data.loadedImages ?? [],
      audio: data.audio ? normalizeAudioTrack(data.audio) : null,
      exportSettings: data.exportSettings,
      isDirty: false,
      undoPast: [],
      undoFuture: []
    })
  },

  markClean: () => set({ isDirty: false }),

  resetProject: () => {
    slideshowRandomizer.reset()
    set((s) => ({
      ...initialState,
      exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
      undoPast: [...s.undoPast, takeUndoSnapshot(s)].slice(-100),
      undoFuture: []
    }))
  }
}))

export function useTimelineTotalDuration(): number {
  const clips = useProjectStore((s) => s.clips)
  const transitionSeconds = useProjectStore((s) => s.transitionSeconds)
  const editorMode = useProjectStore((s) => s.editorMode)
  const scenesConfig = useProjectStore((s) => s.scenesConfig)
  if (editorMode === 'scenes' && scenesConfig) return scenesConfig.endTimeSeconds
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
    scenesConfig: state.scenesConfig,
    sceneReplacementMedia: state.sceneReplacementMedia,
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
    })),
    sceneReplacementMedia: (data.sceneReplacementMedia ?? []).map(({ thumbnailUrl: _t, ...item }) => ({
      ...item,
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

export function imageMetadataToSceneMedia(
  meta: import('@renderer/types').ImageMetadata,
  id: string
): SceneMediaItem {
  return {
    id,
    filePath: meta.filePath,
    fileName: meta.fileName,
    baseName: getBaseName(meta.fileName),
    mediaType: 'image',
    thumbnailUrl: meta.thumbnailUrl,
    width: meta.width,
    height: meta.height,
    format: meta.format
  }
}

export function videoMetadataToSceneMedia(
  meta: import('@renderer/types').VideoMetadata,
  id: string
): SceneMediaItem {
  return {
    id,
    filePath: meta.filePath,
    fileName: meta.fileName,
    baseName: getBaseName(meta.fileName),
    mediaType: 'video',
    thumbnailUrl: meta.thumbnailUrl,
    width: meta.width,
    height: meta.height,
    format: meta.format,
    nativeDurationSeconds: meta.durationSeconds
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
