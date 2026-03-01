export type OcrRawOutput = {
  text: string
  confidence: number
}

export type ParsedData = {
  tooth: string | null
  diameter: string | null
  length: string | null
}

export type OcrResult = {
  raw: {
    tooth: OcrRawOutput
    extra: OcrRawOutput
  }
  parsed: ParsedData
  errors: string[]
}

export type PreprocessOptions = {
  grayscale: boolean
  contrast: number
  scale: number
  threshold: number
  sharpen: boolean
}

// ── Table validation ──────────────────────────────────────────────────────────

/** Valid (diameter → lengths[]) combinations for Ostem TSIII implants */
export const VALID_COMBINATIONS: Record<string, string[]> = {
  '3.0': ['8.5', '10.0', '11.5', '13.0'],
  '3.5': ['8.5', '10.0', '11.5', '13.0'],
  '4.0': ['6.0', '7.0', '8.5', '10.0', '11.5', '13.0'],
  '4.5': ['6.0', '7.0', '8.5', '10.0', '11.5', '13.0'],
  '5.0': ['4.0', '5.0', '6.0', '7.0', '8.5', '10.0', '11.5', '13.0'],
}

export type TableAnalysisResult = {
  detected: boolean
  diameter: string | null
  length: string | null
  confidence: 'high' | 'low' | 'none'
  error?: string
}

export type CombinationValidation = {
  valid: boolean
  message: string | null
}

export function validateCombination(
  diameter: string | null,
  length: string | null
): CombinationValidation {
  if (!diameter || !length) {
    return { valid: false, message: `資料不完整: diameter=${diameter ?? '?'}, length=${length ?? '?'}` }
  }
  const allowed = VALID_COMBINATIONS[diameter]
  if (!allowed) return { valid: false, message: `未知植體直徑: ${diameter}` }
  if (!allowed.includes(length)) return { valid: false, message: `Ø${diameter} × ${length}mm 無效組合` }
  return { valid: true, message: null }
}

export const DEFAULT_PREPROCESS: PreprocessOptions = {
  grayscale: true,
  contrast: 1.0,
  scale: 3.0,
  threshold: 0,
  sharpen: false   // tuned 2026-03-01: sharpen hurts OCR on this UI (22→30/30)
}
