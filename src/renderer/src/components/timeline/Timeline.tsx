import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TimelineClip, TransitionId } from '@renderer/types'
import { getTransition } from '@renderer/lib/transitions'
import { computeTotalFromDurations } from '@renderer/lib/duration'
import { useProjectStore } from '@renderer/stores/projectStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { TransitionPicker } from '@renderer/components/transitions/TransitionPicker'
import { TimelineClipCard, clipWidthPx } from '@renderer/components/timeline/TimelineClipCard'

interface TimelineProps {
  currentTime: number
  totalDuration: number
  clips: TimelineClip[]
  onSeek: (time: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (id: string) => void
  activeIndex?: number
  stripScrollRef?: React.RefObject<HTMLDivElement | null>
  onStripScroll?: (scrollLeft: number) => void
  reserveMusicStrip?: boolean
}

interface PickerState {
  index: number
  x: number
  y: number
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getSceneBoundaryMarkers(
  clips: TimelineClip[],
  transitionSeconds: number,
  totalDuration: number
): { percent: number }[] {
  if (totalDuration <= 0 || clips.length < 2) return []
  let elapsed = 0
  const markers: { percent: number }[] = []
  for (let i = 0; i < clips.length - 1; i++) {
    elapsed += clips[i].durationSeconds - transitionSeconds
    const cur = clips[i].sceneId
    const next = clips[i + 1].sceneId
    if (cur && next && cur !== next) {
      markers.push({ percent: (elapsed / totalDuration) * 100 })
    }
  }
  return markers
}

function getTransitionMarkers(
  clips: TimelineClip[],
  transitionSeconds: number,
  totalDuration: number
): { index: number; percent: number }[] {
  if (totalDuration <= 0 || clips.length < 2) return []
  let elapsed = 0
  const markers: { index: number; percent: number }[] = []
  for (let i = 0; i < clips.length - 1; i++) {
    elapsed += clips[i].durationSeconds - transitionSeconds
    markers.push({ index: i, percent: (elapsed / totalDuration) * 100 })
  }
  return markers
}

export function Timeline({
  currentTime,
  totalDuration,
  clips,
  onSeek,
  onReorder,
  onRemove,
  activeIndex,
  stripScrollRef,
  onStripScroll,
  reserveMusicStrip = false
}: TimelineProps): React.JSX.Element {
  const transitionSeconds = useProjectStore((s) => s.transitionSeconds)
  const editorMode = useProjectStore((s) => s.editorMode)
  const scenesConfig = useProjectStore((s) => s.scenesConfig)
  const sceneReplacementMedia = useProjectStore((s) => s.sceneReplacementMedia)
  const setClipTransition = useProjectStore((s) => s.setClipTransition)
  const setClipDuration = useProjectStore((s) => s.setClipDuration)
  const replaceClipWithImage = useProjectStore((s) => s.replaceClipWithImage)
  const replaceSceneMedia = useProjectStore((s) => s.replaceSceneMedia)
  const loadedImages = useProjectStore((s) => s.loadedImages)
  const pixelsPerSecond = useUiStore((s) => s.timelinePixelsPerSecond)
  const adjustTimelinePixelsPerSecond = useUiStore((s) => s.adjustTimelinePixelsPerSecond)

  const computedTotal =
    clips.length > 0
      ? computeTotalFromDurations(
          clips.map((c) => c.durationSeconds),
          transitionSeconds
        )
      : totalDuration
  const progress = computedTotal > 0 ? (currentTime / computedTotal) * 100 : 0
  const clipCount = clips.length
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [replaceError, setReplaceError] = useState<string | null>(null)
  const clipRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const loadedBaseNames = useMemo(
    () => new Set(loadedImages.map((img) => img.baseName)),
    [loadedImages]
  )
  const scenePairAvailability = useMemo(() => {
    const map = new Map<string, { hasImage: boolean; hasVideo: boolean }>()
    for (const scene of scenesConfig?.scenes ?? []) {
      for (const m of scene.media) {
        const prev = map.get(m.baseName) ?? { hasImage: false, hasVideo: false }
        if (m.mediaType === 'image') prev.hasImage = true
        if (m.mediaType === 'video') prev.hasVideo = true
        map.set(m.baseName, prev)
      }
    }
    for (const m of sceneReplacementMedia) {
      const prev = map.get(m.baseName) ?? { hasImage: false, hasVideo: false }
      if (m.mediaType === 'image') prev.hasImage = true
      if (m.mediaType === 'video') prev.hasVideo = true
      map.set(m.baseName, prev)
    }
    return map
  }, [scenesConfig, sceneReplacementMedia])

  const markers = useMemo(
    () => getTransitionMarkers(clips, transitionSeconds, computedTotal),
    [clips, transitionSeconds, computedTotal]
  )

  const sceneBoundaries = useMemo(
    () =>
      editorMode === 'scenes'
        ? getSceneBoundaryMarkers(clips, transitionSeconds, computedTotal)
        : [],
    [clips, transitionSeconds, computedTotal, editorMode]
  )

  const isScenesMode = editorMode === 'scenes'

  const sceneStartMarkers = useMemo(() => {
    if (!isScenesMode || !scenesConfig || scenesConfig.endTimeSeconds <= 0) return []
    return scenesConfig.scenes
      .map((s) => s.startTimeSeconds)
      .filter((t) => t > 0 && t < scenesConfig.endTimeSeconds)
      .map((t) => ({ percent: (t / scenesConfig.endTimeSeconds) * 100 }))
  }, [isScenesMode, scenesConfig])

  const onDragOverItem = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      if (dragIndex !== null && dragIndex !== index) {
        onReorder(dragIndex, index)
        setDragIndex(index)
      }
    },
    [dragIndex, onReorder]
  )

  const onWheelZoom = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      adjustTimelinePixelsPerSecond(e.deltaY < 0 ? 1 : -1)
    },
    [adjustTimelinePixelsPerSecond]
  )

  const onStripClickSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Clicking the strip should seek even when there are many clips.
      const el = e.currentTarget
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left + el.scrollLeft
      const percent = el.scrollWidth > 0 ? x / el.scrollWidth : 0
      onSeek(Math.max(0, Math.min(computedTotal, percent * computedTotal)))
    },
    [computedTotal, onSeek]
  )

  const openPicker = (index: number, e: React.MouseEvent): void => {
    e.stopPropagation()
    setPicker({ index, x: e.clientX, y: e.clientY })
  }

  const handleSelectTransition = (id: TransitionId): void => {
    if (picker) setClipTransition(picker.index, id)
    setPicker(null)
  }

  const handleReplace = (clipId: string): void => {
    setReplaceError(null)
    const result =
      editorMode === 'scenes'
        ? replaceSceneMedia('', clipId)
        : replaceClipWithImage(clipId)
    if (!result.ok) setReplaceError(result.error)
  }

  useEffect(() => {
    if (activeIndex == null || activeIndex < 0 || activeIndex >= clips.length) return
    const activeClip = clips[activeIndex]
    if (!activeClip) return
    const el = clipRefs.current[activeClip.id]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeIndex, clips])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-surface-600 bg-surface-800 px-4 py-3">
      <div className="mb-2 flex shrink-0 items-center justify-between text-xs text-zinc-400">
        <span>{formatTime(currentTime)}</span>
        <span>
          {clipCount} clips · Ctrl+scroll to zoom strip
        </span>
        <span>{formatTime(computedTotal)}</span>
      </div>

      {replaceError && (
        <div className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/30">
          {replaceError}
          <button type="button" onClick={() => setReplaceError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="relative shrink-0">
        <input
          type="range"
          min={0}
          max={computedTotal || 1}
          step={0.05}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="timeline-slider w-full"
          style={{
            background: `linear-gradient(to right, #6366f1 ${progress}%, #2a2a35 ${progress}%)`
          }}
        />
        {sceneStartMarkers.map(({ percent }, i) => (
          <div
            key={`sceneStart-${i}`}
            title="Scene start"
            className="pointer-events-none absolute top-0 bottom-0 z-[6] w-0.5 -translate-x-1/2 bg-emerald-400/80"
            style={{ left: `${percent}%` }}
          />
        ))}
        {sceneBoundaries.map(({ percent }, i) => (
          <div
            key={`scene-${i}`}
            title="Scene boundary"
            className="pointer-events-none absolute top-0 bottom-0 z-[5] w-0.5 -translate-x-1/2 bg-amber-400/80"
            style={{ left: `${percent}%` }}
          />
        ))}
        {markers.map(({ index, percent }) => (
          <div
            key={index}
            title={getTransition(clips[index].transitionId ?? 'crossfade').name}
            className="pointer-events-none absolute top-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface-900"
            style={{ left: `${percent}%` }}
          />
        ))}
      </div>

      {clipCount > 0 && (
        <div
          ref={stripScrollRef}
          className={`mt-3 flex min-h-0 flex-1 items-end gap-2 overflow-x-auto overflow-y-hidden pb-1 ${
            reserveMusicStrip ? 'min-h-[96px]' : 'min-h-[108px]'
          }`}
          onWheel={onWheelZoom}
          onClick={onStripClickSeek}
          onScroll={(e) => onStripScroll?.(e.currentTarget.scrollLeft)}
        >
          {clips.map((clip, index) => {
            const isActive = activeIndex === index
            const hasTransition = index < clips.length - 1
            const canReplaceVideoMode =
              editorMode === 'video' &&
              clip.mediaType === 'video' &&
              loadedBaseNames.has(clip.baseName)
            const pair = scenePairAvailability.get(clip.baseName)
            const canReplaceScenesMode =
              editorMode === 'scenes' &&
              !!pair &&
              (clip.mediaType === 'image' ? pair.hasVideo : pair.hasImage)
            const canReplace = canReplaceVideoMode || canReplaceScenesMode
            const showReplaceButton = editorMode === 'scenes' || clip.mediaType === 'video'
            const replaceLabel =
              clip.mediaType === 'image' ? 'Replace with vid' : 'Replace with img'
            const widthPx = clipWidthPx(clip.durationSeconds, pixelsPerSecond)

            return (
              <div
                key={clip.id}
                ref={(el) => {
                  clipRefs.current[clip.id] = el
                }}
                className="flex shrink-0 items-end gap-1"
              >
                <TimelineClipCard
                  clip={clip}
                  index={index}
                  isActive={isActive}
                  widthPx={widthPx}
                  pixelsPerSecond={pixelsPerSecond}
                  canReplace={canReplace}
                  showReplaceButton={showReplaceButton}
                  replaceLabel={replaceLabel}
                  replaceMissingLabel="Load pair first"
                  allowDurationEdit={!isScenesMode}
                  allowReorder={!isScenesMode}
                  onRemove={onRemove}
                  onReplace={handleReplace}
                  onDurationChange={setClipDuration}
                  onDragStartReorder={() => setDragIndex(index)}
                  onDragOverReorder={(e) => onDragOverItem(e, index)}
                  onDragEndReorder={() => setDragIndex(null)}
                />
                {hasTransition && (
                  <button
                    type="button"
                    onClick={(e) => openPicker(index, e)}
                    title={`Transition: ${getTransition(clip.transitionId ?? 'crossfade').name}`}
                    className="mb-6 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-700 text-accent ring-1 ring-surface-600 hover:bg-accent/20"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <TransitionPicker
        open={picker !== null}
        x={picker?.x ?? 0}
        y={picker?.y ?? 0}
        currentId={picker ? clips[picker.index]?.transitionId : null}
        onSelect={handleSelectTransition}
        onClose={() => setPicker(null)}
      />
    </div>
  )
}
