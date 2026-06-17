import { useCallback, useState } from 'react'
import { useProjectStore, videoMetadataToClip } from '@renderer/stores/projectStore'

const VIDEO_EXT = /\.(mp4|mov|webm|mkv)$/i

export function useVideoUpload(): {
  browseVideos: () => Promise<void>
  handleDrop: (files: FileList) => Promise<void>
  error: string | null
  clearError: () => void
  isLoading: boolean
} {
  const addVideos = useProjectStore((s) => s.addVideos)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const processPaths = useCallback(
    async (paths: string[]) => {
      const videoPaths = paths.filter((p) => VIDEO_EXT.test(p))
      if (videoPaths.length === 0) {
        setError('No supported videos found. Use MP4, MOV, WEBM, or MKV.')
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const startOrder = useProjectStore.getState().clips.length
        const clips = []
        for (let i = 0; i < videoPaths.length; i++) {
          const meta = await window.slideshow.getVideoMetadata(videoPaths[i])
          clips.push(
            videoMetadataToClip(meta, crypto.randomUUID(), startOrder + i)
          )
        }
        addVideos(clips)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load videos'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [addVideos]
  )

  const browseVideos = useCallback(async () => {
    try {
      const paths = await window.slideshow.selectVideos()
      if (paths.length > 0) await processPaths(paths)
    } catch (err) {
      console.error('Browse videos error:', err)
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
    browseVideos,
    handleDrop,
    error,
    clearError: () => setError(null),
    isLoading
  }
}
