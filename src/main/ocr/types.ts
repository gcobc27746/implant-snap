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

export const DEFAULT_PREPROCESS: PreprocessOptions = {
  grayscale: true,
  contrast: 1.0,
  scale: 3.0,
  threshold: 0,
  sharpen: true
}
