import type { AppConfig } from '../config/schema'
import { CaptureService } from '../capture/CaptureService'
import { CropService } from '../capture/CropService'
import type { CropResult } from '../capture/types'

export class CapturePipelineRunner {
  constructor(
    private readonly captureService: CaptureService,
    private readonly cropService: CropService
  ) {}

  async run(config: AppConfig): Promise<{ traceId: string; crops: CropResult }> {
    const traceId = crypto.randomUUID()
    const startTime = Date.now()

    this.log(traceId, '開始執行 capture → crop 流程')

    const fullScreen = await this.captureService.captureFullScreen()
    this.log(traceId, `截圖完成: ${fullScreen.size.width}x${fullScreen.size.height}`)

    const crops = await this.cropService.cropAll(fullScreen, {
      cropMain: this.toZeroBasedRect(config.regions.cropMain),
      ocrTooth: this.toZeroBasedRect(config.regions.ocrTooth),
      ocrExtra: this.toZeroBasedRect(config.regions.ocrExtra)
    })

    this.log(
      traceId,
      `裁切完成: cropMain=${crops.cropMain.size.width}x${crops.cropMain.size.height}, ocrTooth=${crops.ocrTooth.size.width}x${crops.ocrTooth.size.height}, ocrExtra=${crops.ocrExtra.size.width}x${crops.ocrExtra.size.height}`
    )

    this.log(traceId, `流程結束，耗時 ${Date.now() - startTime}ms`)

    return { traceId, crops }
  }

  private toZeroBasedRect(rect: AppConfig['regions']['cropMain']) {
    return {
      x: rect.x - 1,
      y: rect.y - 1,
      width: rect.width,
      height: rect.height
    }
  }

  private log(traceId: string, message: string): void {
    console.log(`[CapturePipeline][traceId=${traceId}] ${message}`)
  }
}
