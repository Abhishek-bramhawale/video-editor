import { dialog } from 'electron'
import { writeFile } from 'fs/promises'
import type { ProjectData } from '../../shared/types'
import { migrateProjectData } from '../../shared/lib/projectMigrate'
import { readProjectFile } from '../media/imageService'

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
  const raw = await readProjectFile(filePath)
  const parsed = JSON.parse(raw) as unknown
  const data = migrateProjectData(parsed)
  return { data, filePath }
}
