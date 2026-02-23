import sharp from 'sharp'
import { assertRegionWithinImage, clampRegionToImage } from './region'
import type { CropRegions, CropResult, ImageBuffer, RegionRect } from './types'

export class CropService {
  async cropAll(sourceImage: ImageBuffer, regions: CropRegions): Promise<CropResult> {
    return {
      cropMain: await this.cropOne(sourceImage, regions.cropMain, 'cropMain'),
      ocrTooth: await this.cropOne(sourceImage, regions.ocrTooth, 'ocrTooth'),
      ocrExtra: await this.cropOne(sourceImage, regions.ocrExtra, 'ocrExtra')
    }
  }

  private async cropOne(sourceImage: ImageBuffer, region: RegionRect, regionName: string): Promise<ImageBuffer> {
    const clampedRegion = clampRegionToImage(region, sourceImage.size)
    assertRegionWithinImage(clampedRegion, sourceImage.size, regionName)

    const croppedBuffer = await sharp(sourceImage.buffer)
      .extract({
        left: clampedRegion.x,
        top: clampedRegion.y,
        width: clampedRegion.width,
        height: clampedRegion.height
      })
      .png()
      .toBuffer()

    return {
      buffer: croppedBuffer,
      size: {
        width: clampedRegion.width,
        height: clampedRegion.height
      }
    }
  }
}
