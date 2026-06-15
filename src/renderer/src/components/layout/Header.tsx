import { useProjectStore } from '@renderer/stores/projectStore'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Header(): React.JSX.Element {
  const projectName = useProjectStore((s) => s.projectName)
  const isDirty = useProjectStore((s) => s.isDirty)
  const imageCount = useProjectStore((s) => s.images.length)
  const targetDurationSeconds = useProjectStore((s) => s.targetDurationSeconds)

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

      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <span>
          {imageCount} image{imageCount !== 1 ? 's' : ''}
        </span>
        <span className="h-3 w-px bg-surface-600" />
        <span>Target: {formatDuration(targetDurationSeconds)}</span>
        <span className="h-3 w-px bg-surface-600" />
        <span className="capitalize">{window.api?.platform ?? 'desktop'}</span>
      </div>
    </header>
  )
}
