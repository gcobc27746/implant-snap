import { execFile } from 'node:child_process'
import { readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import type { ImageBuffer } from './types'

export class CaptureService {
  async captureFullScreen(): Promise<ImageBuffer> {
    const tmpPath = join(tmpdir(), `implantsnap-${randomUUID()}.png`)

    try {
      await this.runScrot(tmpPath)
      const buffer = await readFile(tmpPath)
      const metadata = await sharp(buffer).metadata()

      if (!metadata.width || !metadata.height) {
        throw new Error('無法讀取截圖尺寸資訊。')
      }

      return {
        buffer,
        size: { width: metadata.width, height: metadata.height }
      }
    } finally {
      unlink(tmpPath).catch(() => {})
    }
  }

  private runScrot(outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile('scrot', ['-F', outputPath], (error) => {
        if (error) {
          reject(new Error(`scrot 截圖失敗: ${error.message}`))
        } else {
          resolve()
        }
      })
    })
  }
}
