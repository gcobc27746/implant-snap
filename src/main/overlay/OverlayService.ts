import sharp from 'sharp'
import type { ParsedSnapshot } from '../../shared/pipeline-schema'

export type OverlayAnchor = {
  x: number
  y: number
}

export type OverlayStyle = {
  fontSize: number
  padding: number
  borderRadius: number
  textColor: string
  backgroundColor: string
  fontFamily: string
}

export type OverlayRenderInput = {
  imageBuffer: Buffer
  anchor: OverlayAnchor
  parsed: ParsedSnapshot
  style?: Partial<OverlayStyle>
}

export type OverlayRenderResult = {
  buffer: Buffer
  text: string | null
  applied: boolean
}

const DEFAULT_STYLE: OverlayStyle = {
  fontSize: 28,
  padding: 8,
  borderRadius: 8,
  textColor: '#ffffff',
  backgroundColor: 'rgba(0,0,0,0.65)',
  fontFamily: 'Inter, "Noto Sans TC", "Microsoft JhengHei", sans-serif'
}

export class OverlayService {
  async render(input: OverlayRenderInput): Promise<OverlayRenderResult> {
    if (!this.isComplete(input.parsed)) {
      return {
        buffer: input.imageBuffer,
        text: null,
        applied: false
      }
    }

    const style = { ...DEFAULT_STYLE, ...input.style }
    const text = `${input.parsed.tooth} ( ${input.parsed.diameter} x ${input.parsed.length} )`
    const metadata = await sharp(input.imageBuffer).metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0

    if (width <= 0 || height <= 0) {
      throw new Error('無法取得主裁切影像尺寸，無法進行疊加。')
    }

    const textHeight = Math.ceil(style.fontSize * 1.35)
    const textWidth = this.estimateTextWidth(text, style.fontSize)
    const boxWidth = textWidth + style.padding * 2
    const boxHeight = textHeight + style.padding * 2
    const left = this.clamp(Math.round(input.anchor.x), 0, Math.max(0, width - boxWidth))
    const top = this.clamp(Math.round(input.anchor.y), 0, Math.max(0, height - boxHeight))

    const overlaySvg = this.buildOverlaySvg({
      width: boxWidth,
      height: boxHeight,
      text,
      style
    })

    const buffer = await sharp(input.imageBuffer)
      .composite([{ input: Buffer.from(overlaySvg), left, top }])
      .png()
      .toBuffer()

    return {
      buffer,
      text,
      applied: true
    }
  }

  private buildOverlaySvg(input: {
    width: number
    height: number
    text: string
    style: OverlayStyle
  }): string {
    const textX = input.style.padding
    const textY = input.style.padding
    const escapedText = this.escapeXml(input.text)
    const escapedFont = this.escapeXml(input.style.fontFamily)

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="${input.height}">
  <rect x="0" y="0" width="${input.width}" height="${input.height}" rx="${input.style.borderRadius}" ry="${input.style.borderRadius}" fill="${input.style.backgroundColor}" />
  <text x="${textX}" y="${textY}" dominant-baseline="hanging" fill="${input.style.textColor}" font-family="${escapedFont}" font-size="${input.style.fontSize}" font-weight="700">${escapedText}</text>
</svg>`
  }

  private estimateTextWidth(text: string, fontSize: number): number {
    let units = 0
    for (const ch of text) {
      if (/[0-9]/.test(ch)) {
        units += 0.62
      } else if (/[A-Za-z]/.test(ch)) {
        units += 0.58
      } else if (/[().]/.test(ch)) {
        units += 0.42
      } else if (/[ xX×]/.test(ch)) {
        units += 0.45
      } else {
        units += 0.7
      }
    }
    return Math.ceil(units * fontSize)
  }

  private isComplete(parsed: ParsedSnapshot): parsed is Required<ParsedSnapshot> {
    return Boolean(parsed.tooth && parsed.diameter && parsed.length)
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
  }

  private escapeXml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
