export const MIN_PREVIEW_SECTION_HEIGHT = 180
export const MIN_TIMELINE_HEIGHT = 100
export const MIN_MAIN_PANEL_HEIGHT = 180
export const MIN_PREVIEW_PLAYER_HEIGHT = 120
export const RESIZE_HANDLE_HEIGHT = 8
/** Header + bottom nav (approximate) */
export const CHROME_HEIGHT = 112

export const DEFAULT_PREVIEW_HEIGHT = 360
export const DEFAULT_TIMELINE_HEIGHT = 200

export function getWorkspaceHeight(viewportHeight = window.innerHeight): number {
  return Math.max(0, viewportHeight - CHROME_HEIGHT)
}

export function getMaxPreviewSectionHeight(viewportHeight = window.innerHeight): number {
  const workspace = getWorkspaceHeight(viewportHeight)
  return Math.max(
    MIN_PREVIEW_SECTION_HEIGHT,
    workspace - MIN_MAIN_PANEL_HEIGHT - RESIZE_HANDLE_HEIGHT
  )
}

export function clampPreviewSectionHeight(
  height: number,
  viewportHeight = window.innerHeight
): number {
  const safeHeight = Number.isFinite(height) ? height : DEFAULT_PREVIEW_HEIGHT
  const max = getMaxPreviewSectionHeight(viewportHeight)
  return Math.max(MIN_PREVIEW_SECTION_HEIGHT, Math.min(max, safeHeight))
}

export function clampTimelineHeight(
  height: number,
  previewSectionHeight: number
): number {
  const safeHeight = Number.isFinite(height) ? height : DEFAULT_TIMELINE_HEIGHT
  const max = Math.max(
    MIN_TIMELINE_HEIGHT,
    previewSectionHeight - MIN_PREVIEW_PLAYER_HEIGHT - RESIZE_HANDLE_HEIGHT
  )
  return Math.max(MIN_TIMELINE_HEIGHT, Math.min(max, safeHeight))
}

export function clampImageThumbMin(size: number): number {
  const safeSize = Number.isFinite(size) ? size : 120
  return Math.max(72, Math.min(240, safeSize))
}
