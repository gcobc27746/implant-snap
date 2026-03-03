import sharp from 'sharp'
import type { ParsedData } from '../ocr/types'
import type { AnchorPoint, RegionRect } from '../config/schema'

export type OverlayStyle = {
  fontSize: number
  textColor: string
  padding: number
}

const DEFAULT_STYLE: OverlayStyle = {
  fontSize: 28,
  textColor: '#ffffff',
  padding: 8
}

export function formatOverlayText(data: ParsedData): string {
  const tooth = data.tooth ?? '?'
  const diameter = data.diameter ?? '?'
  const length = data.length ?? '?'
  return `${tooth} ( ${diameter} x ${length} )`
}

export function hasOverlayData(data: ParsedData): boolean {
  return data.tooth !== null || data.diameter !== null || data.length !== null
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function estimateTextWidth(text: string, fontSize: number): number {
  // Arial average char width ≈ 0.58 * fontSize; add 15% safety margin
  return Math.ceil(text.length * fontSize * 0.58 * 1.15)
}

/** Estimate width of a single line, handling CJK (≈full-width) vs ASCII. */
function estimateLineWidth(text: string, fontSize: number): number {
  let w = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    // CJK Unified Ideographs and other wide characters
    w += code > 0x2E7F ? fontSize * 1.05 : fontSize * 0.58
  }
  return Math.ceil(w * 1.2) // 20% safety margin
}

function buildSvg(
  text: string,
  style: OverlayStyle
): { svg: string; width: number; height: number } {
  const textWidth = estimateTextWidth(text, style.fontSize)
  const width = textWidth + style.padding * 2
  const height = style.fontSize + style.padding * 2

  // Text baseline: move up slightly so it's vertically centered
  const textY = Math.round(style.padding + style.fontSize * 0.82)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <text
    x="${style.padding}" y="${textY}"
    font-family="Arial, Helvetica, Liberation Sans, sans-serif"
    font-size="${style.fontSize}"
    font-weight="600"
    fill="${style.textColor}"
  >${escapeXml(text)}</text>
</svg>`

  return { svg, width, height }
}

function buildNoteSvg(
  text: string,
  fontSize: number,
  textColor: string
): { svg: string; width: number; height: number } {
  const lines = text.split('\n')
  const lineHeight = Math.round(fontSize * 1.5)
  const maxLineW = Math.max(...lines.map(l => estimateLineWidth(l, fontSize)), 20)
  const padding = 4
  const strokeW = Math.max(2, Math.round(fontSize * 0.08))
  const width = maxLineW + padding * 2
  const height = lines.length * lineHeight + padding * 2
  const firstY = padding + Math.round(fontSize * 0.82)

  const tspans = lines
    .map((line, i) =>
      `<tspan x="${padding}" ${i === 0 ? `y="${firstY}"` : `dy="${lineHeight}"`}>${escapeXml(line)}</tspan>`
    )
    .join('\n    ')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <text
    font-family="Arial, Helvetica, Liberation Sans, sans-serif"
    font-size="${fontSize}"
    font-weight="600"
    fill="${textColor}"
    stroke="#000000"
    stroke-width="${strokeW}"
    paint-order="stroke"
  >
    ${tspans}
  </text>
</svg>`

  return { svg, width, height }
}

export class OverlayService {
  /**
   * Composite text overlay onto the cropped main image buffer.
   *
   * @param mainBuffer - The cropMain PNG buffer (already cropped)
   * @param anchor     - overlayAnchor in full-screen pixel coordinates
   * @param cropMain   - The cropMain region (used to convert anchor to relative coords)
   * @param data       - Parsed OCR data
   * @param style      - Optional style overrides
   * @returns Composited PNG buffer, or original buffer if no overlay data
   */
  async composite(
    mainBuffer: Buffer,
    anchor: AnchorPoint,
    cropMain: RegionRect,
    data: ParsedData,
    style: Partial<OverlayStyle> = {}
  ): Promise<Buffer> {
    if (!hasOverlayData(data)) {
      return mainBuffer
    }

    const s: OverlayStyle = { ...DEFAULT_STYLE, ...style }
    const text = formatOverlayText(data)
    const { svg, width, height } = buildSvg(text, s)

    // Convert full-screen anchor to crop-relative position
    const relX = Math.max(0, anchor.x - cropMain.x)
    const relY = Math.max(0, anchor.y - cropMain.y)

    // Clamp so the overlay box doesn't go outside the image
    const meta = await sharp(mainBuffer).metadata()
    const imgW = meta.width ?? cropMain.width
    const imgH = meta.height ?? cropMain.height
    const clampedX = Math.min(relX, Math.max(0, imgW - width))
    const clampedY = Math.min(relY, Math.max(0, imgH - height))

    const overlayBuf = Buffer.from(svg)

    return await sharp(mainBuffer)
      .composite([{
        input: overlayBuf,
        top: clampedY,
        left: clampedX
      }])
      .png()
      .toBuffer()
  }

  /**
   * Composite a multi-line note text onto a buffer at the given fractional position.
   * The note is rendered with a semi-transparent dark background box.
   *
   * @param buffer   - Source PNG buffer
   * @param noteText - Note text (may contain \n for line breaks)
   * @param relX     - Fractional x position within the image (0–1)
   * @param relY     - Fractional y position within the image (0–1)
   * @returns Composited PNG buffer, or original buffer if noteText is empty
   */
  async compositeNote(
    buffer: Buffer,
    noteText: string,
    relX: number,
    relY: number,
    fontSize = 36
  ): Promise<Buffer> {
    const trimmed = noteText.trim()
    if (!trimmed) return buffer

    const { svg, width, height } = buildNoteSvg(trimmed, Math.max(10, fontSize), '#ffffff')

    const meta = await sharp(buffer).metadata()
    const imgW = meta.width ?? 100
    const imgH = meta.height ?? 100

    const pixX = Math.round(relX * imgW)
    const pixY = Math.round(relY * imgH)
    const clampedX = Math.min(pixX, Math.max(0, imgW - width))
    const clampedY = Math.min(pixY, Math.max(0, imgH - height))

    return await sharp(buffer)
      .composite([{ input: Buffer.from(svg), top: clampedY, left: clampedX }])
      .png()
      .toBuffer()
  }
}
