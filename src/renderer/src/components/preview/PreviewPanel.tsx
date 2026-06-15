import { usePreviewPlayback } from '@renderer/hooks/usePreviewPlayback'
import { useProjectStore } from '@renderer/stores/projectStore'
import { Timeline } from '@renderer/components/timeline/Timeline'

export function PreviewPanel(): React.JSX.Element {
  const images = useProjectStore((s) => s.images)
  const { state, toggle, seek, getTransform, getTransitionOpacity } = usePreviewPlayback()

  const currentImage = images[state.currentImageIndex]
  const nextImage = images[state.currentImageIndex + 1]
  const transform = getTransform()
  const transitionOpacity = getTransitionOpacity()

  if (images.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-lg font-medium text-white">No images to preview</p>
          <p className="mt-1 text-sm text-zinc-400">Add images first to see the timeline preview.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col p-4">
        <div className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-xl bg-black ring-1 ring-surface-600">
          {currentImage && (
            <img
              src={currentImage.thumbnailUrl}
              alt={currentImage.fileName}
              className="absolute inset-0 h-full w-full object-cover transition-none"
              style={{
                transform: `scale(${transform.scale}) translate(${transform.translateX}%, ${transform.translateY}%)`,
                transformOrigin: 'center center'
              }}
            />
          )}
          {nextImage && transitionOpacity > 0 && (
            <img
              src={nextImage.thumbnailUrl}
              alt={nextImage.fileName}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: transitionOpacity }}
            />
          )}
          {transitionOpacity > 0.4 && (
            <div
              className="pointer-events-none absolute inset-0 bg-black"
              style={{ opacity: transitionOpacity * 0.5 }}
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => seek(0)}
            className="rounded-lg bg-surface-700 px-3 py-2 text-sm text-zinc-300 hover:bg-surface-600"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={toggle}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-hover"
          >
            {state.isPlaying ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>
          <span className="text-sm text-zinc-400">
            Clip {state.currentImageIndex + 1} / {images.length}
          </span>
        </div>
      </div>

      <Timeline
        currentTime={state.currentTime}
        totalDuration={state.totalDuration}
        imageCount={images.length}
        onSeek={seek}
      />
    </div>
  )
}
