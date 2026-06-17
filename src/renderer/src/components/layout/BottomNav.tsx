import { useProjectStore } from '@renderer/stores/projectStore'
import { NAV_ITEMS } from './navItems'

export function BottomNav(): React.JSX.Element {
  const activePanel = useProjectStore((s) => s.activePanel)
  const setActivePanel = useProjectStore((s) => s.setActivePanel)
  const clipCount = useProjectStore((s) => s.clips.length)

  return (
    <nav className="flex shrink-0 items-center justify-center gap-1 border-t border-surface-600 bg-surface-800 px-4 py-2">
      {NAV_ITEMS.map((item) => {
        const isActive = activePanel === item.id
        const badge = item.id === 'images' && clipCount > 0 ? clipCount : null

        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => setActivePanel(item.id)}
            className={`relative flex flex-col items-center gap-1 rounded-xl px-5 py-2 transition-colors ${
              isActive
                ? 'bg-accent/15 text-accent-hover'
                : 'text-zinc-400 hover:bg-surface-700 hover:text-zinc-200'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
            {badge !== null && (
              <span className="absolute right-2 top-1 rounded-full bg-accent px-1.5 text-[9px] font-semibold text-white">
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
