import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { MainPanel } from './MainPanel'
import { PreviewWorkspace } from '@renderer/components/preview/PreviewWorkspace'

export function AppShell(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Large fixed preview area for 16:9 editing */}
        <div className="flex flex-none flex-col overflow-hidden h-[48vh] min-h-[360px]">
          <PreviewWorkspace />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <MainPanel />
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
