import { useCallback, useMemo, useState } from 'react'
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
  activeIndex
}: TimelineProps): React.JSX.Element {
  const transitionSeconds = useProjectStore((s) => s.transitionSeconds)
  const setClipTransition = useProjectStore((s) => s.setClipTransition)
  const setClipDuration = useProjectStore((s) => s.setClipDuration)
  const replaceClipWithImage = useProjectStore((s) => s.replaceClipWithImage)
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

  const loadedBaseNames = useMemo(
    () => new Set(loadedImages.map((img) => img.baseName)),
    [loadedImages]
  )

  const markers = useMemo(
    () => getTransitionMarkers(clips, transitionSeconds, computedTotal),
    [clips, transitionSeconds, computedTotal]
  )

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
    const result = replaceClipWithImage(clipId)
    if (!result.ok) setReplaceError(result.error)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto border-t border-surface-600 bg-surface-800 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
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

      <div className="relative">
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
        {markers.map(({ index, percent }) => (
          <button
            key={index}
            type="button"
            title={getTransition(clips[index].transitionId ?? 'crossfade').name}
            onClick={(e) => openPicker(index, e)}
            className="absolute top-1/2 z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-lg ring-2 ring-surface-900 hover:scale-110 hover:bg-accent-hover"
            style={{ left: `${percent}%` }}
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </button>
        ))}
      </div>

      {clipCount > 0 && (
        <div
          className="mt-3 flex items-end gap-2 overflow-x-auto pb-1"
          onWheel={onWheelZoom}
        >
          {clips.map((clip, index) => {
            const isActive = activeIndex === index
            const hasTransition = index < clips.length - 1
            const canReplace =
              clip.mediaType === 'video' && loadedBaseNames.has(clip.baseName)
            const widthPx = clipWidthPx(clip.durationSeconds, pixelsPerSecond)

            return (
              <div key={clip.id} className="flex shrink-0 items-end gap-1">
                <TimelineClipCard
                  clip={clip}
                  index={index}
                  isActive={isActive}
                  widthPx={widthPx}
                  pixelsPerSecond={pixelsPerSecond}
                  canReplace={canReplace}
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
