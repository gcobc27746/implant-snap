import { access, mkdir, rename, writeFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ParsedSnapshot } from '../../shared/pipeline-schema'

export type OutputWriteInput = {
  imageBuffer: Buffer
  parsed: ParsedSnapshot
  outputDir: string
  sidecarEnabled: boolean
  timestamp?: Date
}

export type OutputWriteResult = {
  outputPath: string
  sidecarPath: string | null
}

export class OutputService {
  async write(input: OutputWriteInput): Promise<OutputWriteResult> {
    const timestamp = input.timestamp ?? new Date()
    const resolvedDir = this.resolveOutputDir(input.outputDir)
    await mkdir(resolvedDir, { recursive: true })

    const filenameBase = this.buildFilenameBase(timestamp, input.parsed)
    const outputPath = await this.findAvailablePath(resolvedDir, `${filenameBase}.png`)
    await this.atomicWriteBuffer(outputPath, input.imageBuffer)

    let sidecarPath: string | null = null
    if (input.sidecarEnabled) {
      const sidecarPayload = JSON.stringify(
        {
          timestamp: timestamp.toISOString(),
          tooth: input.parsed.tooth,
          diameter: input.parsed.diameter,
          length: input.parsed.length
        },
        null,
        2
      )
      sidecarPath = outputPath.replace(/\.png$/i, '.json')
      await this.atomicWriteBuffer(sidecarPath, Buffer.from(sidecarPayload, 'utf8'))
    }

    return { outputPath, sidecarPath }
  }

  private resolveOutputDir(rawOutputDir: string): string {
    const trimmed = rawOutputDir.trim()
    if (!trimmed) {
      return join(homedir(), 'Desktop', 'ScreenshotOutput')
    }
    if (isAbsolute(trimmed)) {
      return trimmed
    }
    return join(homedir(), 'Desktop', trimmed)
  }

  private buildFilenameBase(timestamp: Date, parsed: ParsedSnapshot): string {
    const datePart = this.formatDate(timestamp)
    const toothPart = this.sanitizeToken(parsed.tooth ?? 'unknown')
    const diameterPart = this.sanitizeToken(parsed.diameter ?? 'unknown')
    const lengthPart = this.sanitizeToken(parsed.length ?? 'unknown')
    return `${datePart}_tooth${toothPart}_${diameterPart}x${lengthPart}`
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear().toString().padStart(4, '0')
    const mm = (date.getMonth() + 1).toString().padStart(2, '0')
    const dd = date.getDate().toString().padStart(2, '0')
    const hh = date.getHours().toString().padStart(2, '0')
    const min = date.getMinutes().toString().padStart(2, '0')
    const ss = date.getSeconds().toString().padStart(2, '0')
    return `${yyyy}${mm}${dd}_${hh}${min}${ss}`
  }

  private sanitizeToken(value: string): string {
    return value.replace(/[^0-9A-Za-z._-]/g, '_')
  }

  private async findAvailablePath(dir: string, baseFilename: string): Promise<string> {
    const extIndex = baseFilename.lastIndexOf('.')
    const stem = extIndex >= 0 ? baseFilename.slice(0, extIndex) : baseFilename
    const ext = extIndex >= 0 ? baseFilename.slice(extIndex) : ''
    let serial = 0

    while (true) {
      const suffix = serial === 0 ? '' : `_${serial + 1}`
      const candidate = join(dir, `${stem}${suffix}${ext}`)
      if (!(await this.pathExists(candidate))) {
        return candidate
      }
      serial += 1
    }
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await access(path, fsConstants.F_OK)
      return true
    } catch {
      return false
    }
  }

  private async atomicWriteBuffer(path: string, content: Buffer): Promise<void> {
    const tempPath = `${path}.tmp-${randomUUID()}`
    await writeFile(tempPath, content)
    await rename(tempPath, path)
  }
}
