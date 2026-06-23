import type { EditorMode } from '@renderer/types'
import { useProjectStore } from '@renderer/stores/projectStore'

const MODES: { id: EditorMode; label: string; hint: string }[] = [
  { id: 'images', label: 'Images', hint: 'Image slideshow with effects & transitions' },
  { id: 'video', label: 'Video', hint: 'Video timeline with optional image replacement' }
]

export function EditorModeSwitcher(): React.JSX.Element {
  const editorMode = useProjectStore((s) => s.editorMode)
  const setEditorMode = useProjectStore((s) => s.setEditorMode)

  return (
    <div
      className="flex items-center rounded-lg bg-surface-900 p-0.5 ring-1 ring-surface-600"
      role="tablist"
      aria-label="Editor mode"
    >
      {MODES.map((mode) => {
        const active = editorMode === mode.id
        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={mode.hint}
            onClick={() => setEditorMode(mode.id)}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? 'bg-accent text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
