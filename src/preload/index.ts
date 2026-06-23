import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  ExportRequest,
  ExportResult,
  ImageMetadata,
  ProjectData,
  RenderProgress,
  VideoMetadata
} from '../shared/types'

const slideshowApi = {
  platform: process.platform,

  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  checkFfmpeg: (): Promise<boolean> => ipcRenderer.invoke('ffmpeg:check'),

  selectVideos: (): Promise<string[]> => ipcRenderer.invoke('dialog:selectVideos'),

  selectImages: (): Promise<string[]> => ipcRenderer.invoke('dialog:selectImages'),

  selectMedia: (): Promise<string[]> => ipcRenderer.invoke('dialog:selectMedia'),

  selectAudio: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectAudio'),

  selectExportPath: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectExportPath', defaultName),

  getVideoMetadata: (filePath: string): Promise<VideoMetadata> =>
    ipcRenderer.invoke('media:getVideoMetadata', filePath),

  getImageMetadata: (filePath: string): Promise<ImageMetadata> =>
    ipcRenderer.invoke('media:getImageMetadata', filePath),

  getAudioMetadata: (filePath: string): Promise<{
    filePath: string
    fileName: string
    format: string
    durationSeconds: number
  }> => ipcRenderer.invoke('media:getAudioMetadata', filePath),

  saveProject: (data: ProjectData): Promise<string | null> =>
    ipcRenderer.invoke('project:save', data),

  openProject: (): Promise<{ data: ProjectData; filePath: string } | null> =>
    ipcRenderer.invoke('project:open'),

  exportVideo: (request: ExportRequest): Promise<ExportResult> =>
    ipcRenderer.invoke('export:render', request),

  onExportProgress: (callback: (progress: RenderProgress) => void): (() => void) => {
    const handler = (_: unknown, progress: RenderProgress): void => callback(progress)
    ipcRenderer.on('export:progress', handler)
    return () => ipcRenderer.removeListener('export:progress', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('slideshow', slideshowApi)
  } catch (error) {
    console.error(error)
  }
}

export type SlideshowApi = typeof slideshowApi
