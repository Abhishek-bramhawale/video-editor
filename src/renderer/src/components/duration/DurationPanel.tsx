import { useProjectStore, useTimelineTotalDuration } from '@renderer/stores/projectStore'
import { ImagesTotalDurationControl } from '@renderer/components/duration/ImagesTotalDurationControl'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function DurationPanel(): React.JSX.Element {
  const transitionSeconds = useProjectStore((s) => s.transitionSeconds)
  const setTransitionSeconds = useProjectStore((s) => s.setTransitionSeconds)
  const editorMode = useProjectStore((s) => s.editorMode)
  const defaultImageClipSeconds = useProjectStore((s) => s.defaultImageClipSeconds)
  const setDefaultImageClipSeconds = useProjectStore((s) => s.setDefaultImageClipSeconds)
  const clips = useProjectStore((s) => s.clips)
  const totalDuration = useTimelineTotalDuration()

  const videoCount = clips.filter((c) => c.mediaType === 'video').length
  const imageCount = clips.filter((c) => c.mediaType === 'image').length

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <h2 className="mb-1 text-base font-semibold text-white">Duration</h2>
      <p className="mb-4 text-sm text-zinc-400">
        Each clip has its own length (set on the timeline). Music does not change clip durations.
        {editorMode === 'images' && ' New images use the default duration below.'}
      </p>

      {editorMode === 'images' && (
        <>
          <ImagesTotalDurationControl />
          <section className="mb-4 max-w-3xl rounded-xl bg-surface-800 p-4 ring-1 ring-surface-600">
            <h3 className="mb-1 text-sm font-semibold text-white">Default image duration</h3>
            <p className="mb-3 text-xs text-zinc-500">
              Used for new images before you set a total slideshow length.
            </p>
          <div className="flex flex-wrap items-center gap-2">
            {[3, 5, 8, 10].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setDefaultImageClipSeconds(sec)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  defaultImageClipSeconds === sec
                    ? 'bg-accent text-white'
                    : 'bg-surface-700 text-zinc-300 hover:bg-surface-600'
                }`}
              >
                {sec}s
              </button>
            ))}
            <input
              type="number"
              min={0.1}
              max={120}
              step={0.5}
              value={Number(defaultImageClipSeconds.toFixed(1))}
              onChange={(e) => setDefaultImageClipSeconds(parseFloat(e.target.value) || 5)}
              className="w-20 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1.5 text-center text-white"
            />
            <span className="text-sm text-zinc-500">sec per image</span>
          </div>
        </section>
        </>
      )}

      <section className="mb-4 max-w-3xl rounded-xl bg-surface-800 p-4 ring-1 ring-surface-600">
        <h3 className="mb-1 text-sm font-semibold text-white">Transition overlap</h3>
        <p className="mb-3 text-xs text-zinc-500">
          How long each transition blends between clips (export &amp; preview).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {[0.5, 1, 1.5, 2].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setTransitionSeconds(sec)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                transitionSeconds === sec
                  ? 'bg-accent text-white'
                  : 'bg-surface-700 text-zinc-300 hover:bg-surface-600'
              }`}
            >
              {sec}s
            </button>
          ))}
          <input
            type="number"
            min={0.1}
            max={3}
            step={0.1}
            value={Number(transitionSeconds.toFixed(1))}
            onChange={(e) => setTransitionSeconds(parseFloat(e.target.value) || 0.5)}
            className="w-20 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1.5 text-center text-white"
          />
          <span className="text-sm text-zinc-500">sec</span>
        </div>
      </section>

      {clips.length > 0 && (
        <div className="max-w-3xl rounded-xl bg-surface-800 p-4 text-sm ring-1 ring-surface-600">
          <div className="mt-2 flex justify-between">
            <span className="text-zinc-400">Timeline clips</span>
            <span className="text-white">{clips.length}</span>
          </div>
          {editorMode === 'video' && (
            <div className="mt-2 flex justify-between">
              <span className="text-zinc-400">Videos</span>
              <span className="text-white">{videoCount}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between">
            <span className="text-zinc-400">
              {editorMode === 'images' ? 'Images' : 'Images (replaced)'}
            </span>
            <span className="text-white">{imageCount}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-zinc-400">Transition overlap</span>
            <span className="text-white">{transitionSeconds.toFixed(1)}s</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-surface-600 pt-2">
            <span className="text-zinc-400">Total video length</span>
            <span className="font-medium text-accent-hover">{formatTime(totalDuration)}</span>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Edit each clip&apos;s duration on the timeline strip below the preview.
          </p>
        </div>
      )}
    </div>
  )
}
