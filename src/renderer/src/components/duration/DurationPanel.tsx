import { useProjectStore, usePerImageDuration } from '@renderer/stores/projectStore'

const PRESETS = [
  { label: '2 min', seconds: 120 },
  { label: '4 min', seconds: 240 },
  { label: '7 min', seconds: 420 },
  { label: '10 min', seconds: 600 }
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function DurationPanel(): React.JSX.Element {
  const targetDurationSeconds = useProjectStore((s) => s.targetDurationSeconds)
  const setTargetDurationSeconds = useProjectStore((s) => s.setTargetDurationSeconds)
  const imageCount = useProjectStore((s) => s.images.length)
  const perImage = usePerImageDuration()

  const minutes = Math.floor(targetDurationSeconds / 60)
  const seconds = targetDurationSeconds % 60

  return (
    <div className="flex h-full flex-col p-6">
      <h2 className="mb-1 text-lg font-semibold text-white">Target Duration</h2>
      <p className="mb-6 text-sm text-zinc-400">
        Set the final video length. Duration per image is calculated automatically.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.seconds}
            type="button"
            onClick={() => setTargetDurationSeconds(preset.seconds)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              targetDurationSeconds === preset.seconds
                ? 'bg-accent text-white'
                : 'bg-surface-700 text-zinc-300 hover:bg-surface-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="max-w-md space-y-4 rounded-xl bg-surface-800 p-5 ring-1 ring-surface-600">
        <div>
          <label className="mb-2 block text-sm text-zinc-400">Custom duration</label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={120}
                value={minutes}
                onChange={(e) =>
                  setTargetDurationSeconds(
                    parseInt(e.target.value || '0', 10) * 60 + seconds
                  )
                }
                className="w-16 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1.5 text-center text-white"
              />
              <span className="text-sm text-zinc-500">min</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) =>
                  setTargetDurationSeconds(minutes * 60 + parseInt(e.target.value || '0', 10))
                }
                className="w-16 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1.5 text-center text-white"
              />
              <span className="text-sm text-zinc-500">sec</span>
            </div>
          </div>
        </div>

        <div className="border-t border-surface-600 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Total duration</span>
            <span className="font-medium text-white">{formatTime(targetDurationSeconds)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-zinc-400">Images</span>
            <span className="text-white">{imageCount}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-zinc-400">Per image</span>
            <span className="font-medium text-accent-hover">
              {imageCount > 0 ? `${perImage.toFixed(1)}s` : '—'}
            </span>
          </div>
        </div>

        {imageCount > 0 && (
          <p className="text-xs text-zinc-500">
            Example: {imageCount} images × {perImage.toFixed(1)}s ≈ {formatTime(targetDurationSeconds)} final video
          </p>
        )}
      </div>
    </div>
  )
}
