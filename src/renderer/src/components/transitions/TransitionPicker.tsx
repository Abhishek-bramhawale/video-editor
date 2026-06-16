import { useEffect, useRef } from 'react'
import { TRANSITION_EFFECTS } from '@renderer/lib/transitions'
import type { TransitionId } from '@renderer/types'

interface TransitionPickerProps {
  open: boolean
  x: number
  y: number
  currentId: TransitionId | null
  onSelect: (id: TransitionId) => void
  onClose: () => void
}

export function TransitionPicker({
  open,
  x,
  y,
  currentId,
  onSelect,
  onClose
}: TransitionPickerProps): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const left = Math.min(x, window.innerWidth - 320)
  const top = Math.min(y, window.innerHeight - 420)

  return (
    <div className="fixed inset-0 z-50">
      <div
        ref={ref}
        className="absolute max-h-96 w-80 overflow-y-auto rounded-xl border border-surface-600 bg-surface-800 p-2 shadow-2xl"
        style={{ left, top }}
      >
        <p className="mb-2 px-2 text-xs font-semibold text-zinc-300">Choose transition</p>
        <div className="grid gap-1">
          {TRANSITION_EFFECTS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                currentId === t.id
                  ? 'bg-accent/20 text-accent-hover'
                  : 'text-zinc-300 hover:bg-surface-700'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
