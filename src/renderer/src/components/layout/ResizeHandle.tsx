import { useCallback, useEffect, useRef } from 'react'

interface ResizeHandleProps {
  onResize: (deltaY: number) => void
  className?: string
}

export function ResizeHandle({ onResize, className = '' }: ResizeHandleProps): React.JSX.Element {
  const dragging = useRef(false)
  const lastY = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    lastY.current = e.clientY
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => {
      if (!dragging.current) return
      const delta = e.clientY - lastY.current
      lastY.current = e.clientY
      onResize(delta)
    }

    const onMouseUp = (): void => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onResize])

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      onMouseDown={onMouseDown}
      className={`group flex h-2 shrink-0 cursor-row-resize items-center justify-center bg-surface-800 hover:bg-surface-700 ${className}`}
    >
      <div className="h-1 w-12 rounded-full bg-surface-600 group-hover:bg-accent/60" />
    </div>
  )
}
