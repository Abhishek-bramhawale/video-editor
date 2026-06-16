import { useProjectStore, usePerImageDuration } from '@renderer/stores/projectStore'
import { computeTotalFromPerImage } from '@renderer/lib/duration'

const TOTAL_PRESETS = [
  { label: '2 min', seconds: 120 },
  { label: '4 min', seconds: 240 },
  { label: '7 min', seconds: 420 },
  { label: '10 min', seconds: 600 }
]

const PER_IMAGE_PRESETS = [3, 4, 5, 8, 10]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function DurationPanel(): React.JSX.Element {
  const targetDurationSeconds = useProjectStore((s) => s.targetDurationSeconds)
  const perImageDurationSeconds = useProjectStore((s) => s.perImageDurationSeconds)
  const durationMode = useProjectStore((s) => s.durationMode)
  const setTargetDurationSeconds = useProjectStore((s) => s.setTargetDurationSeconds)
  const setPerImageDurationSeconds = useProjectStore((s) => s.setPerImageDurationSeconds)
  const imageCount = useProjectStore((s) => s.images.length)
  const perImage = usePerImageDuration()

  const totalMinutes = Math.floor(targetDurationSeconds / 60)
  const totalSeconds = targetDurationSeconds % 60
  const estimatedTotal = computeTotalFromPerImage(perImageDurationSeconds, imageCount)

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <h2 className="mb-1 text-base font-semibold text-white">Duration</h2>
      <p className="mb-4 text-sm text-zinc-400">
        Set time per image or the final video length. Transitions overlap by 1s between clips.
      </p>

      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <section
          className={`rounded-xl p-4 ring-1 transition-colors ${
            durationMode === 'per-image'
              ? 'bg-accent/5 ring-accent/40'
              : 'bg-surface-800 ring-surface-600'
          }`}
        >
          <h3 className="mb-1 text-sm font-semibold text-white">Per image</h3>
          <p className="mb-3 text-xs text-zinc-500">
            Each image gets the same duration. Example: 4s × {imageCount || 'N'} images.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {PER_IMAGE_PRESETS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => setPerImageDurationSeconds(seconds)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  durationMode === 'per-image' && perImageDurationSeconds === seconds
                    ? 'bg-accent text-white'
                    : 'bg-surface-700 text-zinc-300 hover:bg-surface-600'
                }`}
              >
                {seconds}s
              </button>
            ))}
          </div>

          <label className="mb-2 block text-xs text-zinc-400">Seconds per image</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0.5}
              max={120}
              step={0.5}
              value={Number(perImageDurationSeconds.toFixed(1))}
              onChange={(e) => setPerImageDurationSeconds(parseFloat(e.target.value) || 0.5)}
              className="w-24 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1.5 text-center text-white"
            />
            <span className="text-sm text-zinc-500">sec / image</span>
          </div>

          {imageCount > 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              → Final video ≈ {formatTime(estimatedTotal)}
            </p>
          )}
        </section>

        <section
          className={`rounded-xl p-4 ring-1 transition-colors ${
            durationMode === 'total'
              ? 'bg-accent/5 ring-accent/40'
              : 'bg-surface-800 ring-surface-600'
          }`}
        >
          <h3 className="mb-1 text-sm font-semibold text-white">Whole video</h3>
          <p className="mb-3 text-xs text-zinc-500">
            Set the total final length. Per-image time is calculated automatically.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {TOTAL_PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                type="button"
                onClick={() => setTargetDurationSeconds(preset.seconds)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  durationMode === 'total' && targetDurationSeconds === preset.seconds
                    ? 'bg-accent text-white'
                    : 'bg-surface-700 text-zinc-300 hover:bg-surface-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="mb-2 block text-xs text-zinc-400">Custom total length</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={120}
              value={totalMinutes}
              onChange={(e) =>
                setTargetDurationSeconds(
                  parseInt(e.target.value || '0', 10) * 60 + totalSeconds
                )
              }
              className="w-16 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1.5 text-center text-white"
            />
            <span className="text-sm text-zinc-500">min</span>
            <input
              type="number"
              min={0}
              max={59}
              value={totalSeconds}
              onChange={(e) =>
                setTargetDurationSeconds(totalMinutes * 60 + parseInt(e.target.value || '0', 10))
              }
              className="w-16 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1.5 text-center text-white"
            />
            <span className="text-sm text-zinc-500">sec</span>
          </div>

          {imageCount > 0 && (
            <p className="mt-3 text-xs text-zinc-500">
              → Each image ≈ {perImage.toFixed(1)}s
            </p>
          )}
        </section>
      </div>

      {imageCount > 0 && (
        <div className="mt-4 max-w-3xl rounded-xl bg-surface-800 p-4 text-sm ring-1 ring-surface-600">
          <div className="flex justify-between">
            <span className="text-zinc-400">Images</span>
            <span className="text-white">{imageCount}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-zinc-400">Per image</span>
            <span className="font-medium text-accent-hover">{perImage.toFixed(1)}s</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-zinc-400">Final video</span>
            <span className="font-medium text-white">{formatTime(targetDurationSeconds)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
