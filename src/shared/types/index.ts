/** Supported image formats */
export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'webp'

/** Supported video import formats */
export type VideoFormat = 'mp4' | 'mov' | 'webm' | 'mkv'

/** Supported audio formats */
export type AudioFormat = 'mp3' | 'wav' | 'm4a' | 'mpeg'

/** Video export codec */
export type ExportCodec = 'h264' | 'h265' | 'mov'

/** Video export resolution */
export type ExportResolution = '720p' | '1080p'

/** Ken Burns camera effect identifiers */
export type KenBurnsEffectId =
  | 'slow-zoom-center'
  | 'slow-zoom-in'
  | 'slow-zoom-out'
  | 'zoom-to-face'
  | 'zoom-left'
  | 'zoom-right'
  | 'zoom-top'
  | 'zoom-bottom'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down'
  | 'pan-diagonal'
  | 'zoom-while-panning'
  | 'dolly'
  | 'push-in'
  | 'pull-out'
  | 'subtle-float'
  | 'cinematic-drift'
  | 'documentary'
  | 'parallax'

import type { TransitionId } from '../transitions/catalog'
export type { TransitionId, TransitionFamily } from '../transitions/catalog'

export type ClipMediaType = 'video' | 'image'

/** Editor workflow: images slideshow, video replacement, or timed scenes */
export type EditorMode = 'images' | 'video' | 'scenes'

/** Media item stored inside a scene before timeline flattening */
export interface SceneMediaItem {
  id: string
  filePath: string
  fileName: string
  baseName: string
  mediaType: ClipMediaType
  thumbnailUrl: string
  width: number
  height: number
  format?: ImageFormat | VideoFormat
  nativeDurationSeconds?: number
}

/** A named scene with start time and media list */
export interface Scene {
  id: string
  name: string
  order: number
  startTimeSeconds: number
  media: SceneMediaItem[]
}

/** Scenes-mode project configuration */
export interface ScenesConfig {
  scenes: Scene[]
  endTimeSeconds: number
}

/** A single clip on the timeline (video or image) */
export interface TimelineClip {
  id: string
  filePath: string
  fileName: string
  baseName: string
  mediaType: ClipMediaType
  thumbnailUrl: string
  width: number
  height: number
  order: number
  durationSeconds: number
  nativeDurationSeconds?: number
  effectId: KenBurnsEffectId | null
  transitionId: TransitionId | null
  format?: ImageFormat | VideoFormat
  /** Source scene when built from scenes mode */
  sceneId?: string
}

/** Image loaded into the replacement buffer (not on timeline until replace) */
export interface LoadedImage {
  id: string
  filePath: string
  fileName: string
  baseName: string
  format: ImageFormat
  width: number
  height: number
  thumbnailUrl: string
}

/** @deprecated Use TimelineClip — kept for v1 project migration */
export interface SlideshowImage {
  id: string
  filePath: string
  fileName: string
  format: ImageFormat
  width: number
  height: number
  thumbnailUrl: string
  order: number
  durationSeconds: number
  effectId: KenBurnsEffectId | null
  transitionId: TransitionId | null
}

/** Background music track */
export interface AudioTrack {
  id: string
  filePath: string
  fileName: string
  format: AudioFormat
  durationSeconds: number
  /** Where playback starts in the source file (seconds) */
  startOffsetSeconds: number
  fadeInSeconds: number
  fadeOutSeconds: number
}

/** Export configuration */
export interface ExportSettings {
  codec: ExportCodec
  resolution: ExportResolution
  fps: number
}

/** @deprecated Per-clip durations are authoritative in v2 */
export type DurationMode = 'per-image' | 'total'

/** Serializable project file v1 (legacy) */
export interface ProjectDataV1 {
  version: 1
  name: string
  createdAt: string
  updatedAt: string
  targetDurationSeconds: number
  durationMode?: DurationMode
  perImageDurationSeconds?: number
  transitionSeconds?: number
  images: SlideshowImage[]
  audio: AudioTrack | null
  exportSettings: ExportSettings
}

/** Serializable project file v2 */
export interface ProjectData {
  version: 2
  name: string
  createdAt: string
  updatedAt: string
  transitionSeconds?: number
  editorMode?: EditorMode
  defaultImageClipSeconds?: number
  targetTotalDurationSeconds?: number | null
  scenesConfig?: ScenesConfig | null
  sceneReplacementMedia?: SceneMediaItem[]
  clips: TimelineClip[]
  loadedImages: LoadedImage[]
  audio: AudioTrack | null
  exportSettings: ExportSettings
}

/** App-wide UI state */
export type AppPanel = 'images' | 'duration' | 'music' | 'export'

export interface ImageMetadata {
  filePath: string
  fileName: string
  format: ImageFormat
  width: number
  height: number
  thumbnailUrl: string
}

export interface VideoMetadata {
  filePath: string
  fileName: string
  format: VideoFormat
  width: number
  height: number
  durationSeconds: number
  thumbnailUrl: string
}

export interface AudioMetadata {
  filePath: string
  fileName: string
  format: AudioFormat
  durationSeconds: number
}

export interface ExportRequest {
  project: ProjectData
  outputPath: string
}

export interface ExportResult {
  success: boolean
  outputPath?: string
  error?: string
}

export interface RenderProgress {
  stage: 'segments' | 'transitions' | 'audio' | 'finalize' | 'done'
  current: number
  total: number
  message: string
  percent: number
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  codec: 'h264',
  resolution: '1080p',
  fps: 30
}

export const DEFAULT_PER_IMAGE_DURATION_SECONDS = 5
export const DEFAULT_TRANSITION_SECONDS = 1
export const DEFAULT_AUDIO_FADE_SECONDS = 2

export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const
export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv'] as const
export const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mpeg'] as const

export const RESOLUTION_MAP: Record<ExportResolution, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 }
}
