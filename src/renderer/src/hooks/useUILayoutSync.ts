import { useLayoutEffect } from 'react'
import { useUiStore } from '@renderer/stores/uiStore'
import {
  clampPreviewSectionHeight,
  clampTimelineHeight,
  clampImageThumbMin
} from '@renderer/lib/layout/bounds'

function syncLayoutSizes(): void {
  const state = useUiStore.getState()
  const previewHeight = clampPreviewSectionHeight(state.previewHeight)
  const timelineHeight = clampTimelineHeight(state.timelineHeight, previewHeight)
  const imageThumbMin = clampImageThumbMin(state.imageThumbMin)

  if (previewHeight !== state.previewHeight) state.setPreviewHeight(previewHeight)
  if (timelineHeight !== state.timelineHeight) state.setTimelineHeight(timelineHeight)
  if (imageThumbMin !== state.imageThumbMin) state.setImageThumbMin(imageThumbMin)
}

/** Keeps persisted panel sizes within viewport bounds on load and resize. */
export function useUILayoutSync(): void {
  useLayoutEffect(() => {
    syncLayoutSizes()
    window.addEventListener('resize', syncLayoutSizes)
    return () => window.removeEventListener('resize', syncLayoutSizes)
  }, [])
}
