import { useProjectStore, useTimelineTotalDuration } from '@renderer/stores/projectStore'
import { useProjectIO } from '@renderer/hooks/useProjectIO'
import { useUiStore } from '@renderer/stores/uiStore'
import { EditorModeSwitcher } from '@renderer/components/layout/EditorModeSwitcher'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Header(): React.JSX.Element {
  const projectName = useProjectStore((s) => s.projectName)
  const isDirty = useProjectStore((s) => s.isDirty)
  const clipCount = useProjectStore((s) => s.clips.length)
  const totalDuration = useTimelineTotalDuration()
  const { saveProject, openProject, newProject } = useProjectIO()
  const resetLayout = useUiStore((s) => s.resetLayout)

  return (
    <header className="flex items-center justify-between border-b border-surface-600 bg-surface-800 px-5 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
          CS
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">
            {projectName}
            {isDirty && <span className="ml-1 text-accent">•</span>}
          </h1>
          <p className="text-xs text-zinc-500">Cinematic Slideshow</p>
        </div>
      </div>

      <EditorModeSwitcher />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={resetLayout}
          className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-surface-700 hover:text-zinc-200"
          title="Reset panel sizes to default"
        >
          Reset layout
        </button>
        <button
          type="button"
          onClick={newProject}
          className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-surface-700 hover:text-zinc-200"
        >
          New
        </button>
        <button
          type="button"
          onClick={openProject}
          className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-surface-700 hover:text-zinc-200"
        >
          Open
        </button>
        <button
          type="button"
          onClick={saveProject}
          className="rounded-lg bg-surface-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-surface-600"
        >
          Save
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <span>
          {clipCount} clip{clipCount !== 1 ? 's' : ''}
        </span>
        <span className="h-3 w-px bg-surface-600" />
        <span>Length: {formatDuration(totalDuration)}</span>
      </div>
    </header>
  )
}
