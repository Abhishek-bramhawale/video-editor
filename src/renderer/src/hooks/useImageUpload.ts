import { useCallback } from 'react'
import type { SlideshowImage } from '@renderer/types'
import { useProjectStore } from '@renderer/stores/projectStore'

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i

export function useImageUpload(): {
  addFilesFromPaths: (paths: string[]) => Promise<void>
  browseImages: () => Promise<void>
  handleDrop: (files: FileList | File[]) => Promise<void>
} {
  const addImages = useProjectStore((s) => s.addImages)

  const addFilesFromPaths = useCallback(
    async (paths: string[]) => {
      const validPaths = paths.filter((p) => IMAGE_EXT.test(p))
      if (validPaths.length === 0) return

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
    },
    [addImages]
  )

  const browseImages = useCallback(async () => {
    const paths = await window.slideshow.selectImages()
    if (paths.length > 0) await addFilesFromPaths(paths)
  }, [addFilesFromPaths])

  const handleDrop = useCallback(
    async (files: FileList | File[]) => {
      const paths: string[] = []
      for (const file of Array.from(files)) {
        const path = (file as File & { path?: string }).path
        if (path && IMAGE_EXT.test(path)) paths.push(path)
      }
      if (paths.length > 0) await addFilesFromPaths(paths)
    },
    [addFilesFromPaths]
  )

  return { addFilesFromPaths, browseImages, handleDrop }
}
