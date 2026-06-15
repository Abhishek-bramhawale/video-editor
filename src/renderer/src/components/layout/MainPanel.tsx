import { useProjectStore } from '@renderer/stores/projectStore'
import type { AppPanel } from '@renderer/types'

function PanelPlaceholder({
  title,
  description
}: {
  title: string
  description: string
}): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-700 ring-1 ring-surface-600">
        <svg
          className="h-8 w-8 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      </div>
      <h2 className="mb-2 text-lg font-semibold text-white">{title}</h2>
      <p className="max-w-sm text-sm text-zinc-400">{description}</p>
    </div>
  )
}

const PANEL_CONTENT: Record<AppPanel, { title: string; description: string }> = {
  images: {
    title: 'Image Upload',
    description:
      'Drag and drop images or browse to select hundreds of photos. Reorder thumbnails to set playback sequence.'
  },
  duration: {
    title: 'Target Duration',
    description:
      'Set your desired video length. Duration per image is calculated automatically.'
  },
  music: {
    title: 'Background Music',
    description:
      'Add MP3, WAV, or M4A audio. Music will be trimmed and faded to match video length.'
  },
  preview: {
    title: 'Timeline Preview',
    description:
      'Play, pause, seek, and scrub through your slideshow before exporting.'
  },
  export: {
    title: 'Export Video',
    description:
      'Render to MP4 (H.264/H.265) or MOV at 720p or 1080p using FFmpeg.'
  }
}

export function MainPanel(): React.JSX.Element {
  const activePanel = useProjectStore((s) => s.activePanel)
  const content = PANEL_CONTENT[activePanel]

  return (
    <div className="flex-1 overflow-auto bg-surface-900">
      <PanelPlaceholder title={content.title} description={content.description} />
    </div>
  )
}
