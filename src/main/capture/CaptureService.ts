import screenshot from 'screenshot-desktop'
import sharp from 'sharp'
import type { ImageBuffer } from './types'

export class CaptureService {
  async captureFullScreen(): Promise<ImageBuffer> {
    const imageBuffer = await screenshot({ format: 'png' })
    const metadata = await sharp(imageBuffer).metadata()

    if (!metadata.width || !metadata.height) {
      throw new Error('無法讀取截圖尺寸資訊。')
    }

    return {
      buffer: imageBuffer,
      size: { width: metadata.width, height: metadata.height }
    }
  }
}
