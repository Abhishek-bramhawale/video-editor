import { useCallback, useState } from 'react'
import type { SlideshowImage } from '@renderer/types'
import { useProjectStore } from '@renderer/stores/projectStore'

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i

function assertSlideshowApi(): void {
  if (!window.slideshow?.selectImages) {
    throw new Error('App bridge not loaded. Restart the application.')
  }
}

export function useImageUpload(): {
  addFilesFromPaths: (paths: string[]) => Promise<void>
  browseImages: () => Promise<void>
  handleDrop: (files: FileList | File[]) => Promise<void>
  error: string | null
  clearError: () => void
  isLoading: boolean
} {
  const addImages = useProjectStore((s) => s.addImages)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const clearError = useCallback(() => setError(null), [])

  const addFilesFromPaths = useCallback(
    async (paths: string[]) => {
      const validPaths = paths.filter((p) => IMAGE_EXT.test(p))
      if (validPaths.length === 0) {
        setError('No supported images found. Use JPG, JPEG, PNG, or WEBP.')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        assertSlideshowApi()
        const startOrder = useProjectStore.getState().images.length
        const results: SlideshowImage[] = []

        for (let i = 0; i < validPaths.length; i++) {
          const meta = await window.slideshow.getImageMetadata(validPaths[i])
          results.push({
            id: crypto.randomUUID(),
            filePath: meta.filePath,
            fileName: meta.fileName,
            format: meta.format,
            width: meta.width,
            height: meta.height,
            thumbnailUrl: meta.thumbnailUrl,
            order: startOrder + i,
            durationSeconds: 0,
            effectId: null,
            transitionId: null
          })
        }

        addImages(results)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load images'
        setError(message)
        console.error('Image upload error:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [addImages]
  )

  const browseImages = useCallback(async () => {
    try {
      assertSlideshowApi()
      setError(null)
      const paths = await window.slideshow.selectImages()
      if (paths.length > 0) await addFilesFromPaths(paths)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open file dialog'
      setError(message)
      console.error('Browse images error:', err)
    }
  }, [addFilesFromPaths])

  const handleDrop = useCallback(
    async (files: FileList | File[]) => {
      try {
        assertSlideshowApi()
        setError(null)
        const paths: string[] = []

        for (const file of Array.from(files)) {
          const path = window.slideshow.getPathForFile(file)
          if (path && IMAGE_EXT.test(path)) paths.push(path)
        }

        if (paths.length === 0) {
          setError('Could not read dropped file paths. Try Browse Images instead.')
          return
        }

        await addFilesFromPaths(paths)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process dropped files'
        setError(message)
        console.error('Drop error:', err)
      }
    },
    [addFilesFromPaths]
  )

  return { addFilesFromPaths, browseImages, handleDrop, error, clearError, isLoading }
}
