import { usePreviewPlayback } from '@renderer/hooks/usePreviewPlayback'
import { useProjectStore } from '@renderer/stores/projectStore'
import { Timeline } from '@renderer/components/timeline/Timeline'

type TransitionStylePair = {
  current: React.CSSProperties
  next: React.CSSProperties
  overlay?: React.CSSProperties
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function transitionStyles(transitionId: string | null | undefined, tRaw: number): TransitionStylePair {
  const t = clamp01(tRaw)
  const base: TransitionStylePair = {
    current: { opacity: 1 },
    next: { opacity: 0 }
  }

  const id = transitionId ?? 'crossfade'
  switch (id) {
    case 'dip-to-black': {
      // fade to black then fade up
      const overlayOpacity = t < 0.5 ? t * 2 : (1 - t) * 2
      return {
        current: { opacity: 1 },
        next: { opacity: 1 },
        overlay: { opacity: overlayOpacity, backgroundColor: '#000' }
      }
    }
    case 'dip-to-white': {
      const overlayOpacity = t < 0.5 ? t * 2 : (1 - t) * 2
      return {
        current: { opacity: 1 },
        next: { opacity: 1 },
        overlay: { opacity: overlayOpacity, backgroundColor: '#fff' }
      }
    }
    case 'dissolve':
    case 'crossfade': {
      return {
        current: { opacity: 1 - t },
        next: { opacity: t }
      }
    }
    case 'blur': {
      const blurPx = lerp(0, 14, t)
      return {
        current: { opacity: 1 - t, filter: `blur(${blurPx}px)` },
        next: { opacity: t, filter: `blur(${lerp(14, 0, t)}px)` }
      }
    }
    case 'zoom': {
      return {
        current: { opacity: 1 - t, transform: `scale(${lerp(1, 1.08, t)})` },
        next: { opacity: t, transform: `scale(${lerp(1.12, 1, t)})` }
      }
    }
    case 'slide-left': {
      return {
        current: { opacity: 1, transform: `translateX(${lerp(0, -30, t)}%)` },
        next: { opacity: 1, transform: `translateX(${lerp(100, 0, t)}%)` }
      }
    }
    case 'slide-right': {
      return {
        current: { opacity: 1, transform: `translateX(${lerp(0, 30, t)}%)` },
        next: { opacity: 1, transform: `translateX(${lerp(-100, 0, t)}%)` }
      }
    }
    case 'slide-up': {
      return {
        current: { opacity: 1, transform: `translateY(${lerp(0, -30, t)}%)` },
        next: { opacity: 1, transform: `translateY(${lerp(100, 0, t)}%)` }
      }
    }
    case 'slide-down': {
      return {
        current: { opacity: 1, transform: `translateY(${lerp(0, 30, t)}%)` },
        next: { opacity: 1, transform: `translateY(${lerp(-100, 0, t)}%)` }
      }
    }
    case 'push': {
      // cover-like push
      return {
        current: { opacity: 1, transform: `translateX(${lerp(0, -100, t)}%)` },
        next: { opacity: 1, transform: `translateX(${lerp(100, 0, t)}%)` }
      }
    }
    case 'directional-wipe': {
      // reveal next from left to right
      const inset = Math.round((1 - t) * 100)
      return {
        current: { opacity: 1 },
        next: { opacity: 1, clipPath: `inset(0 ${inset}% 0 0)` }
      }
    }
    case 'soft-wipe': {
      // diagonal wipe approximation
      const p = Math.round(t * 100)
      return {
        current: { opacity: 1 },
        next: { opacity: 1, clipPath: `polygon(0 0, ${p}% 0, 0 ${p}%)` }
      }
    }
    case 'cinematic-wipe': {
      // circle crop reveal
      const r = lerp(0, 150, t)
      return {
        current: { opacity: 1 },
        next: { opacity: 1, clipPath: `circle(${r}% at 50% 50%)` }
      }
    }
    default:
      return base
  }
}

export function PreviewWorkspace(): React.JSX.Element {
  const images = useProjectStore((s) => s.images)
  const { state, toggle, seek, getTransform } = usePreviewPlayback()

  const currentImage = images[state.currentImageIndex]
  const nextImage = images[state.currentImageIndex + 1]
  const transform = getTransform()
  const isTransitioning = state.inTransition && !!nextImage
  const styles = isTransitioning ? transitionStyles(currentImage?.transitionId, state.transitionT) : null

  return (
    <>
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
                  style={{
                    ...(styles?.next ?? {})
                  }}
                />
              )}
              {styles?.overlay && (
                <div
                  className="pointer-events-none absolute inset-0 bg-black"
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

      <Timeline
        currentTime={state.currentTime}
        totalDuration={state.totalDuration}
        imageCount={images.length}
        onSeek={seek}
      />
    </>
  )
}
