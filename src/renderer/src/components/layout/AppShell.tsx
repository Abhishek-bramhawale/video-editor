import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MainPanel } from './MainPanel'

export function AppShell(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainPanel />
      </div>
    </div>
  )
}
