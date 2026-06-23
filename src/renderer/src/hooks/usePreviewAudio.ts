import { useEffect, useRef } from 'react'
import type { AudioTrack } from '@renderer/types'
import { pathToFileURL } from '@renderer/lib/media/fileUrl'

export function usePreviewAudio(
  isPlaying: boolean,
  currentTime: number,
  audio: AudioTrack | null
): React.RefObject<HTMLAudioElement | null> {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const el = audioRef.current
    if (!el || !audio) return
    el.src = pathToFileURL(audio.filePath)
    el.load()
  }, [audio?.filePath])

  useEffect(() => {
    const el = audioRef.current
    if (!el || !audio) return

    const offset = audio.startOffsetSeconds ?? 0
    const target = offset + currentTime
    const maxTime = audio.durationSeconds
    const safeTarget = Math.max(0, Math.min(maxTime, target))

    if (Math.abs(el.currentTime - safeTarget) > 0.12) {
      try {
        el.currentTime = safeTarget
      } catch {
        // ignore seek before metadata
      }
    }
  }, [currentTime, audio])

  useEffect(() => {
    const el = audioRef.current
    if (!el || !audio) return

    if (isPlaying) {
      void el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [isPlaying, audio])

  return audioRef
}
