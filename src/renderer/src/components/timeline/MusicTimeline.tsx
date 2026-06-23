import { useCallback, useEffect, useRef, useState } from 'react'
import { slicePeaksForWindow } from '@renderer/lib/audio/decodeWaveform'
import { useAudioWaveform } from '@renderer/hooks/useAudioWaveform'
import { useProjectStore } from '@renderer/stores/projectStore'
import { useUiStore } from '@renderer/stores/uiStore'

interface MusicTimelineProps {
  currentTime: number
  totalDuration: number
  onSeek: (time: number) => void
  stripScrollRef?: React.RefObject<HTMLDivElement | null>
  onStripScroll?: (scrollLeft: number) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MusicTimeline({
  currentTime,
  totalDuration,
  onSeek,
  stripScrollRef,
  onStripScroll
}: MusicTimelineProps): React.JSX.Element | null {
  const audio = useProjectStore((s) => s.audio)
  const setAudioStartOffset = useProjectStore((s) => s.setAudioStartOffset)
  const pixelsPerSecond = useUiStore((s) => s.timelinePixelsPerSecond)
  const adjustTimelinePixelsPerSecond = useUiStore((s) => s.adjustTimelinePixelsPerSecond)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ startX: number; startOffset: number; moved: boolean } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const { peaks, loading, error } = useAudioWaveform(audio?.filePath)

  const stripWidth = Math.max(1, Math.round(totalDuration * pixelsPerSecond))
  const startOffset = audio?.startOffsetSeconds ?? 0
  const maxOffset =
    audio && totalDuration > 0
      ? Math.max(0, audio.durationSeconds - totalDuration)
      : 0

  useEffect(() => {
    if (!audio || totalDuration <= 0) return
    if (startOffset > maxOffset) {
      setAudioStartOffset(maxOffset)
    }
  }, [audio, maxOffset, startOffset, setAudioStartOffset, totalDuration])

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !audio || !peaks || totalDuration <= 0) return

    const dpr = window.devicePixelRatio || 1
    const width = stripWidth
    const height = 44
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const segment = slicePeaksForWindow(
      peaks,
      audio.durationSeconds,
      startOffset,
      totalDuration,
      width
    )
    const maxPeak = Math.max(...segment, 0.001)
    const midY = height / 2

    ctx.fillStyle = '#1f1f28'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < segment.length; x++) {
      const amp = (segment[x] / maxPeak) * (height * 0.42)
      if (x === 0) ctx.moveTo(x, midY - amp)
      else ctx.lineTo(x, midY - amp)
    }
    for (let x = segment.length - 1; x >= 0; x--) {
      const amp = (segment[x] / maxPeak) * (height * 0.42)
      ctx.lineTo(x, midY + amp)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(99, 102, 241, 0.45)'
    ctx.fill()
    ctx.stroke()

    const playheadX = Math.max(0, Math.min(width, currentTime * pixelsPerSecond))
    ctx.strokeStyle = '#f472b6'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, height)
    ctx.stroke()
  }, [audio, currentTime, peaks, pixelsPerSecond, startOffset, stripWidth, totalDuration])

  useEffect(() => {
    drawWaveform()
  }, [drawWaveform])

  const onWheelZoom = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      adjustTimelinePixelsPerSecond(e.deltaY < 0 ? 1 : -1)
    },
    [adjustTimelinePixelsPerSecond]
  )

  const timeFromClientX = useCallback(
    (clientX: number, container: HTMLElement): number => {
      const rect = container.getBoundingClientRect()
      const x = clientX - rect.left + container.scrollLeft
      return Math.max(0, Math.min(totalDuration, x / pixelsPerSecond))
    },
    [pixelsPerSecond, totalDuration]
  )

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!audio) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startOffset, moved: false }
    setIsDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragRef.current || !audio) return
    const deltaX = e.clientX - dragRef.current.startX
    if (Math.abs(deltaX) > 3) dragRef.current.moved = true
    const deltaSeconds = deltaX / pixelsPerSecond
    setAudioStartOffset(dragRef.current.startOffset + deltaSeconds)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragRef.current) return
    if (!dragRef.current.moved) {
      onSeek(timeFromClientX(e.clientX, e.currentTarget))
    }
    dragRef.current = null
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  if (!audio) return null

  return (
    <div className="shrink-0 border-t border-surface-600 bg-surface-900 px-4 py-2">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span className="truncate font-medium text-zinc-300" title={audio.fileName}>
          ♪ {audio.fileName}
        </span>
        <span className="shrink-0">
          {loading && 'Loading waveform…'}
          {error && 'Waveform unavailable'}
          {!loading && !error && (
            <>Start {formatTime(startOffset)} · Drag to move · Click to seek</>
          )}
        </span>
      </div>
      <div
        ref={stripScrollRef}
        className={`overflow-x-auto rounded-lg ring-1 ring-surface-600 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={onWheelZoom}
        onScroll={(e) => onStripScroll?.(e.currentTarget.scrollLeft)}
      >
        <div
          style={{ width: stripWidth }}
          className="relative select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          title="Drag to change music start position"
        >
          <canvas ref={canvasRef} className="block w-full" />
        </div>
      </div>
    </div>
  )
}
