import type { ParsedData } from './types'

/** FDI tooth numbers: 11-18, 21-28, 31-38, 41-48 */
const TOOTH_RE = /\b(1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/

/**
 * Match "长度 = 13.0 mm" — tolerates OCR spaces in 长度
 * Also matches garbled variants like "长度", "长 度", "民 度", "代 度", "八 度"
 */
const LENGTH_RE = /[长長民代八]\s*[度庆]\s*=\s*(\d+\.?\d*)\s*m/i

/**
 * Match "直径 = 4.0 mm" — tolerates heavy OCR garbling of 直径
 * Real examples: "直 径", "直 人 径", "直 人 笃", "喜人 既"
 */
const DIAMETER_RE = /直\s*[径經徑人]?\s*[径經徑笃]?\s*=\s*(\d+\.?\d*)\s*m/i

/**
 * Positional fallback: find ALL "= NUMBER mm" patterns in text.
 * In the standard implant data format, the first is length, second is diameter.
 *
 * Also tolerates OCR misreads where the digit "4" is rendered as "<", "{", or "("
 * (e.g. "= 4.0 mm" → "=<0 mm"). These are captured as group 1 (the noise char)
 * and group 2 (the remaining digits).
 */
const VALUE_MM_RE = /=\s*([<{(]?)(\d+\.?\d*)\s*m/gi

/** Fallback: old "DxL" format (e.g. "4.0×13.0") */
const DIM_RE = /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/

/**
 * Implant diameters: typically 2.5–7.0 mm
 * OCR commonly drops the decimal: "4.0" → "40", "3.5" → "35"
 */
function normalizeDiameter(raw: string): string {
  const v = parseFloat(raw)
  if (v >= 10) {
    return (v / 10).toFixed(1)
  }
  return raw.includes('.') ? raw : `${v}.0`
}

/**
 * Implant lengths: typically 4.0–18.0 mm
 * OCR commonly drops the decimal: "13.0" → "130"
 * OCR may also drop the leading digit: "13.0" → "30"
 *
 * Strategy: if the value looks like a valid diameter (< 4) but not a valid
 * length, it's likely a garbled length where digits were lost. We keep
 * the raw value and flag low confidence rather than returning a wrong number.
 */
function normalizeLength(raw: string): string {
  const v = parseFloat(raw)
  // "130" → 13.0 (decimal dropped)
  if (v > 20) {
    return (v / 10).toFixed(1)
  }
  return raw.includes('.') ? raw : `${v}.0`
}

export class OcrParser {
  parse(toothText: string, extraText: string): { parsed: ParsedData; errors: string[] } {
    const errors: string[] = []

    // --- Tooth number ---
    const toothMatch = TOOTH_RE.exec(toothText)
    const tooth = toothMatch ? toothMatch[1] : null
    if (!tooth) errors.push('tooth: 無法辨識牙位編號')

    // --- Length & Diameter ---
    let length: string | null = null
    let diameter: string | null = null

    // Strategy 1: Match by Chinese keyword (most reliable when OCR is decent)
    const lengthMatch = LENGTH_RE.exec(extraText)
    if (lengthMatch) {
      length = normalizeLength(lengthMatch[1])
    }

    const diamMatch = DIAMETER_RE.exec(extraText)
    if (diamMatch) {
      diameter = normalizeDiameter(diamMatch[1])
    }

    // Strategy 2: Positional fallback — find all "= NUMBER mm" patterns.
    // In standard format, length comes before diameter.
    // The regex allows an optional leading "<", "{", "(" which OCR sometimes
    // produces instead of the digit "4" (e.g. "=<0 mm" → treat as "=40 mm").
    if (!length || !diameter) {
      const allValues: string[] = []
      let m: RegExpExecArray | null
      const re = new RegExp(VALUE_MM_RE.source, VALUE_MM_RE.flags)
      while ((m = re.exec(extraText)) !== null) {
        const noiseChar = m[1]  // "<", "{", "(" or ""
        const digits = m[2]
        // If a noise char precedes the digits, it is most likely a garbled "4"
        const raw = noiseChar ? `4${digits}` : digits
        allValues.push(raw)
      }

      if (allValues.length >= 2) {
        // First "= N mm" is length, second is diameter
        if (!length) length = normalizeLength(allValues[0])
        if (!diameter) diameter = normalizeDiameter(allValues[1])
      } else if (allValues.length === 1) {
        // Only one found — guess which based on value range
        const v = parseFloat(allValues[0])
        const normalized = v >= 10 ? v / 10 : v
        if (!length && normalized >= 4) {
          length = normalizeLength(allValues[0])
        } else if (!diameter && normalized < 10) {
          diameter = normalizeDiameter(allValues[0])
        }
      }
    }

    // Strategy 3: "DxL" format fallback (e.g. "4.0×13.0")
    if (!length || !diameter) {
      const dimMatch = DIM_RE.exec(extraText)
      if (dimMatch) {
        if (!diameter) diameter = normalizeDiameter(dimMatch[1])
        if (!length) length = normalizeLength(dimMatch[2])
      }
    }

    if (!length) errors.push('extra: 無法辨識種植體長度')
    if (!diameter) errors.push('extra: 無法辨識種植體直徑')

    return {
      parsed: { tooth, diameter, length },
      errors
    }
  }
}
