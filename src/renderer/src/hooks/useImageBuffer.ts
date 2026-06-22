import { useCallback, useState } from 'react'
import { imageMetadataToLoaded, useProjectStore } from '@renderer/stores/projectStore'

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i

export function useImageBuffer(): {
  browseImages: () => Promise<void>
  handleDrop: (files: FileList) => Promise<void>
  error: string | null
  clearError: () => void
  isLoading: boolean
} {
  const loadImages = useProjectStore((s) => s.loadImages)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const processPaths = useCallback(
    async (paths: string[]) => {
      const imagePaths = paths.filter((p) => IMAGE_EXT.test(p))
      if (imagePaths.length === 0) {
        setError('No supported images found. Use JPG, JPEG, PNG, or WEBP.')
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const results = []
        for (const path of imagePaths) {
          const meta = await window.slideshow.getImageMetadata(path)
          results.push(imageMetadataToLoaded(meta, crypto.randomUUID()))
        }
        loadImages(results)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load images'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [loadImages]
  )

  const browseImages = useCallback(async () => {
    try {
      const paths = await window.slideshow.selectImages()
      if (paths.length > 0) await processPaths(paths)
    } catch (err) {
      console.error('Browse images error:', err)
      setError('Failed to open file dialog')
    }
  }, [processPaths])

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

  return {
    browseImages,
    handleDrop,
    error,
    clearError: () => setError(null),
    isLoading
  }
}
