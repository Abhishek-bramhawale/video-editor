import { usePreviewPlayback } from '@renderer/hooks/usePreviewPlayback'
import { getTransitionPreviewStyles } from '@renderer/lib/transitions/preview'
import { useProjectStore } from '@renderer/stores/projectStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { Timeline } from '@renderer/components/timeline/Timeline'
import { ResizeHandle } from '@renderer/components/layout/ResizeHandle'
import { useCallback } from 'react'

export function PreviewWorkspace(): React.JSX.Element {
  const images = useProjectStore((s) => s.images)
  const reorderImages = useProjectStore((s) => s.reorderImages)
  const removeImage = useProjectStore((s) => s.removeImage)
  const timelineHeight = useUiStore((s) => s.timelineHeight)
  const setTimelineHeight = useUiStore((s) => s.setTimelineHeight)
  const { state, toggle, seek, getTransform } = usePreviewPlayback()

  const onResizeTimeline = useCallback(
    (deltaY: number) => {
      setTimelineHeight(timelineHeight - deltaY)
    },
    [timelineHeight, setTimelineHeight]
  )

  const currentImage = images[state.currentImageIndex]
  const nextImage = images[state.currentImageIndex + 1]
  const transform = getTransform()
  const isTransitioning = state.inTransition && !!nextImage
  const styles = isTransitioning
    ? getTransitionPreviewStyles(currentImage?.transitionId, state.transitionT)
    : null

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col bg-surface-900 p-3">
        <div className="relative mx-auto flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-black ring-1 ring-surface-600">
          <div className="relative h-full aspect-video overflow-hidden">
            {images.length === 0 ? (
              <div className="text-center">
                <p className="text-base font-medium text-white">Preview</p>
                <p className="mt-1 text-sm text-zinc-500">Add images to see your slideshow</p>
              </div>
            ) : (
              <>
                {currentImage && (
                  <img
                    src={currentImage.thumbnailUrl}
                    alt={currentImage.fileName}
                    className="absolute inset-0 h-full w-full object-cover transition-none will-change-transform"
                    style={{
                      transform: `scale(${transform.scale}) translate(${transform.translateX}%, ${transform.translateY}%)`,
                      transformOrigin: 'center center',
                      ...(styles?.current ?? {})
                    }}
                  />
                )}
                {nextImage && isTransitioning && (
                  <img
                    src={nextImage.thumbnailUrl}
                    alt={nextImage.fileName}
                    className="absolute inset-0 h-full w-full object-cover will-change-transform"
                    style={styles?.next ?? {}}
                  />
                )}
                {styles?.overlay && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={styles.overlay}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {images.length > 0 && (
          <div className="mt-2 flex shrink-0 items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => seek(0)}
              className="rounded-lg bg-surface-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-surface-600"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-hover"
            >
              {state.isPlaying ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              )}
            </button>
            <span className="text-xs text-zinc-400">
              Clip {state.currentImageIndex + 1} / {images.length}
            </span>
          </div>
        )}
      </div>

      <ResizeHandle onResize={onResizeTimeline} />
      <div className="shrink-0 overflow-hidden" style={{ height: timelineHeight }}>
        <Timeline
          currentTime={state.currentTime}
          totalDuration={state.totalDuration}
          images={images}
          onSeek={seek}
          onReorder={reorderImages}
          onRemove={removeImage}
          activeIndex={state.currentImageIndex}
        />
      </div>
    </div>
  )
}
