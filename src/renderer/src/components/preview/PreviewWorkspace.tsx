import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { pathToFileURL } from '@renderer/lib/media/fileUrl'
import { usePreviewPlayback } from '@renderer/hooks/usePreviewPlayback'
import { usePreviewAudio } from '@renderer/hooks/usePreviewAudio'
import { usePlaybackKeyboard } from '@renderer/hooks/usePlaybackKeyboard'
import { useAspectFit16x9 } from '@renderer/hooks/useAspectFit16x9'
import { getTransitionPreviewStyles } from '@renderer/lib/transitions/preview'
import { useProjectStore } from '@renderer/stores/projectStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { Timeline } from '@renderer/components/timeline/Timeline'
import { MusicTimeline } from '@renderer/components/timeline/MusicTimeline'
import { ResizeHandle } from '@renderer/components/layout/ResizeHandle'
import {
  clampTimelineHeight,
  clampPreviewSectionHeight,
  MIN_CLIP_STRIP_HEIGHT,
  MUSIC_TIMELINE_HEIGHT
} from '@renderer/lib/layout/bounds'

function ClipMedia({
  clip,
  transform,
  style,
  videoTime,
  isPlaying
}: {
  clip: import('@renderer/types').TimelineClip
  transform: { scale: number; translateX: number; translateY: number }
  style?: React.CSSProperties
  videoTime?: number
  isPlaying?: boolean
}): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoReady, setVideoReady] = useState(false)

  const seekVideo = useCallback((time: number) => {
    const el = videoRef.current
    if (!el || clip.mediaType !== 'video') return
    const safeTime = Math.max(0, Math.min(time, el.duration || time))
    if (Number.isFinite(safeTime) && Math.abs(el.currentTime - safeTime) > 0.08) {
      try {
        el.currentTime = safeTime
      } catch {
        // ignore seek before metadata
      }
    }
  }, [clip.mediaType])

  useEffect(() => {
    setVideoReady(false)
  }, [clip.filePath])

  useEffect(() => {
    if (clip.mediaType !== 'video') return
    seekVideo(videoTime ?? 0)
  }, [clip.mediaType, videoTime, seekVideo, videoReady])

  useEffect(() => {
    const el = videoRef.current
    if (!el || clip.mediaType !== 'video') return
    if (isPlaying) void el.play().catch(() => {})
    else el.pause()
  }, [clip.mediaType, isPlaying])

  if (clip.mediaType === 'video') {
    const src = pathToFileURL(clip.filePath)
    return (
      <>
        <img
          src={clip.thumbnailUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ ...style, opacity: videoReady ? 0 : 1 }}
        />
        <video
          ref={videoRef}
          key={clip.filePath}
          src={src}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ ...style, opacity: videoReady ? 1 : 0 }}
          onLoadedData={() => {
            setVideoReady(true)
            seekVideo(videoTime ?? 0)
          }}
          onError={() => setVideoReady(false)}
        />
      </>
    )
  }

  return (
    <img
      src={clip.thumbnailUrl}
      alt={clip.fileName}
      className="absolute inset-0 h-full w-full object-cover transition-none will-change-transform"
      style={{
        transform: `scale(${transform.scale}) translate(${transform.translateX}%, ${transform.translateY}%)`,
        transformOrigin: 'center center',
        ...style
      }}
    />
  )
}

export function PreviewWorkspace(): React.JSX.Element {
  const clips = useProjectStore((s) => s.clips)
  const audio = useProjectStore((s) => s.audio)
  const editorMode = useProjectStore((s) => s.editorMode)
  const reorderClips = useProjectStore((s) => s.reorderClips)
  const removeClip = useProjectStore((s) => s.removeClip)
  const previewHeight = useUiStore((s) => s.previewHeight)
  const timelineHeight = useUiStore((s) => s.timelineHeight)
  const setTimelineHeight = useUiStore((s) => s.setTimelineHeight)
  const { state, toggle, seek, getTransform } = usePreviewPlayback()
  const previewAudioRef = usePreviewAudio(state.isPlaying, state.currentTime, audio)
  usePlaybackKeyboard(toggle, clips.length > 0)
  const { ref: previewFitRef, size: previewSize } = useAspectFit16x9<HTMLDivElement>()

  const clipScrollRef = useRef<HTMLDivElement>(null)
  const musicScrollRef = useRef<HTMLDivElement>(null)
  const scrollSyncRef = useRef(false)

  const syncScroll = useCallback((source: 'clip' | 'music', scrollLeft: number) => {
    if (scrollSyncRef.current) return
    scrollSyncRef.current = true
    const target = source === 'clip' ? musicScrollRef.current : clipScrollRef.current
    if (target) target.scrollLeft = scrollLeft
    scrollSyncRef.current = false
  }, [])

  const effectivePreviewHeight = clampPreviewSectionHeight(previewHeight)
  const effectiveTimelineHeight = useMemo(() => {
    const base = clampTimelineHeight(timelineHeight, effectivePreviewHeight)
    if (!audio) return base
    const minWithMusic = MIN_CLIP_STRIP_HEIGHT + MUSIC_TIMELINE_HEIGHT + 72
    return Math.max(base, minWithMusic)
  }, [audio, effectivePreviewHeight, timelineHeight])

  const onResizeTimeline = useCallback(
    (deltaY: number) => {
      setTimelineHeight(effectiveTimelineHeight - deltaY)
    },
    [effectiveTimelineHeight, setTimelineHeight]
  )

  const currentClip = clips[state.currentClipIndex]
  const nextClip = clips[state.currentClipIndex + 1]
  const transform = getTransform()
  const isTransitioning = state.inTransition && !!nextClip
  const styles = isTransitioning
    ? getTransitionPreviewStyles(currentClip?.transitionId, state.transitionT)
    : null

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <audio ref={previewAudioRef} className="hidden" preload="auto" />
      <div className="flex min-h-0 flex-1 flex-col bg-surface-900 p-3">
        <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl bg-black ring-1 ring-surface-600">
          <div ref={previewFitRef} className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative shrink-0 overflow-hidden bg-black shadow-inner ring-1 ring-surface-600"
              style={{
                width: previewSize.width > 0 ? previewSize.width : '100%',
                height: previewSize.height > 0 ? previewSize.height : undefined,
                aspectRatio: previewSize.width > 0 ? undefined : '16 / 9',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              {clips.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center text-center">
                  <div>
                    <p className="text-base font-medium text-white">Preview</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {editorMode === 'images'
                        ? 'Drop images to build your slideshow'
                        : editorMode === 'scenes'
                          ? 'Set up scenes and load media per scene'
                          : 'Drop videos to see your slideshow'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {currentClip && (
                    <ClipMedia
                      clip={currentClip}
                      transform={transform}
                      videoTime={state.localTimeSeconds}
                      isPlaying={state.isPlaying && !isTransitioning}
                      style={styles?.current ?? {}}
                    />
                  )}
                  {nextClip && isTransitioning && (
                    <ClipMedia
                      clip={nextClip}
                      transform={{ scale: 1, translateX: 0, translateY: 0 }}
                      videoTime={0}
                      isPlaying={false}
                      style={styles?.next ?? {}}
                    />
                  )}
                  {styles?.overlay && (
                    <div className="pointer-events-none absolute inset-0" style={styles.overlay} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {clips.length > 0 && (
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
              Clip {state.currentClipIndex + 1} / {clips.length} · Space to play/pause
            </span>
          </div>
        )}
      </div>

      <ResizeHandle onResize={onResizeTimeline} />
      <div className="flex min-h-0 shrink-0 flex-col overflow-hidden" style={{ height: effectiveTimelineHeight }}>
        <Timeline
          currentTime={state.currentTime}
          totalDuration={state.totalDuration}
          clips={clips}
          onSeek={seek}
          onReorder={reorderClips}
          onRemove={removeClip}
          activeIndex={state.currentClipIndex}
          stripScrollRef={clipScrollRef}
          onStripScroll={(left) => syncScroll('clip', left)}
          reserveMusicStrip={!!audio}
        />
        {audio && state.totalDuration > 0 && (
          <MusicTimeline
            currentTime={state.currentTime}
            totalDuration={state.totalDuration}
            onSeek={seek}
            stripScrollRef={musicScrollRef}
            onStripScroll={(left) => syncScroll('music', left)}
          />
        )}
      </div>
    </div>
  )
}
