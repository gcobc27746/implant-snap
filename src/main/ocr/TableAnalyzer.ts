import sharp from 'sharp'
import type { ImageBuffer } from '../capture/types'
import type { TableAnalysisResult } from './types'
import { VALID_COMBINATIONS } from './types'

// ── Constants ────────────────────────────────────────────────────────────────

const SCALE = 3

// Ostem TSIII table layout (top → bottom, left → right)
const LENGTHS = ['13.0', '11.5', '10.0', '8.5', '7.0', '6.0', '5.0', '4.0'] as const
const DIAMETERS = ['3.0', '3.5', '4.0', '4.5', '5.0'] as const

// Fraction of cropped image height occupied by the table header row
const HEADER_FRAC = 0.10

// Fill-ratio threshold: below this → region is a border outline (selection marker)
const BORDER_FILL_RATIO_MAX = 0.50

// ── Color helpers ─────────────────────────────────────────────────────────────

/** True when pixel is "selection red" (high R, low G, low B). */
function isRed(r: number, g: number, b: number): boolean {
  return r > 155 && g < 85 && b < 85
}

/**
 * Map a pixel's RGB to a diameter string based on column fill colour.
 * Returns null if the colour doesn't match any known column.
 */
function pixelToDiameter(r: number, g: number, b: number): string | null {
  // Yellow  (Ø3.5) — high R, high G, low B
  if (r > 155 && g > 150 && b < 100) return '3.5'
  // Orange  (Ø3.0) — high R, mid G, low B
  if (r > 155 && g >= 75 && g < 150 && b < 75) return '3.0'
  // Green   (Ø4.0) — low R, high G, low B
  if (r < 110 && g > 110 && b < 110) return '4.0'
  // Blue    (Ø4.5) — low R, low-mid G, high B
  if (r < 110 && b > 120 && g < 160) return '4.5'
  // Red     (Ø5.0) — same hue as selection border; handled separately
  if (r > 150 && g < 85 && b < 85) return '5.0'
  return null
}

// ── Connected components ──────────────────────────────────────────────────────

interface Component {
  pixelCount: number
  minX: number
  maxX: number
  minY: number
  maxY: number
  sumX: number
  sumY: number
}

/**
 * Raster-scan BFS connected components over "red" pixels (4-connectivity).
 * Returns components sorted by pixelCount descending.
 */
function findRedComponents(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): Component[] {
  const visited = new Uint8Array(width * height)
  const components: Component[] = []
  const total = width * height

  for (let start = 0; start < total; start++) {
    if (visited[start]) continue
    const pi = start * channels
    if (!isRed(data[pi], data[pi + 1], data[pi + 2])) continue

    // BFS (using array as stack for speed)
    const comp: Component = {
      pixelCount: 0,
      minX: start % width,
      maxX: start % width,
      minY: Math.floor(start / width),
      maxY: Math.floor(start / width),
      sumX: 0,
      sumY: 0
    }
    const stack: number[] = [start]
    visited[start] = 1

    while (stack.length > 0) {
      const idx = stack.pop()!
      const x = idx % width
      const y = Math.floor(idx / width)

      comp.pixelCount++
      comp.sumX += x
      comp.sumY += y
      if (x < comp.minX) comp.minX = x
      if (x > comp.maxX) comp.maxX = x
      if (y < comp.minY) comp.minY = y
      if (y > comp.maxY) comp.maxY = y

      // 4-neighbours
      const neighbours = [
        x > 0 ? idx - 1 : -1,
        x < width - 1 ? idx + 1 : -1,
        y > 0 ? idx - width : -1,
        y < height - 1 ? idx + width : -1
      ]
      for (const ni of neighbours) {
        if (ni < 0 || visited[ni]) continue
        const npi = ni * channels
        if (!isRed(data[npi], data[npi + 1], data[npi + 2])) continue
        visited[ni] = 1
        stack.push(ni)
      }
    }

    components.push(comp)
  }

  components.sort((a, b) => b.pixelCount - a.pixelCount)
  return components
}

// ── Main class ────────────────────────────────────────────────────────────────

export class TableAnalyzer {
  async analyze(tableImage: ImageBuffer): Promise<TableAnalysisResult> {
    try {
      const scaledW = tableImage.size.width * SCALE
      const scaledH = tableImage.size.height * SCALE

      const { data, info } = await sharp(tableImage.buffer)
        .resize(scaledW, scaledH, { kernel: 'lanczos3' })
        .raw()
        .toBuffer({ resolveWithObject: true })

      const { width, height, channels } = info
      if (channels < 3) {
        return { detected: false, diameter: null, length: null, confidence: 'none', error: '影像通道不足' }
      }

      // ── Find red connected components ───────────────────────────────────────
      const components = findRedComponents(data as Buffer, width, height, channels)

      if (components.length === 0) {
        return { detected: false, diameter: null, length: null, confidence: 'none', error: '未偵測到紅色選取框' }
      }

      // ── Find the selection-border component ─────────────────────────────────
      // A selection border is a thin rectangle outline → fill_ratio < BORDER_FILL_RATIO_MAX.
      // A Ø5.0 filled cell has fill_ratio ≈ 1.0.
      let borderComp: Component | null = null
      for (const c of components) {
        const bboxArea = (c.maxX - c.minX + 1) * (c.maxY - c.minY + 1)
        if (bboxArea < 100) continue  // too small — noise
        const fillRatio = c.pixelCount / bboxArea
        if (fillRatio < BORDER_FILL_RATIO_MAX) {
          borderComp = c
          break  // components are sorted largest-first; first border-like one wins
        }
      }

      // ── Fall back: largest component (Ø5.0 selected) ───────────────────────
      const useComponent = borderComp ?? components[0]
      const isBorder = borderComp !== null

      const centerX = useComponent.sumX / useComponent.pixelCount
      const centerY = useComponent.sumY / useComponent.pixelCount

      // ── Determine diameter ──────────────────────────────────────────────────
      let diameter: string | null = null

      if (isBorder) {
        // Sample the interior of the bounding box (inset 20%) for column colour
        const bboxW = useComponent.maxX - useComponent.minX + 1
        const bboxH = useComponent.maxY - useComponent.minY + 1
        const insetX = Math.max(1, Math.round(bboxW * 0.20))
        const insetY = Math.max(1, Math.round(bboxH * 0.20))
        const sMinX = useComponent.minX + insetX
        const sMaxX = useComponent.maxX - insetX
        const sMinY = useComponent.minY + insetY
        const sMaxY = useComponent.maxY - insetY

        const counts: Record<string, number> = {}
        for (let y = sMinY; y <= sMaxY; y += 2) {
          for (let x = sMinX; x <= sMaxX; x += 2) {
            const pi = (y * width + x) * channels
            const d = pixelToDiameter(data[pi], data[pi + 1], data[pi + 2])
            if (d) counts[d] = (counts[d] ?? 0) + 1
          }
        }

        // Prefer non-red (since red = ambiguous with border colour)
        const nonRed = Object.entries(counts)
          .filter(([d]) => d !== '5.0')
          .sort((a, b) => b[1] - a[1])
        if (nonRed.length > 0) {
          diameter = nonRed[0][0]
        } else if (counts['5.0']) {
          diameter = '5.0'
        }
      }

      // If colour sampling failed or we're in Ø5.0 fallback, use X position
      if (!diameter) {
        const relX = centerX / width
        const colIdx = Math.min(Math.floor(relX * DIAMETERS.length), DIAMETERS.length - 1)
        diameter = DIAMETERS[colIdx]
      }

      // ── Determine length from Y position ────────────────────────────────────
      // Assume top HEADER_FRAC of the crop height is a header row.
      const dataStartY = height * HEADER_FRAC
      const dataH = height - dataStartY
      const relY = Math.max(0, (centerY - dataStartY) / dataH)
      const rowIdx = Math.min(Math.floor(relY * LENGTHS.length), LENGTHS.length - 1)
      const length = LENGTHS[rowIdx]

      // ── Confidence ──────────────────────────────────────────────────────────
      const validLengths = VALID_COMBINATIONS[diameter] ?? []
      const comboOk = validLengths.includes(length)
      const confidence: 'high' | 'low' = isBorder && comboOk ? 'high' : 'low'

      return { detected: true, diameter, length, confidence }
    } catch (e) {
      return {
        detected: false,
        diameter: null,
        length: null,
        confidence: 'none',
        error: (e as Error).message
      }
    }
  }
}
