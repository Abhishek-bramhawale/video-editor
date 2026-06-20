import { spawn, type ChildProcess } from 'child_process'
import { randomBytes } from 'crypto'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import type { RenderProgress } from '../../shared/types'

/** Extract a readable error from FFmpeg stderr (skip noisy swscaler warnings). */
export function parseFfmpegError(stderr: string): string {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const errors = lines.filter(
    (l) =>
      /error|failed|invalid|cannot|no such|out of memory|too complex|exceeded|conversion failed/i.test(
        l
      ) && !/deprecated pixel format/i.test(l)
  )
  if (errors.length > 0) return errors.slice(-2).join(' — ')
  const meaningful = lines.filter(
    (l) =>
      !/deprecated pixel format/i.test(l) &&
      !/^Last message repeated/i.test(l) &&
      !/^\[swscaler/i.test(l)
  )
  return meaningful.slice(-4).join(' ') || stderr.slice(-500)
}

export async function writeFilterScript(workDir: string, filter: string): Promise<string> {
  const filterPath = join(workDir, `filter_${randomBytes(4).toString('hex')}.txt`)
  await writeFile(filterPath, filter, 'utf8')
  return filterPath
}

export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { windowsHide: true })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(parseFfmpegError(stderr) || `FFmpeg exited with code ${code}`))
    })
    proc.on('error', (err) => reject(err))
  })
}

export function runFfmpegWithProgress(
  args: string[],
  totalSeconds: number,
  onProgress: (progress: RenderProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { windowsHide: true })
    let stderr = ''
    let stdoutBuf = ''
    let lastPercent = -1

    proc.stderr.on('data', (d) => { stderr += d.toString() })

    proc.stdout?.on('data', (d) => {
      stdoutBuf += d.toString()
      let idx: number
      while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
        const line = stdoutBuf.slice(0, idx).trim()
        stdoutBuf = stdoutBuf.slice(idx + 1)
        const eq = line.indexOf('=')
        if (eq <= 0) continue
        const key = line.slice(0, eq)
        const value = line.slice(eq + 1)

        if (key === 'out_time_ms') {
          const outTimeMs = parseInt(value, 10)
          if (!Number.isFinite(outTimeMs) || totalSeconds <= 0) continue
          const pct = Math.max(0, Math.min(99, Math.floor((outTimeMs / 1_000_000 / totalSeconds) * 100)))
          if (pct !== lastPercent) {
            lastPercent = pct
            onProgress({
              stage: 'segments',
              current: 1,
              total: 1,
              message: `Encoding… ${pct}%`,
              percent: pct
            })
          }
        }
      }
    })

    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(parseFfmpegError(stderr) || `FFmpeg exited with code ${code}`))
    })
    proc.on('error', (err) => reject(err))
  })
}

export async function runFfmpegWithFilterScript(
  workDir: string,
  baseArgs: string[],
  filter: string,
  tailArgs: string[],
  totalSeconds?: number,
  onProgress?: (progress: RenderProgress) => void
): Promise<void> {
  const filterPath = await writeFilterScript(workDir, filter)
  const args = [...baseArgs, '-filter_complex_script', filterPath, ...tailArgs]
  if (totalSeconds != null && onProgress) {
    await runFfmpegWithProgress(args, totalSeconds, onProgress)
  } else {
    await runFfmpeg(args)
  }
}

/** Kill a running ffmpeg child (for future cancel support). */
export function killFfmpeg(proc: ChildProcess): void {
  proc.kill('SIGTERM')
}
