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

/** Transition effect identifiers */
export type TransitionId =
  | 'crossfade'
  | 'dissolve'
  | 'smooth-fade'
  | 'dip-to-black'
  | 'dip-to-white'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'push'
  | 'zoom'
  | 'blur'
  | 'directional-wipe'
  | 'soft-wipe'
  | 'cinematic-wipe'

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

/** Serializable project file */
export interface ProjectData {
  version: 1
  name: string
  createdAt: string
  updatedAt: string
  targetDurationSeconds: number
  images: SlideshowImage[]
  audio: AudioTrack | null
  exportSettings: ExportSettings
}

/** App-wide UI state */
export type AppPanel = 'images' | 'duration' | 'music' | 'preview' | 'export'

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  codec: 'h264',
  resolution: '1080p',
  fps: 30
}

export const DEFAULT_TARGET_DURATION_SECONDS = 240

export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const
export const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a'] as const
