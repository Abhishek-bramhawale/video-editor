import { nativeImage } from 'electron'
import { mkdtemp, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { basename, extname, join } from 'path'
import { spawn } from 'child_process'
import type { VideoFormat, VideoMetadata } from '../../shared/types'
import { SUPPORTED_VIDEO_EXTENSIONS } from '../../shared/types'

function parseVideoFormat(ext: string): VideoFormat | null {
  const normalized = ext.toLowerCase().replace('.', '')
  if (normalized === 'mp4' || normalized === 'mov' || normalized === 'webm' || normalized === 'mkv') {
    return normalized as VideoFormat
  }
  return null
}

export function isVideoFile(filePath: string): boolean {
  return SUPPORTED_VIDEO_EXTENSIONS.includes(
    extname(filePath).toLowerCase() as (typeof SUPPORTED_VIDEO_EXTENSIONS)[number]
  )
}

function runFfprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.slice(-400) || 'ffprobe failed'))
      else resolve(stdout.trim())
    })
    proc.on('error', reject)
  })
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { windowsHide: true })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.slice(-400) || 'ffmpeg failed'))
      else resolve()
    })
    proc.on('error', reject)
  })
}

async function getVideoProbeInfo(filePath: string): Promise<{
  durationSeconds: number
  width: number
  height: number
}> {
  const [durationOut, sizeOut] = await Promise.all([
    runFfprobe([
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]),
    runFfprobe([
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'csv=p=0:s=x',
      filePath
    ])
  ])

  const durationSeconds = Math.max(0.1, parseFloat(durationOut) || 0.1)
  const [wStr, hStr] = sizeOut.split('x')
  const width = parseInt(wStr, 10) || 1920
  const height = parseInt(hStr, 10) || 1080
  return { durationSeconds, width, height }
}

async function extractVideoThumbnail(filePath: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cs-thumb-'))
  const outPath = join(dir, 'frame.jpg')
  try {
    await runFfmpeg([
      '-y', '-ss', '0', '-i', filePath,
      '-frames:v', '1',
      '-q:v', '3',
      outPath
    ])
    const buffer = await readFile(outPath)
    const image = nativeImage.createFromBuffer(buffer)
    const size = image.getSize()
    const maxSide = 1600
    const w = size.width || 1920
    const h = size.height || 1080
    const scale = Math.min(1, maxSide / Math.max(w, h))
    const thumbW = Math.max(320, Math.round(w * scale))
    const thumbH = Math.max(180, Math.round(h * scale))
    const thumbnail = image.resize({ width: thumbW, height: thumbH, quality: 'good' })
    return thumbnail.toDataURL()
  } finally {
    await unlink(outPath).catch(() => {})
  }
}

export async function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  const ext = extname(filePath)
  const format = parseVideoFormat(ext)
  if (!format) throw new Error(`Unsupported video format: ${ext}`)

  const [{ durationSeconds, width, height }, thumbnailUrl] = await Promise.all([
    getVideoProbeInfo(filePath),
    extractVideoThumbnail(filePath)
  ])

  return {
    filePath,
    fileName: basename(filePath),
    format,
    width,
    height,
    durationSeconds,
    thumbnailUrl
  }
}
