import { useProjectStore } from '@renderer/stores/projectStore'
import { NAV_ITEMS } from './navItems'

export function Sidebar(): React.JSX.Element {
  const activePanel = useProjectStore((s) => s.activePanel)
  const setActivePanel = useProjectStore((s) => s.setActivePanel)
  const imageCount = useProjectStore((s) => s.images.length)

  return (
    <aside className="flex w-56 flex-col border-r border-surface-600 bg-surface-800">
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = activePanel === item.id
          const badge =
            item.id === 'images' && imageCount > 0 ? imageCount : null

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePanel(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent-hover'
                  : 'text-zinc-400 hover:bg-surface-700 hover:text-zinc-200'
              }`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {badge !== null && (
                <span className="rounded-full bg-surface-600 px-2 py-0.5 text-xs text-zinc-300">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
