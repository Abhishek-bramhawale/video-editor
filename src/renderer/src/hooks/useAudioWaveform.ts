import { useEffect, useState } from 'react'
import { decodeAudioPeaks } from '@renderer/lib/audio/decodeWaveform'

export function useAudioWaveform(filePath: string | undefined): {
  peaks: number[] | null
  loading: boolean
  error: string | null
} {
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filePath) {
      setPeaks(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    decodeAudioPeaks(filePath)
      .then((data) => {
        if (!cancelled) {
          setPeaks(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to decode audio')
          setPeaks(null)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [filePath])

  return { peaks, loading, error }
}
