import { useLayoutEffect, useState } from 'react'

const ASPECT = 16 / 9

/** Fit a 16:9 box inside the measured container without stretching. */
export function useAspectFit16x9<T extends HTMLElement>(): {
  ref: (node: T | null) => void
  size: { width: number; height: number }
} {
  const [node, setNode] = useState<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    if (!node) return

    const update = (): void => {
      const cw = node.clientWidth
      const ch = node.clientHeight
      if (cw <= 0 || ch <= 0) return

      const containerRatio = cw / ch
      if (containerRatio > ASPECT) {
        setSize({ width: ch * ASPECT, height: ch })
      } else {
        setSize({ width: cw, height: cw / ASPECT })
      }
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [node])

  return { ref: setNode, size }
}
