interface TimelineProps {
  currentTime: number
  totalDuration: number
  imageCount: number
  onSeek: (time: number) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Timeline({
  currentTime,
  totalDuration,
  imageCount,
  onSeek
}: TimelineProps): React.JSX.Element {
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

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
    </div>
  )
}
