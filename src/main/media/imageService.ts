import { nativeImage } from 'electron'
import { readFile } from 'fs/promises'
import { basename, extname } from 'path'
import type { AudioFormat, ImageFormat, ImageMetadata } from '../../shared/types'
import { SUPPORTED_AUDIO_EXTENSIONS, SUPPORTED_IMAGE_EXTENSIONS } from '../../shared/types'

function parseImageFormat(ext: string): ImageFormat | null {
  const normalized = ext.toLowerCase().replace('.', '')
  if (normalized === 'jpg' || normalized === 'jpeg' || normalized === 'png' || normalized === 'webp') {
    return normalized as ImageFormat
  }
  return null
}

function parseAudioFormat(ext: string): AudioFormat | null {
  const normalized = ext.toLowerCase().replace('.', '')
  if (normalized === 'mp3' || normalized === 'wav' || normalized === 'm4a' || normalized === 'mpeg') {
    return normalized as AudioFormat
  }
  return null
}

export function isImageFile(filePath: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.includes(
    extname(filePath).toLowerCase() as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number]
  )
}

export function isAudioFile(filePath: string): boolean {
  return SUPPORTED_AUDIO_EXTENSIONS.includes(
    extname(filePath).toLowerCase() as (typeof SUPPORTED_AUDIO_EXTENSIONS)[number]
  )
}

export async function getImageMetadata(filePath: string): Promise<ImageMetadata> {
  const ext = extname(filePath)
  const format = parseImageFormat(ext)
  if (!format) throw new Error(`Unsupported image format: ${ext}`)

  const image = nativeImage.createFromPath(filePath)
  const size = image.getSize()
  // Used for timeline + preview. Keep it fairly large so preview doesn't look blurry.
  // (This is still much cheaper than decoding full-size in the renderer.)
  const maxSide = 1600
  const w = size.width || 1920
  const h = size.height || 1080
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const thumbW = Math.max(320, Math.round(w * scale))
  const thumbH = Math.max(180, Math.round(h * scale))
  const thumbnail = image.resize({ width: thumbW, height: thumbH, quality: 'good' })
  const thumbnailUrl = thumbnail.toDataURL()

  return {
    filePath,
    fileName: basename(filePath),
    format,
    width: size.width || 1920,
    height: size.height || 1080,
    thumbnailUrl
  }
}

export async function getAudioDuration(filePath: string): Promise<number> {
  const { spawn } = await import('child_process')
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ])
    let output = ''
    proc.stdout.on('data', (d) => { output += d.toString() })
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to read audio duration'))
        return
      }
      resolve(parseFloat(output.trim()) || 0)
    })
    proc.on('error', reject)
  })
}

export async function getAudioMetadata(filePath: string): Promise<{
  filePath: string
  fileName: string
  format: AudioFormat
  durationSeconds: number
}> {
  const ext = extname(filePath)
  const format = parseAudioFormat(ext)
  if (!format) throw new Error(`Unsupported audio format: ${ext}`)

  const durationSeconds = await getAudioDuration(filePath)
  return {
    filePath,
    fileName: basename(filePath),
    format,
    durationSeconds
  }
}

export async function readProjectFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath, 'utf-8')
  return buffer
}
