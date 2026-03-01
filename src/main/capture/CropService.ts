import sharp from 'sharp'
import { clampRegionToImage, assertRegionWithinImage } from './region'
import type { CropRegions, CropResult, ImageBuffer, RegionRect } from './types'

export class CropService {
  async cropAll(source: ImageBuffer, regions: CropRegions): Promise<CropResult> {
    return {
      cropMain: await this.cropOne(source, regions.cropMain, 'cropMain'),
      ocrTooth: await this.cropOne(source, regions.ocrTooth, 'ocrTooth'),
      ocrExtra: await this.cropOne(source, regions.ocrExtra, 'ocrExtra'),
      cropTable: await this.cropOne(source, regions.cropTable, 'cropTable')
    }
  }

  private async cropOne(source: ImageBuffer, region: RegionRect, name: string): Promise<ImageBuffer> {
    const clamped = clampRegionToImage(region, source.size)
    assertRegionWithinImage(clamped, source.size, name)
    const buffer = await sharp(source.buffer)
      .extract({ left: clamped.x, top: clamped.y, width: clamped.width, height: clamped.height })
      .png()
      .toBuffer()
    return { buffer, size: { width: clamped.width, height: clamped.height } }
  }
}
