import type { BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import type { AppConfig } from '../config/schema'
import type { CapturePipelineRunner } from './CapturePipelineRunner'
import type { OverlayService } from '../overlay/OverlayService'
import type { PreviewService } from '../preview/PreviewService'
import type { OutputService } from '../output/OutputService'
import type {
  ParsedSnapshot,
  PipelineErrorCode,
  PipelineExecuteResult,
  PipelineNotice
} from '../../shared/pipeline-schema'

export class ExecutionPipelineService {
  constructor(
    private readonly capturePipelineRunner: CapturePipelineRunner,
    private readonly overlayService: OverlayService,
    private readonly previewService: PreviewService,
    private readonly outputService: OutputService,
    private readonly saveConfig: (nextConfig: AppConfig) => AppConfig
  ) {}

  async execute(
    inputConfig: AppConfig,
    mainWindow: BrowserWindow | null,
    displayId?: string
  ): Promise<PipelineExecuteResult> {
    let config = inputConfig
    let traceId = randomUUID()
    const notices: PipelineNotice[] = []

    try {
      const pipeline = await this.capturePipelineRunner.run(config, displayId)
      traceId = pipeline.traceId
      const capture = {
        dataUrl: this.bufferToDataUrl(pipeline.fullScreen.buffer),
        width: pipeline.fullScreen.size.width,
        height: pipeline.fullScreen.size.height
      }
      const ocr = {
        raw: pipeline.ocr.raw,
        parsed: this.normalizeParsed(pipeline.ocr.parsed),
        errors: pipeline.ocr.errors
      }
      let parsed = this.normalizeParsed(pipeline.ocr.parsed)
      const ocrFailed = this.isOcrFailed(pipeline.ocr.raw.tooth.text, pipeline.ocr.raw.extra.text)
      const anchor = {
        x: config.regions.overlayAnchor.x - config.regions.cropMain.x,
        y: config.regions.overlayAnchor.y - config.regions.cropMain.y
      }

      if (ocrFailed) {
        notices.push(this.notice('warning', traceId, 'OCR 辨識失敗，將以無疊加圖進行後續流程。', 'OCR_FAILED'))
      }
      if (pipeline.ocr.errors.length > 0) {
        notices.push(this.notice('warning', traceId, `OCR 解析警告：${pipeline.ocr.errors.join('; ')}`))
      }

      let overlayResult = await this.overlayService.render({
        imageBuffer: pipeline.crops.cropMain.buffer,
        anchor,
        parsed,
        style: {
          fontSize: config.overlayFontSize
        }
      })

      if (config.previewEnabled) {
        const previewResult = await this.previewService.open(mainWindow, {
          imageDataUrl: this.bufferToDataUrl(overlayResult.buffer),
          parsed,
          overlayText: overlayResult.text
        })

        if (previewResult.skipPreview && config.previewEnabled) {
          config = this.saveConfig({ ...config, previewEnabled: false })
          notices.push(this.notice('success', traceId, '已套用 Skip Preview 設定。'))
        }

        if (previewResult.action === 'cancel') {
          notices.push(this.notice('warning', traceId, '使用者取消預覽，已中止輸出。'))
          return {
            traceId,
            status: 'cancelled',
            capture,
            ocr,
            parsed,
            overlayText: overlayResult.text,
            overlayApplied: overlayResult.applied,
            outputPath: null,
            sidecarPath: null,
            notices,
            configSnapshot: config
          }
        }

        parsed = this.normalizeParsed(previewResult.parsed)
        overlayResult = await this.overlayService.render({
          imageBuffer: pipeline.crops.cropMain.buffer,
          anchor,
          parsed,
          style: {
            fontSize: config.overlayFontSize
          }
        })
      }

      const parseComplete = this.isParsedComplete(parsed)
      if (!parseComplete && !ocrFailed && !config.forceSaveOnParseIncomplete) {
        notices.push(
          this.notice(
            'error',
            traceId,
            '解析資料不完整，已依策略阻止儲存（可啟用 forceSaveOnParseIncomplete 變更策略）。',
            'PARSE_INCOMPLETE'
          )
        )
        return {
          traceId,
          status: 'blocked',
          capture,
          ocr,
          parsed,
          overlayText: overlayResult.text,
          overlayApplied: overlayResult.applied,
          outputPath: null,
          sidecarPath: null,
          notices,
          configSnapshot: config
        }
      }

      if (!parseComplete && config.forceSaveOnParseIncomplete) {
        notices.push(
          this.notice('warning', traceId, '解析資料不完整，但 forceSaveOnParseIncomplete 已啟用，仍繼續輸出。', 'PARSE_INCOMPLETE')
        )
      }

      const output = await this.outputService.write({
        imageBuffer: overlayResult.buffer,
        parsed,
        outputDir: config.outputDir,
        sidecarEnabled: config.sidecarEnabled
      })
      notices.push(this.notice('success', traceId, `輸出成功：${output.outputPath}`))

      return {
        traceId,
        status: 'saved',
        capture,
        ocr,
        parsed,
        overlayText: overlayResult.text,
        overlayApplied: overlayResult.applied,
        outputPath: output.outputPath,
        sidecarPath: output.sidecarPath,
        notices,
        configSnapshot: config
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const code: PipelineErrorCode = message.includes('超出影像範圍') ? 'REGION_OUT_OF_BOUND' : 'WRITE_FAILED'
      notices.push(this.notice('error', traceId, message, code))
      return {
        traceId,
        status: 'blocked',
        capture: null,
        ocr: null,
        parsed: { tooth: null, diameter: null, length: null },
        overlayText: null,
        overlayApplied: false,
        outputPath: null,
        sidecarPath: null,
        notices,
        configSnapshot: config
      }
    }
  }

  private normalizeParsed(parsed: ParsedSnapshot): ParsedSnapshot {
    return {
      tooth: this.normalizeTooth(parsed.tooth),
      diameter: this.normalizeNumeric(parsed.diameter),
      length: this.normalizeNumeric(parsed.length)
    }
  }

  private normalizeTooth(value: string | null): string | null {
    if (!value) return null
    const cleaned = value.trim()
    return cleaned.length > 0 ? cleaned : null
  }

  private normalizeNumeric(value: string | null): string | null {
    if (!value) return null
    const cleaned = value.trim().replace(/[xX×]/g, '')
    if (!cleaned) return null
    const n = Number(cleaned)
    if (!Number.isFinite(n)) {
      return cleaned
    }
    return cleaned.includes('.') ? cleaned : n.toFixed(1)
  }

  private isParsedComplete(parsed: ParsedSnapshot): parsed is Required<ParsedSnapshot> {
    return Boolean(parsed.tooth && parsed.diameter && parsed.length)
  }

  private isOcrFailed(toothRawText: string, extraRawText: string): boolean {
    return toothRawText.trim() === '' && extraRawText.trim() === ''
  }

  private notice(
    level: PipelineNotice['level'],
    traceId: string,
    message: string,
    code?: PipelineErrorCode
  ): PipelineNotice {
    return {
      level,
      message,
      traceId,
      code
    }
  }

  private bufferToDataUrl(buffer: Buffer): string {
    return `data:image/png;base64,${buffer.toString('base64')}`
  }
}
