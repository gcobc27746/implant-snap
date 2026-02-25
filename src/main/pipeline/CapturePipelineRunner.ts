import type { AppConfig } from '../config/schema'
import type { CaptureService } from '../capture/CaptureService'
import type { CropService } from '../capture/CropService'
import type { CropResult } from '../capture/types'

export class CapturePipelineRunner {
  constructor(
    private readonly captureService: CaptureService,
    private readonly cropService: CropService
  ) {}

  async run(config: AppConfig): Promise<{ traceId: string; crops: CropResult }> {
    const traceId = crypto.randomUUID()
    const t0 = Date.now()
    this.log(traceId, '開始執行 capture → crop 流程')

    const fullScreen = await this.captureService.captureFullScreen()
    this.log(traceId, `截圖完成: ${fullScreen.size.width}x${fullScreen.size.height}`)

    const crops = await this.cropService.cropAll(fullScreen, {
      cropMain: config.regions.cropMain,
      ocrTooth: config.regions.ocrTooth,
      ocrExtra: config.regions.ocrExtra
    })

    this.log(traceId, `裁切完成 (${Date.now() - t0}ms)`)
    return { traceId, crops }
  }

  private log(traceId: string, msg: string): void {
    console.log(`[CapturePipeline][${traceId}] ${msg}`)
  }
}
