import type { AppConfig } from './config-schema'

export type ParsedSnapshot = {
  tooth: string | null
  diameter: string | null
  length: string | null
}

export type CaptureSnapshot = {
  dataUrl: string
  width: number
  height: number
}

export type OcrSnapshot = {
  raw: {
    tooth: { text: string; confidence: number }
    extra: { text: string; confidence: number }
  }
  parsed: ParsedSnapshot
  errors: string[]
}

export type PipelineErrorCode =
  | 'OCR_FAILED'
  | 'PARSE_INCOMPLETE'
  | 'REGION_OUT_OF_BOUND'
  | 'WRITE_FAILED'

export type PipelineNoticeLevel = 'success' | 'warning' | 'error'

export type PipelineNotice = {
  level: PipelineNoticeLevel
  message: string
  code?: PipelineErrorCode
  traceId?: string
}

export type PipelineExecuteStatus = 'saved' | 'cancelled' | 'blocked'

export type PipelineExecuteResult = {
  traceId: string
  status: PipelineExecuteStatus
  capture: CaptureSnapshot | null
  ocr: OcrSnapshot | null
  parsed: ParsedSnapshot
  overlayText: string | null
  overlayApplied: boolean
  outputPath: string | null
  sidecarPath: string | null
  notices: PipelineNotice[]
  configSnapshot: AppConfig
}
