import { ElectronAPI } from '@electron-toolkit/preload'
import type { SlideshowApi } from '../../preload'

declare global {
  interface Window {
    electron: ElectronAPI
    slideshow: SlideshowApi
  }
}
