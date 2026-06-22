import { useCallback } from 'react'
import { buildProjectData, useProjectStore } from '@renderer/stores/projectStore'

export function useProjectIO(): {
  saveProject: () => Promise<void>
  openProject: () => Promise<void>
  newProject: () => void
} {
  const loadProject = useProjectStore((s) => s.loadProject)
  const resetProject = useProjectStore((s) => s.resetProject)
  const markClean = useProjectStore((s) => s.markClean)

  const saveProject = useCallback(async () => {
    const data = buildProjectData()
    const path = await window.slideshow.saveProject(data)
    if (path) markClean()
  }, [markClean])

  const openProject = useCallback(async () => {
    const result = await window.slideshow.openProject()
    if (!result) return
    loadProject(result.data)
  }, [loadProject])

  const newProject = useCallback(() => {
    if (useProjectStore.getState().isDirty) {
      const confirmed = window.confirm('Discard unsaved changes?')
      if (!confirmed) return
    }
    resetProject()
  }, [resetProject])

  return { saveProject, openProject, newProject }
}
