import { useCallback } from 'react'
import { ResizeHandle } from './ResizeHandle'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { MainPanel } from './MainPanel'
import { PreviewWorkspace } from '@renderer/components/preview/PreviewWorkspace'
import { useUiStore } from '@renderer/stores/uiStore'
import { useProjectStore } from '@renderer/stores/projectStore'
import { useUILayoutSync } from '@renderer/hooks/useUILayoutSync'
import { useUndoKeyboard } from '@renderer/hooks/useUndoKeyboard'
import {
  clampPreviewSectionHeight,
  MIN_MAIN_PANEL_HEIGHT
} from '@renderer/lib/layout/bounds'

export function AppShell(): React.JSX.Element {
  useUILayoutSync()
  const undo = useProjectStore((s) => s.undo)
  useUndoKeyboard(undo)

  const previewHeight = useUiStore((s) => s.previewHeight)
  const setPreviewHeight = useUiStore((s) => s.setPreviewHeight)
  const effectivePreviewHeight = clampPreviewSectionHeight(previewHeight)

  const onResizePreview = useCallback(
    (deltaY: number) => {
      setPreviewHeight(effectivePreviewHeight + deltaY)
    },
    [effectivePreviewHeight, setPreviewHeight]
  )

  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex shrink-0 flex-col overflow-hidden"
          style={{ height: effectivePreviewHeight }}
        >
          <PreviewWorkspace />
        </div>
        <ResizeHandle onResize={onResizePreview} />
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ minHeight: MIN_MAIN_PANEL_HEIGHT }}
        >
          <MainPanel />
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
