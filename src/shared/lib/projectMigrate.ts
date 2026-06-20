import { getBaseName } from './filenames'
import type {
  LoadedImage,
  ProjectData,
  ProjectDataV1,
  SlideshowImage,
  TimelineClip
} from '../types'

function slideshowImageToClip(img: SlideshowImage): TimelineClip {
  return {
    id: img.id,
    filePath: img.filePath,
    fileName: img.fileName,
    baseName: getBaseName(img.fileName),
    mediaType: 'image',
    thumbnailUrl: img.thumbnailUrl,
    width: img.width,
    height: img.height,
    order: img.order,
    durationSeconds: img.durationSeconds,
    effectId: img.effectId,
    transitionId: img.transitionId,
    format: img.format
  }
}

export function isProjectDataV1(data: unknown): data is ProjectDataV1 {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    (data as ProjectDataV1).version === 1 &&
    'images' in data
  )
}

export function migrateProjectData(raw: unknown): ProjectData {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid project file')
  }

  if ((raw as ProjectData).version === 2 && 'clips' in raw) {
    const data = raw as ProjectData
    const hasVideo = data.clips.some((c) => c.mediaType === 'video')
    return {
      ...data,
      editorMode: data.editorMode ?? (hasVideo ? 'video' : 'images'),
      defaultImageClipSeconds: data.defaultImageClipSeconds ?? 5,
      targetTotalDurationSeconds: data.targetTotalDurationSeconds ?? null
    }
  }

  if (isProjectDataV1(raw)) {
    return {
      version: 2,
      name: raw.name,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      transitionSeconds: raw.transitionSeconds,
      editorMode: 'images',
      defaultImageClipSeconds: raw.perImageDurationSeconds ?? 5,
      clips: raw.images.map(slideshowImageToClip),
      loadedImages: [] as LoadedImage[],
      audio: raw.audio,
      exportSettings: raw.exportSettings
    }
  }

  throw new Error('Unsupported project file version')
}
