import { useCallback, useState } from 'react'
import type { SlideshowImage } from '@renderer/types'

interface TimelineProps {
  currentTime: number
  totalDuration: number
  images: SlideshowImage[]
  onSeek: (time: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (id: string) => void
  activeIndex?: number
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Timeline({
  currentTime,
  totalDuration,
  images,
  onSeek,
  onReorder,
  onRemove,
  activeIndex
}: TimelineProps): React.JSX.Element {
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0
  const imageCount = images.length
  const [dragIndex, setDragIndex] = useState<number | null>(null)

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

  return (
    <div className="border-t border-surface-600 bg-surface-800 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
        <span>{formatTime(currentTime)}</span>
        <span>{imageCount} clips</span>
        <span>{formatTime(totalDuration)}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={totalDuration || 1}
          step={0.05}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="timeline-slider w-full"
          style={{
            background: `linear-gradient(to right, #6366f1 ${progress}%, #2a2a35 ${progress}%)`
          }}
        />
        {imageCount > 1 && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex h-0 -translate-y-1/2">
            {Array.from({ length: imageCount - 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute h-2 w-px bg-surface-600"
                style={{ left: `${((i + 1) / imageCount) * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {imageCount > 0 && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {images.map((img, index) => {
            const isActive = activeIndex === index
            return (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => onDragOverItem(e, index)}
                onDragEnd={() => setDragIndex(null)}
                className={`group relative shrink-0 cursor-grab overflow-hidden rounded-lg ring-1 active:cursor-grabbing ${
                  isActive ? 'ring-accent' : 'ring-surface-600'
                }`}
                style={{ width: 84, height: 48 }}
                title={img.fileName}
              >
                <img
                  src={img.thumbnailUrl}
                  alt={img.fileName}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
