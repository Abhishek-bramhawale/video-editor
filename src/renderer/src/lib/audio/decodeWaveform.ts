import { pathToFileURL } from '@renderer/lib/media/fileUrl'

const peakCache = new Map<string, number[]>()

export async function decodeAudioPeaks(filePath: string, sampleCount = 1200): Promise<number[]> {
  const cached = peakCache.get(filePath)
  if (cached) return cached

  const response = await fetch(pathToFileURL(filePath))
  const arrayBuffer = await response.arrayBuffer()
  const audioContext = new AudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    const channel = audioBuffer.getChannelData(0)
    const blockSize = Math.max(1, Math.floor(channel.length / sampleCount))
    const peaks: number[] = []

    for (let i = 0; i < sampleCount; i++) {
      const start = i * blockSize
      const end = Math.min(channel.length, start + blockSize)
      let max = 0
      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(channel[j]))
      }
      peaks.push(max)
    }

    peakCache.set(filePath, peaks)
    return peaks
  } finally {
    await audioContext.close()
  }
}

export function slicePeaksForWindow(
  peaks: number[],
  sourceDurationSeconds: number,
  startOffsetSeconds: number,
  windowSeconds: number,
  targetSamples: number
): number[] {
  if (peaks.length === 0 || sourceDurationSeconds <= 0 || windowSeconds <= 0) return []

  const startRatio = Math.max(0, startOffsetSeconds / sourceDurationSeconds)
  const endRatio = Math.min(1, (startOffsetSeconds + windowSeconds) / sourceDurationSeconds)
  const startIdx = Math.floor(startRatio * peaks.length)
  const endIdx = Math.max(startIdx + 1, Math.ceil(endRatio * peaks.length))
  const slice = peaks.slice(startIdx, endIdx)
  if (slice.length === 0) return []

  const result: number[] = []
  for (let i = 0; i < targetSamples; i++) {
    const t = i / Math.max(1, targetSamples - 1)
    const srcIdx = Math.min(slice.length - 1, Math.floor(t * (slice.length - 1)))
    result.push(slice[srcIdx] ?? 0)
  }
  return result
}
