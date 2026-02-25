import type { ParsedData } from './types'

const TOOTH_RE = /\b(1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/
const DIM_RE = /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/

function normalizeDecimal(v: string): string {
  return v.includes('.') ? v : `${v}.0`
}

export class OcrParser {
  parse(toothText: string, extraText: string): { parsed: ParsedData; errors: string[] } {
    const errors: string[] = []

    const toothMatch = TOOTH_RE.exec(toothText)
    const tooth = toothMatch ? toothMatch[1] : null
    if (!tooth) errors.push('tooth: 無法辨識牙位編號')

    const dimMatch = DIM_RE.exec(extraText)
    const diameter = dimMatch ? normalizeDecimal(dimMatch[1]) : null
    const length = dimMatch ? normalizeDecimal(dimMatch[2]) : null
    if (!diameter || !length) errors.push('extra: 無法辨識直徑×長度')

    return {
      parsed: { tooth, diameter, length },
      errors
    }
  }
}
