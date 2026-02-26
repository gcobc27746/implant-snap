import sharp from 'sharp'
import type { PreprocessOptions } from './types'
import { DEFAULT_PREPROCESS } from './types'

export class OcrPreprocessor {
  private opts: PreprocessOptions

  constructor(opts?: Partial<PreprocessOptions>) {
    this.opts = { ...DEFAULT_PREPROCESS, ...opts }
  }

  async process(imageBuffer: Buffer): Promise<Buffer> {
    let pipeline = sharp(imageBuffer)

    if (this.opts.grayscale) {
      pipeline = pipeline.grayscale()
    }

    if (this.opts.contrast !== 1) {
      pipeline = pipeline.linear(this.opts.contrast, -(128 * this.opts.contrast - 128))
    }

    if (this.opts.sharpen) {
      pipeline = pipeline.sharpen({ sigma: 1.5 })
    }

    if (this.opts.scale !== 1) {
      const meta = await sharp(imageBuffer).metadata()
      if (meta.width && meta.height) {
        pipeline = pipeline.resize(
          Math.round(meta.width * this.opts.scale),
          Math.round(meta.height * this.opts.scale),
          { kernel: 'lanczos3' }
        )
      }
    }

    if (this.opts.threshold > 0) {
      pipeline = pipeline.threshold(this.opts.threshold)
    }

    return pipeline.png().toBuffer()
  }
}
