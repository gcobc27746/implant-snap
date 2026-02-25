import { execFile } from 'node:child_process'
import { readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir, platform } from 'node:os'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import type { ImageBuffer, DisplayInfo } from './types'

export class CaptureService {
  async listDisplays(): Promise<DisplayInfo[]> {
    const screenshot = (await import('screenshot-desktop')).default
    const raw: Array<Record<string, unknown>> = await screenshot.listDisplays()
    return raw.map((d) => ({
      id: String(d.id ?? d.name ?? ''),
      name: String(d.name ?? d.id ?? ''),
      width: Number(d.width ?? 0),
      height: Number(d.height ?? 0)
    }))
  }

  async captureFullScreen(displayId?: string): Promise<ImageBuffer> {
    const buffer = platform() === 'linux'
      ? await this.captureLinux()
      : await this.captureWithLib(displayId)

    const metadata = await sharp(buffer).metadata()
    if (!metadata.width || !metadata.height) {
      throw new Error('無法讀取截圖尺寸資訊。')
    }

    return { buffer, size: { width: metadata.width, height: metadata.height } }
  }

  private async captureLinux(): Promise<Buffer> {
    const tmpPath = join(tmpdir(), `implantsnap-${randomUUID()}.png`)
    try {
      await new Promise<void>((resolve, reject) => {
        execFile('scrot', ['-F', tmpPath], (err) =>
          err ? reject(new Error(`scrot 截圖失敗: ${err.message}`)) : resolve()
        )
      })
      return await readFile(tmpPath)
    } finally {
      unlink(tmpPath).catch(() => {})
    }
  }

  private async captureWithLib(displayId?: string): Promise<Buffer> {
    const screenshot = (await import('screenshot-desktop')).default
    const opts: Record<string, unknown> = { format: 'png' }
    if (displayId) {
      opts.screen = displayId
    }
    return await screenshot(opts)
  }
}
