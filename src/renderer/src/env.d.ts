import { ElectronAPI } from '@electron-toolkit/preload'
import type { AppApi } from '../../preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppApi
  }
}
