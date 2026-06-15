import { dialog } from 'electron'
import { writeFile } from 'fs/promises'
import type { ProjectData } from '../../shared/types'

export async function saveProjectToFile(data: ProjectData): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    title: 'Save Project',
    filters: [{ name: 'Cinematic Slideshow Project', extensions: ['csproj'] }],
    defaultPath: `${data.name}.csproj`
  })

  if (result.canceled || !result.filePath) return null

  await writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
  return result.filePath
}

export async function openProjectFromFile(): Promise<{ data: ProjectData; filePath: string } | null> {
  const result = await dialog.showOpenDialog({
    title: 'Open Project',
    filters: [{ name: 'Cinematic Slideshow Project', extensions: ['csproj'] }],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) return null

  const filePath = result.filePaths[0]
  const { readProjectFile } = await import('../media/imageService')
  const raw = await readProjectFile(filePath)
  const data = JSON.parse(raw) as ProjectData
  return { data, filePath }
}
