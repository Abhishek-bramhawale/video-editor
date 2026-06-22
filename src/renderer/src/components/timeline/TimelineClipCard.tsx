import { useCallback, useEffect, useRef, useState } from 'react'
import type { TimelineClip } from '@renderer/types'
import { getEffect } from '@renderer/lib/effects'

const MIN_CLIP_WIDTH = 48
const THUMB_ASPECT = 9 / 16

interface TimelineClipCardProps {
  clip: TimelineClip
  index: number
  isActive: boolean
  widthPx: number
  pixelsPerSecond: number
  canReplace: boolean
  onRemove: (id: string) => void
  onReplace: (id: string) => void
  onDurationChange: (id: string, seconds: number) => void
  onDragStartReorder: () => void
  onDragOverReorder: (e: React.DragEvent) => void
  onDragEndReorder: () => void
}

export function TimelineClipCard({
  clip,
  index,
  isActive,
  widthPx,
  pixelsPerSecond,
  canReplace,
  onRemove,
  onReplace,
  onDurationChange,
  onDragStartReorder,
  onDragOverReorder,
  onDragEndReorder
}: TimelineClipCardProps): React.JSX.Element {
  const thumbHeight = Math.round(widthPx * THUMB_ASPECT)
  const resizeRef = useRef<{ startX: number; startDuration: number } | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  const maxDuration =
    clip.mediaType === 'video' && clip.nativeDurationSeconds
      ? clip.nativeDurationSeconds
      : 600

  const onResizeMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = { startX: e.clientX, startDuration: clip.durationSeconds }
    setIsResizing(true)
  }

  const onResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!resizeRef.current) return
      const deltaX = e.clientX - resizeRef.current.startX
      const next = resizeRef.current.startDuration + deltaX / pixelsPerSecond
      onDurationChange(clip.id, Math.max(0.1, Math.min(maxDuration, next)))
    },
    [clip.id, maxDuration, onDurationChange, pixelsPerSecond]
  )

  const onResizeUp = useCallback(() => {
    resizeRef.current = null
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (!isResizing) return
    window.addEventListener('mousemove', onResizeMove)
    window.addEventListener('mouseup', onResizeUp)
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    return () => {
      window.removeEventListener('mousemove', onResizeMove)
      window.removeEventListener('mouseup', onResizeUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, onResizeMove, onResizeUp])

  return (
    <div className="flex shrink-0 flex-col gap-1">
      <div
        draggable={!isResizing}
        onDragStart={onDragStartReorder}
        onDragOver={onDragOverReorder}
        onDragEnd={onDragEndReorder}
        className={`group relative cursor-grab overflow-hidden rounded-lg ring-1 active:cursor-grabbing ${
          isActive ? 'ring-accent' : 'ring-surface-600'
        } ${isResizing ? 'ring-accent' : ''}`}
        style={{ width: widthPx, height: thumbHeight }}
        title={`${clip.fileName} — drag right edge to change length`}
      >
        <img
          src={clip.thumbnailUrl}
          alt={clip.fileName}
          className="h-full w-full object-cover"
          draggable={false}
        />
        <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
          {index + 1}
        </span>
        <span
          className={`absolute right-6 top-1 rounded px-1 py-0.5 text-[9px] font-medium uppercase ${
            clip.mediaType === 'video'
              ? 'bg-blue-600/80 text-white'
              : 'bg-emerald-600/80 text-white'
          }`}
        >
          {clip.mediaType === 'video' ? 'vid' : 'img'}
        </span>
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white">
          {clip.durationSeconds.toFixed(1)}s
        </span>
        <button
          type="button"
          onClick={() => onRemove(clip.id)}
          className="absolute bottom-1 right-6 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove clip"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Drag to change clip duration"
          onMouseDown={onResizeMouseDown}
          className="absolute inset-y-0 right-0 z-10 flex w-3 cursor-ew-resize items-center justify-center bg-accent/0 hover:bg-accent/40"
        >
          <div className="h-8 w-0.5 rounded-full bg-white/70 opacity-0 group-hover:opacity-100" />
        </div>
      </div>
      {clip.mediaType === 'video' && (
        <button
          type="button"
          onClick={() => onReplace(clip.id)}
          disabled={!canReplace}
          title={
            canReplace
              ? `Replace with ${clip.baseName} image`
              : `Load image named "${clip.baseName}" first`
          }
          className="w-full rounded bg-surface-700 px-1 py-0.5 text-[9px] text-zinc-300 hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ width: widthPx }}
        >
          Replace img
        </button>
      )}
      {clip.mediaType === 'image' && clip.effectId && (
        <p className="truncate text-[9px] text-zinc-500" style={{ maxWidth: widthPx }}>
          {getEffect(clip.effectId).name}
        </p>
      )}
    </div>
  )
}

export function clipWidthPx(durationSeconds: number, pixelsPerSecond: number): number {
  return Math.max(MIN_CLIP_WIDTH, Math.round(durationSeconds * pixelsPerSecond))
}
