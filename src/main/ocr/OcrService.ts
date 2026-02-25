import { createWorker, Worker } from 'tesseract.js'
import { OcrPreprocessor } from './OcrPreprocessor'
import { OcrParser } from './OcrParser'
import type { OcrResult, OcrRawOutput, PreprocessOptions } from './types'

const OCR_TIMEOUT_MS = 15_000

export class OcrService {
  private preprocessor: OcrPreprocessor
  private parser = new OcrParser()
  private worker: Worker | null = null
  private debug: boolean

  constructor(opts?: { preprocess?: Partial<PreprocessOptions>; debug?: boolean }) {
    this.preprocessor = new OcrPreprocessor(opts?.preprocess)
    this.debug = opts?.debug ?? false
  }

  async recognize(toothBuffer: Buffer, extraBuffer: Buffer): Promise<OcrResult> {
    const worker = await this.getWorker()

    const [toothRaw, extraRaw] = await Promise.all([
      this.recognizeOne(worker, toothBuffer, 'ocrTooth'),
      this.recognizeOne(worker, extraBuffer, 'ocrExtra')
    ])

    const { parsed, errors } = this.parser.parse(toothRaw.text, extraRaw.text)

    const result: OcrResult = {
      raw: { tooth: toothRaw, extra: extraRaw },
      parsed,
      errors
    }

    if (this.debug) {
      console.log('[OcrService][debug] raw tooth:', JSON.stringify(toothRaw))
      console.log('[OcrService][debug] raw extra:', JSON.stringify(extraRaw))
      console.log('[OcrService][debug] parsed:', JSON.stringify(parsed))
      if (errors.length) console.log('[OcrService][debug] errors:', errors)
    }

    return result
  }

  async destroy(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }
  }

  private async getWorker(): Promise<Worker> {
    if (!this.worker) {
      this.worker = await createWorker('eng', undefined, {
        logger: this.debug ? (m: unknown) => console.log('[tesseract]', m) : undefined
      } as Record<string, unknown>)
    }
    return this.worker
  }

  private async recognizeOne(worker: Worker, imageBuffer: Buffer, label: string): Promise<OcrRawOutput> {
    try {
      const preprocessed = await this.preprocessor.process(imageBuffer)

      const result = await this.withTimeout(
        worker.recognize(preprocessed),
        OCR_TIMEOUT_MS,
        `${label} OCR 超時 (${OCR_TIMEOUT_MS}ms)`
      )

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[OcrService] ${label} 辨識失敗: ${msg}`)
      return { text: '', confidence: 0 }
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms)
      promise
        .then((v) => { clearTimeout(timer); resolve(v) })
        .catch((e) => { clearTimeout(timer); reject(e) })
    })
  }
}
