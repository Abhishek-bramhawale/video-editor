import { useCallback, useRef, useState } from 'react'
import type { SceneMediaItem } from '@renderer/types'
import {
  imageMetadataToSceneMedia,
  useProjectStore,
  videoMetadataToSceneMedia
} from '@renderer/stores/projectStore'

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i
const VIDEO_EXT = /\.(mp4|mov|webm|mkv)$/i
const MEDIA_ACCEPT =
  '.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.mkv,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/x-matroska'

export function useSceneMediaUpload(sceneId: string): {
  browseMedia: () => void
  handleDrop: (files: FileList) => Promise<void>
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  mediaAccept: string
  error: string | null
  clearError: () => void
  isLoading: boolean
} {
  const addMediaToScene = useProjectStore((s) => s.addMediaToScene)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const processPaths = useCallback(
    async (paths: string[]) => {
      const mediaPaths = paths.filter((p) => IMAGE_EXT.test(p) || VIDEO_EXT.test(p))
      if (mediaPaths.length === 0) {
        setError('No supported files found. Use JPG, PNG, WEBP, MP4, MOV, WEBM, or MKV.')
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const items: SceneMediaItem[] = []
        for (const path of mediaPaths) {
          if (IMAGE_EXT.test(path)) {
            const meta = await window.slideshow.getImageMetadata(path)
            items.push(imageMetadataToSceneMedia(meta, crypto.randomUUID()))
          } else if (VIDEO_EXT.test(path)) {
            const meta = await window.slideshow.getVideoMetadata(path)
            items.push(videoMetadataToSceneMedia(meta, crypto.randomUUID()))
          }
        }
        addMediaToScene(sceneId, items)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load media'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [addMediaToScene, sceneId]
  )

  const handleDrop = useCallback(
    async (files: FileList) => {
      const paths: string[] = []
      for (const file of Array.from(files)) {
        try {
          paths.push(window.slideshow.getPathForFile(file))
        } catch {
          // skip
        }
      }
      await processPaths(paths)
    },
    [processPaths]
  )

  const browseMedia = useCallback(() => {
    setError(null)
    const selectMedia = window.slideshow.selectMedia
    if (typeof selectMedia === 'function') {
      void (async () => {
        try {
          const paths = await selectMedia()
          if (paths.length > 0) await processPaths(paths)
        } catch (err) {
          console.error('Browse media error:', err)
          fileInputRef.current?.click()
        }
      })()
      return
    }
    fileInputRef.current?.click()
  }, [processPaths])

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        void handleDrop(files)
      }
      e.target.value = ''
    },
    [handleDrop]
  )

  return {
    browseMedia,
    handleDrop,
    onFileInputChange,
    fileInputRef,
    mediaAccept: MEDIA_ACCEPT,
    error,
    clearError: () => setError(null),
    isLoading
  }
}
