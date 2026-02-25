import type { AppConfig } from '../config/schema'
import type { CaptureService } from '../capture/CaptureService'
import type { CropService } from '../capture/CropService'
import type { OcrService } from '../ocr/OcrService'
import type { CropResult, ImageBuffer } from '../capture/types'
import type { OcrResult } from '../ocr/types'

export type PipelineResult = {
  traceId: string
  fullScreen: ImageBuffer
  crops: CropResult
  ocr: OcrResult
}

export class CapturePipelineRunner {
  constructor(
    private readonly captureService: CaptureService,
    private readonly cropService: CropService,
    private readonly ocrService: OcrService
  ) {}

  async run(config: AppConfig, displayId?: string): Promise<PipelineResult> {
    const traceId = crypto.randomUUID()
    const t0 = Date.now()
    this.log(traceId, '開始執行 capture → crop → ocr 流程')

    const fullScreen = await this.captureService.captureFullScreen(displayId)
    this.log(traceId, `截圖完成: ${fullScreen.size.width}x${fullScreen.size.height}`)

    const crops = await this.cropService.cropAll(fullScreen, {
      cropMain: config.regions.cropMain,
      ocrTooth: config.regions.ocrTooth,
      ocrExtra: config.regions.ocrExtra
    })
    this.log(traceId, '裁切完成')

    const ocr = await this.ocrService.recognize(
      crops.ocrTooth.buffer,
      crops.ocrExtra.buffer
    )
    this.log(traceId, `OCR 完成: tooth="${ocr.parsed.tooth ?? '?'}" diameter="${ocr.parsed.diameter ?? '?'}" length="${ocr.parsed.length ?? '?'}"`)

    if (ocr.errors.length) {
      this.log(traceId, `OCR 警告: ${ocr.errors.join('; ')}`)
    }

    this.log(traceId, `流程結束 (${Date.now() - t0}ms)`)
    return { traceId, fullScreen, crops, ocr }
  }

  private log(traceId: string, msg: string): void {
    console.log(`[CapturePipeline][${traceId}] ${msg}`)
  }
}
