import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { ExportRequest, ProjectData, RenderProgress } from '../../shared/types'
import { checkFfmpeg, renderSlideshow } from '../ffmpeg/renderer'
import { getAudioMetadata, getImageMetadata, isAudioFile, isImageFile } from '../media/imageService'
import { getVideoMetadata, isVideoFile } from '../media/videoService'
import { openProjectFromFile, saveProjectToFile } from '../project/projectService'

function sendProgress(window: BrowserWindow | null, progress: RenderProgress): void {
  window?.webContents.send('export:progress', progress)
}

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('ffmpeg:check', () => checkFfmpeg())

  ipcMain.handle('dialog:selectVideos', async () => {
    const result = await dialog.showOpenDialog(getWindow() ?? undefined, {
      title: 'Select Videos',
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'webm', 'mkv'] }],
      properties: ['openFile', 'multiSelections']
    })
    if (result.canceled) return []
    return result.filePaths.filter(isVideoFile)
  })

  ipcMain.handle('dialog:selectImages', async () => {
    const result = await dialog.showOpenDialog(getWindow() ?? undefined, {
      title: 'Select Images',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      properties: ['openFile', 'multiSelections']
    })
    if (result.canceled) return []
    return result.filePaths.filter(isImageFile)
  })

  ipcMain.handle('dialog:selectMedia', async () => {
    const result = await dialog.showOpenDialog(getWindow() ?? undefined, {
      title: 'Select Images or Videos',
      filters: [
        {
          name: 'Images & Videos',
          extensions: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm', 'mkv']
        }
      ],
      properties: ['openFile', 'multiSelections']
    })
    if (result.canceled) return []
    return result.filePaths.filter((p) => isImageFile(p) || isVideoFile(p))
  })

  ipcMain.handle('dialog:selectAudio', async () => {
    const result = await dialog.showOpenDialog(getWindow() ?? undefined, {
      title: 'Select Audio',
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'mpeg'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const path = result.filePaths.find(isAudioFile)
    return path ?? null
  })

  ipcMain.handle('dialog:selectExportPath', async (_e, defaultName: string) => {
    const result = await dialog.showSaveDialog(getWindow() ?? undefined, {
      title: 'Export Video',
      defaultPath: defaultName,
      filters: [
        { name: 'MP4 Video', extensions: ['mp4'] },
        { name: 'MOV Video', extensions: ['mov'] }
      ]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle('media:getVideoMetadata', async (_e, filePath: string) => {
    return getVideoMetadata(filePath)
  })

  ipcMain.handle('media:getImageMetadata', async (_e, filePath: string) => {
    return getImageMetadata(filePath)
  })

  ipcMain.handle('media:getAudioMetadata', async (_e, filePath: string) => {
    return getAudioMetadata(filePath)
  })

  ipcMain.handle('project:save', async (_e, data: ProjectData) => {
    return saveProjectToFile(data)
  })

  ipcMain.handle('project:open', async () => {
    return openProjectFromFile()
  })

  ipcMain.handle('export:render', async (_e, request: ExportRequest) => {
    const window = getWindow()
    try {
      await renderSlideshow(request, (progress) => sendProgress(window, progress))
      return { success: true, outputPath: request.outputPath }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed'
      return { success: false, error: message }
    }
  })
}
