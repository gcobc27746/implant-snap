import type { AppConfig, ValidationResult } from '@shared/config-schema'

type CaptureFullScreenResult = { dataUrl: string; width: number; height: number }
type DisplayInfo = { id: string; name: string; width: number; height: number }

type OcrResultPayload = {
  raw: { tooth: { text: string; confidence: number }; extra: { text: string; confidence: number } }
  parsed: { tooth: string | null; diameter: string | null; length: string | null }
  errors: string[]
}

type PipelineRunResult = { capture: CaptureFullScreenResult; ocr: OcrResultPayload }

type ImplantSnapApi = {
  config: {
    load: () => Promise<AppConfig>
    save: (nextConfig: AppConfig) => Promise<AppConfig>
    validate: (candidate: AppConfig) => Promise<ValidationResult>
    reset: () => Promise<AppConfig>
  }
  capture: {
    listDisplays: () => Promise<DisplayInfo[]>
    selectDisplay: (displayId: string | null) => Promise<void>
    fullScreen: (displayId?: string) => Promise<CaptureFullScreenResult>
    onResult: (callback: (result: CaptureFullScreenResult) => void) => () => void
  }
  pipeline: {
    run: (displayId?: string) => Promise<PipelineRunResult>
    onOcrResult: (callback: (result: OcrResultPayload) => void) => () => void
  }
  dialog: {
    selectOutputDir: () => Promise<string | null>
  }
}

declare global {
  interface Window {
    implantSnap: ImplantSnapApi
  }
}

export {}
