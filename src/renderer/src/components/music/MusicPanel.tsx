import { useProjectStore, useTimelineTotalDuration } from '@renderer/stores/projectStore'
import { DEFAULT_AUDIO_FADE_SECONDS } from '@renderer/types'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MusicPanel(): React.JSX.Element {
  const audio = useProjectStore((s) => s.audio)
  const setAudio = useProjectStore((s) => s.setAudio)
  const timelineDuration = useTimelineTotalDuration()

  const selectAudio = async (): Promise<void> => {
    const path = await window.slideshow.selectAudio()
    if (!path) return
    const meta = await window.slideshow.getAudioMetadata(path)
    setAudio({
      id: crypto.randomUUID(),
      filePath: meta.filePath,
      fileName: meta.fileName,
      format: meta.format as 'mp3' | 'wav' | 'm4a',
      durationSeconds: meta.durationSeconds,
      fadeInSeconds: DEFAULT_AUDIO_FADE_SECONDS,
      fadeOutSeconds: DEFAULT_AUDIO_FADE_SECONDS
    })
  }

  const removeAudio = (): void => setAudio(null)

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Background Music</h2>
          <p className="text-sm text-zinc-400">
            MP3, WAV, or M4A — trimmed to timeline length (never shortens your clips)
          </p>
        </div>
        <button
          type="button"
          onClick={selectAudio}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          {audio ? 'Replace Audio' : 'Add Audio'}
        </button>
      </div>

      {audio ? (
        <div className="max-w-lg rounded-xl bg-surface-800 p-5 ring-1 ring-surface-600">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-accent">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.007.336a2.25 2.25 0 0 1-2.663-2.872l.336-1.007A2.25 2.25 0 0 1 9.75 12.75v-3.75m0 0 10.5-3v6.553" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">{audio.fileName}</p>
                <p className="text-sm text-zinc-400">
                  {formatTime(audio.durationSeconds)} · {audio.format.toUpperCase()}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeAudio}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="mt-4 space-y-2 border-t border-surface-600 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Timeline length</span>
              <span className="text-white">{formatTime(timelineDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Music trimmed to</span>
              <span className="text-white">{formatTime(timelineDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Fade in</span>
              <span className="text-white">{audio.fadeInSeconds}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Fade out</span>
              <span className="text-white">{audio.fadeOutSeconds}s</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-600 p-12 text-center">
          <svg className="mb-3 h-10 w-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.007.336a2.25 2.25 0 0 1-2.663-2.872l.336-1.007A2.25 2.25 0 0 1 9.75 12.75v-3.75m0 0 10.5-3v6.553" />
          </svg>
          <p className="text-sm text-zinc-400">No audio added. Music is optional.</p>
        </div>
      )}
    </div>
  )
}
