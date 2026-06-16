import { useCallback, useState } from 'react'
import { ResizeHandle } from './ResizeHandle'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { MainPanel } from './MainPanel'
import { PreviewWorkspace } from '@renderer/components/preview/PreviewWorkspace'
import { useUiStore } from '@renderer/stores/uiStore'

export function AppShell(): React.JSX.Element {
  const previewHeight = useUiStore((s) => s.previewHeight)
  const setPreviewHeight = useUiStore((s) => s.setPreviewHeight)

  const onResizePreview = useCallback(
    (deltaY: number) => {
      setPreviewHeight(previewHeight + deltaY)
    },
    [previewHeight, setPreviewHeight]
  )

  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex shrink-0 flex-col overflow-hidden"
          style={{ height: previewHeight }}
        >
          <PreviewWorkspace />
        </div>
        <ResizeHandle onResize={onResizePreview} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <MainPanel />
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
