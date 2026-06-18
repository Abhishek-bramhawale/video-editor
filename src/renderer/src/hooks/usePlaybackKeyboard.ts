import { useEffect } from 'react'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

/** Spacebar + media play/pause keys toggle preview playback. */
export function usePlaybackKeyboard(toggle: () => void, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent): void => {
      if (isEditableTarget(e.target)) return

      const isSpace = e.code === 'Space' || e.key === ' '
      const isMediaPlayPause = e.code === 'MediaPlayPause'
      const isPlayKey = e.key === 'k' || e.key === 'K'

      if (isSpace || isMediaPlayPause || isPlayKey) {
        e.preventDefault()
        toggle()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggle, enabled])
}
