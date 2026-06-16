/** Supported image formats */
export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'webp'

/** Supported audio formats */
export type AudioFormat = 'mp3' | 'wav' | 'm4a'

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

/** A single image in the slideshow */
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
  fadeInSeconds: number
  fadeOutSeconds: number
}

/** Export configuration */
export interface ExportSettings {
  codec: ExportCodec
  resolution: ExportResolution
  fps: number
}

/** How slideshow timing is controlled */
export type DurationMode = 'per-image' | 'total'

/** Serializable project file */
export interface ProjectData {
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
export const DEFAULT_TARGET_DURATION_SECONDS = 240
export const DEFAULT_TRANSITION_SECONDS = 1
export const DEFAULT_AUDIO_FADE_SECONDS = 2

export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const
export const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a'] as const

export const RESOLUTION_MAP: Record<ExportResolution, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 }
}
