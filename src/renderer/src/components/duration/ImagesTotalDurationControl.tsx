import { useCallback, useEffect, useState } from 'react'
import { useProjectStore, useTimelineTotalDuration } from '@renderer/stores/projectStore'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ImagesTotalDurationControl({
  compact = false
}: {
  compact?: boolean
}): React.JSX.Element | null {
  const clips = useProjectStore((s) => s.clips)
  const transitionSeconds = useProjectStore((s) => s.transitionSeconds)
  const targetTotalDurationSeconds = useProjectStore((s) => s.targetTotalDurationSeconds)
  const setTargetTotalDuration = useProjectStore((s) => s.setTargetTotalDuration)
  const computedTotal = useTimelineTotalDuration()

  const displayTotal = targetTotalDurationSeconds ?? computedTotal
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) {
      setDraft(displayTotal > 0 ? displayTotal.toFixed(1) : '')
    }
  }, [displayTotal, focused])

  const commit = useCallback(() => {
    const parsed = parseFloat(draft)
    if (!Number.isFinite(parsed) || parsed <= 0 || clips.length === 0) {
      setDraft(displayTotal > 0 ? displayTotal.toFixed(1) : '')
      return
    }
    setTargetTotalDuration(parsed)
  }, [clips.length, displayTotal, draft, setTargetTotalDuration])

  if (clips.length === 0) return null

  const perImage = clips[0]?.durationSeconds ?? 0

  return (
    <div
      className={
        compact
          ? 'flex flex-wrap items-center gap-2'
          : 'mb-3 rounded-xl bg-surface-800 p-3 ring-1 ring-surface-600'
      }
    >
      {!compact && (
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-white">Total slideshow length</h3>
          <p className="text-xs text-zinc-500">
            Enter a target length — image hold times and transitions adjust automatically when you
            add or remove images.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0.1}
          step={0.5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            commit()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          className="w-24 rounded-lg border border-surface-600 bg-surface-700 px-2 py-1.5 text-center text-sm text-white"
          aria-label="Total slideshow length in seconds"
        />
        <span className="text-sm text-zinc-500">sec ({formatDuration(displayTotal)})</span>
        {targetTotalDurationSeconds != null && (
          <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-hover">
            locked
          </span>
        )}
      </div>
      {!compact && clips.length > 1 && (
        <p className="mt-2 text-xs text-zinc-500">
          {perImage.toFixed(1)}s per image · {transitionSeconds.toFixed(1)}s transition overlap
        </p>
      )}
    </div>
  )
}
