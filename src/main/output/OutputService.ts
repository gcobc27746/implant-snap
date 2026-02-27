import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { ParsedData } from '../ocr/types'
import { AppError, ErrorCode } from '../errors/AppError'

export type OutputResult = {
  filePath: string
  sidecarPath: string | null
}

export class OutputService {
  /**
   * Write the final image (and optional sidecar JSON) to disk.
   * Uses an atomic write: temp file → rename.
   */
  async save(
    imageBuffer: Buffer,
    data: ParsedData,
    outputDir: string,
    sidecarEnabled: boolean
  ): Promise<OutputResult> {
    const dir = outputDir.trim() || join(app.getPath('desktop'), 'ScreenshotOutput')

    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (e) {
      throw new AppError(
        ErrorCode.WRITE_FAILED,
        `無法建立輸出目錄 "${dir}": ${(e as Error).message}`,
        e
      )
    }

    const filename = this.generateFilename(data)
    const uniqueFilename = await this.getUniqueFilename(dir, filename)
    const filePath = join(dir, uniqueFilename)
    const tempPath = `${filePath}.tmp`

    try {
      await fs.writeFile(tempPath, imageBuffer)
      await fs.rename(tempPath, filePath)
    } catch (e) {
      // Clean up temp file on failure
      await fs.unlink(tempPath).catch(() => undefined)
      throw new AppError(
        ErrorCode.WRITE_FAILED,
        `無法寫入檔案 "${filePath}": ${(e as Error).message}`,
        e
      )
    }

    let sidecarPath: string | null = null
    if (sidecarEnabled) {
      sidecarPath = filePath.replace(/\.png$/i, '.json')
      const sidecarData = {
        timestamp: new Date().toISOString(),
        tooth: data.tooth,
        diameter: data.diameter,
        length: data.length
      }
      try {
        await fs.writeFile(sidecarPath, JSON.stringify(sidecarData, null, 2), 'utf-8')
      } catch (e) {
        // Sidecar failure is non-fatal — log and continue
        console.warn(`[OutputService] Sidecar JSON 寫入失敗: ${(e as Error).message}`)
        sidecarPath = null
      }
    }

    return { filePath, sidecarPath }
  }

  private generateFilename(data: ParsedData): string {
    const now = new Date()
    const YYYY = now.getFullYear()
    const MM = String(now.getMonth() + 1).padStart(2, '0')
    const DD = String(now.getDate()).padStart(2, '0')
    const HH = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const ts = `${YYYY}${MM}${DD}_${HH}${mm}${ss}`

    const tooth = data.tooth ?? 'unknown'
    const diameter = data.diameter ?? '?'
    const length = data.length ?? '?'

    return `${ts}_tooth${tooth}_${diameter}x${length}.png`
  }

  private async getUniqueFilename(dir: string, filename: string): Promise<string> {
    const base = filename.replace(/\.png$/i, '')
    let candidate = filename
    let i = 1
    for (;;) {
      const fullPath = join(dir, candidate)
      const exists = await fs.access(fullPath).then(() => true).catch(() => false)
      if (!exists) return candidate
      candidate = `${base}_${i}.png`
      i++
    }
  }
}
