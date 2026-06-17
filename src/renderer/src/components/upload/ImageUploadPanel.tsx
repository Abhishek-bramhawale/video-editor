import { useCallback, useState } from 'react'
import { useVideoUpload } from '@renderer/hooks/useVideoUpload'
import { useImageBuffer } from '@renderer/hooks/useImageBuffer'
import { useProjectStore, useTimelineTotalDuration } from '@renderer/stores/projectStore'
import { useUiStore } from '@renderer/stores/uiStore'

export function ImageUploadPanel(): React.JSX.Element {
  const clips = useProjectStore((s) => s.clips)
  const loadedImages = useProjectStore((s) => s.loadedImages)
  const randomizeImageEffects = useProjectStore((s) => s.randomizeImageEffects)
  const totalDuration = useTimelineTotalDuration()
  const imageThumbMin = useUiStore((s) => s.imageThumbMin)
  const adjustImageThumbMin = useUiStore((s) => s.adjustImageThumbMin)

  const {
    browseVideos,
    handleDrop: handleVideoDrop,
    error: videoError,
    clearError: clearVideoError,
    isLoading: videoLoading
  } = useVideoUpload()

  const {
    browseImages,
    handleDrop: handleImageDrop,
    error: imageError,
    clearError: clearImageError,
    isLoading: imageLoading
  } = useImageBuffer()

  const [videoDragOver, setVideoDragOver] = useState(false)
  const [imageDragOver, setImageDragOver] = useState(false)
  const [showImageBuffer, setShowImageBuffer] = useState(false)

  const onWheelZoom = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      adjustImageThumbMin(e.deltaY < 0 ? 12 : -12)
    },
    [adjustImageThumbMin]
  )

  const onVideoDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setVideoDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        await handleVideoDrop(e.dataTransfer.files)
      }
    },
    [handleVideoDrop]
  )

  const onImageDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setImageDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        await handleImageDrop(e.dataTransfer.files)
      }
    },
    [handleImageDrop]
  )

  const error = videoError ?? imageError
  const clearError = (): void => {
    clearVideoError()
    clearImageError()
  }

  const imageClipCount = clips.filter((c) => c.mediaType === 'image').length

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Videos</h2>
          <p className="text-sm text-zinc-400">
            {clips.length} clip{clips.length !== 1 ? 's' : ''} on timeline
            {totalDuration > 0 && ` · ${totalDuration.toFixed(1)}s total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {imageClipCount > 0 && (
            <button
              type="button"
              onClick={randomizeImageEffects}
              className="rounded-lg bg-surface-700 px-3 py-2 text-sm text-zinc-300 hover:bg-surface-600"
            >
              Re-randomize image effects
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowImageBuffer((v) => !v)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              showImageBuffer
                ? 'bg-accent text-white'
                : 'bg-surface-700 text-zinc-300 hover:bg-surface-600'
            }`}
          >
            Load imgs ({loadedImages.length})
          </button>
          <button
            type="button"
            onClick={browseVideos}
            disabled={videoLoading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {videoLoading ? 'Loading…' : 'Browse Videos'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex shrink-0 items-center justify-between rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/30">
          <span>{error}</span>
          <button type="button" onClick={clearError} className="ml-3 text-red-300 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" onWheel={onWheelZoom}>
        <div
          onDragOver={(e) => { e.preventDefault(); setVideoDragOver(true) }}
          onDragLeave={() => setVideoDragOver(false)}
          onDrop={onVideoDrop}
          className={`mb-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 transition-colors ${
            videoDragOver
              ? 'border-accent bg-accent/10'
              : 'border-surface-600 bg-surface-800/50'
          }`}
        >
          <svg className="mb-2 h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <p className="text-sm font-medium text-zinc-300">Drag & drop videos here</p>
          <p className="mt-1 text-xs text-zinc-500">MP4, MOV, WEBM, MKV — added to timeline with transitions</p>
        </div>

        {showImageBuffer && (
          <div className="mb-3 rounded-xl bg-surface-800 p-3 ring-1 ring-surface-600">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Image buffer</h3>
                <p className="text-xs text-zinc-500">
                  Drop matching images (same name as videos) for &quot;Replace with img&quot;
                </p>
              </div>
              <button
                type="button"
                onClick={browseImages}
                disabled={imageLoading}
                className="rounded-lg bg-surface-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-surface-600 disabled:opacity-50"
              >
                {imageLoading ? 'Loading…' : 'Browse'}
              </button>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setImageDragOver(true) }}
              onDragLeave={() => setImageDragOver(false)}
              onDrop={onImageDrop}
              className={`mb-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-4 transition-colors ${
                imageDragOver
                  ? 'border-accent bg-accent/10'
                  : 'border-surface-600 bg-surface-900/50'
              }`}
            >
              <p className="text-xs text-zinc-400">Drop images here — JPG, PNG, WEBP</p>
            </div>
            {loadedImages.length > 0 && (
              <div
                className="grid max-h-48 gap-2 overflow-y-auto"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${Math.min(imageThumbMin, 100)}px, 1fr))`
                }}
              >
                {loadedImages.map((img) => (
                  <div
                    key={img.id}
                    className="overflow-hidden rounded-lg bg-surface-900 ring-1 ring-surface-600"
                    title={img.fileName}
                  >
                    <img
                      src={img.thumbnailUrl}
                      alt={img.fileName}
                      className="aspect-square w-full object-cover"
                    />
                    <p className="truncate px-1 py-0.5 text-[10px] text-zinc-400">{img.baseName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {clips.length > 0 && (
          <p className="text-xs text-zinc-500">
            {clips.length} video{clips.length !== 1 ? 's' : ''} on timeline.
            Use the timeline below preview to reorder, set duration, and replace with images.
          </p>
        )}
      </div>
    </div>
  )
}
