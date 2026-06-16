import { useProjectStore } from '@renderer/stores/projectStore'
import { ImageUploadPanel } from '@renderer/components/upload/ImageUploadPanel'
import { DurationPanel } from '@renderer/components/duration/DurationPanel'
import { MusicPanel } from '@renderer/components/music/MusicPanel'
import { ExportPanel } from '@renderer/components/export/ExportPanel'

export function MainPanel(): React.JSX.Element {
  const activePanel = useProjectStore((s) => s.activePanel)

  return (
    <div className="h-full overflow-y-auto bg-surface-900">
      {activePanel === 'images' && <ImageUploadPanel />}
      {activePanel === 'duration' && <DurationPanel />}
      {activePanel === 'music' && <MusicPanel />}
      {activePanel === 'export' && <ExportPanel />}
    </div>
  )
}
