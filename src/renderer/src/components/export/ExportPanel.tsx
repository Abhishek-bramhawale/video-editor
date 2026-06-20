import { useEffect, useState } from 'react'
import { buildExportProjectData, useProjectStore, useTimelineTotalDuration } from '@renderer/stores/projectStore'
import type { ExportCodec, ExportResolution, RenderProgress } from '@renderer/types'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ExportPanel(): React.JSX.Element {
  const clips = useProjectStore((s) => s.clips)
  const exportSettings = useProjectStore((s) => s.exportSettings)
  const setExportSettings = useProjectStore((s) => s.setExportSettings)
  const projectName = useProjectStore((s) => s.projectName)
  const totalDuration = useTimelineTotalDuration()

  const [ffmpegAvailable, setFfmpegAvailable] = useState<boolean | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<RenderProgress | null>(null)
  const [lastResult, setLastResult] = useState<{ success: boolean; path?: string; error?: string } | null>(null)

  useEffect(() => {
    window.slideshow.checkFfmpeg().then(setFfmpegAvailable)
  }, [])

  useEffect(() => {
    const unsub = window.slideshow.onExportProgress(setProgress)
    return unsub
  }, [])

  const handleExport = async (): Promise<void> => {
    if (clips.length === 0) return

    const ext = exportSettings.codec === 'mov' ? 'mov' : 'mp4'
    const outputPath = await window.slideshow.selectExportPath(`${projectName}.${ext}`)
    if (!outputPath) return

    setIsExporting(true)
    setLastResult(null)
    setProgress(null)

    const result = await window.slideshow.exportVideo({
      project: buildExportProjectData(),
      outputPath
    })

    setIsExporting(false)
    setLastResult(result)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <h2 className="mb-1 text-lg font-semibold text-white">Export Video</h2>
      <p className="mb-6 text-sm text-zinc-400">
        Large projects render clips in parallel, then blend transitions. Restart the app after updating.
      </p>

      {ffmpegAvailable === false && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/30">
          FFmpeg not found. Install FFmpeg and add it to your PATH to export videos.
        </div>
      )}

      <div className="max-w-lg space-y-5">
        <div>
          <label className="mb-2 block text-sm text-zinc-400">Codec</label>
          <div className="flex gap-2">
            {(['h264', 'h265', 'mov'] as ExportCodec[]).map((codec) => (
              <button
                key={codec}
                type="button"
                onClick={() => setExportSettings({ codec })}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  exportSettings.codec === codec
                    ? 'bg-accent text-white'
                    : 'bg-surface-700 text-zinc-300 hover:bg-surface-600'
                }`}
              >
                {codec === 'h264' ? 'MP4 H.264' : codec === 'h265' ? 'MP4 H.265' : 'MOV'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">Resolution</label>
          <div className="flex gap-2">
            {(['720p', '1080p'] as ExportResolution[]).map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => setExportSettings({ resolution: res })}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  exportSettings.resolution === res
                    ? 'bg-accent text-white'
                    : 'bg-surface-700 text-zinc-300 hover:bg-surface-600'
                }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-surface-800 p-4 ring-1 ring-surface-600 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Clips</span>
            <span className="text-white">{clips.length}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-zinc-400">Duration</span>
            <span className="text-white">{formatTime(totalDuration)}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-zinc-400">Frame rate</span>
            <span className="text-white">{exportSettings.fps} fps</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={clips.length === 0 || isExporting || ffmpegAvailable === false}
          className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? 'Exporting…' : 'Export Video'}
        </button>

        {isExporting && progress && (
          <div className="rounded-xl bg-surface-800 p-4 ring-1 ring-surface-600">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-zinc-300">{progress.message}</span>
              <span className="text-accent">{progress.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-700">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {lastResult && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              lastResult.success
                ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/30'
                : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
            }`}
          >
            {lastResult.success
              ? `Exported successfully to ${lastResult.path}`
              : `Export failed: ${lastResult.error}`}
          </div>
        )}
      </div>
    </div>
  )
}
