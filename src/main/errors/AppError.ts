export const ErrorCode = {
  CAPTURE_FAILED: 'CAPTURE_FAILED',
  REGION_OUT_OF_BOUND: 'REGION_OUT_OF_BOUND',
  OCR_FAILED: 'OCR_FAILED',
  PARSE_INCOMPLETE: 'PARSE_INCOMPLETE',
  OVERLAY_FAILED: 'OVERLAY_FAILED',
  WRITE_FAILED: 'WRITE_FAILED'
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  CAPTURE_FAILED: '截圖失敗，請確認螢幕權限。',
  REGION_OUT_OF_BOUND: '定義的區域超出螢幕範圍，請重新設定座標。',
  OCR_FAILED: 'OCR 辨識失敗，將輸出無疊加圖片。',
  PARSE_INCOMPLETE: '解析不完整，部分欄位無法辨識。',
  OVERLAY_FAILED: '疊加渲染失敗，將輸出無疊加圖片。',
  WRITE_FAILED: '檔案寫入失敗，請確認輸出目錄的寫入權限。'
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}
