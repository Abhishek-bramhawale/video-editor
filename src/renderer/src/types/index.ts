export type {
  ImageFormat,
  VideoFormat,
  AudioFormat,
  ExportCodec,
  ExportResolution,
  KenBurnsEffectId,
  ClipMediaType,
  TimelineClip,
  LoadedImage,
  SlideshowImage,
  AudioTrack,
  ExportSettings,
  ProjectData,
  AppPanel,
  ImageMetadata,
  VideoMetadata,
  AudioMetadata,
  ExportRequest,
  ExportResult,
  RenderProgress
} from '@shared/types'

export type { TransitionId, TransitionFamily } from '@shared/transitions/catalog'

export {
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_PER_IMAGE_DURATION_SECONDS,
  DEFAULT_TRANSITION_SECONDS,
  DEFAULT_AUDIO_FADE_SECONDS,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
  SUPPORTED_AUDIO_EXTENSIONS,
  RESOLUTION_MAP
} from '@shared/types'

export { getBaseName, naturalCompare, sortByBaseName } from '@shared/lib/filenames'
