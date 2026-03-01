export type ImageSize = { width: number; height: number }

export type ImageBuffer = { buffer: Buffer; size: ImageSize }

export type RegionRect = { x: number; y: number; width: number; height: number }

export type CropRegions = {
  cropMain: RegionRect
  ocrTooth: RegionRect
  ocrExtra: RegionRect
  cropTable: RegionRect
}

export type CropResult = {
  cropMain: ImageBuffer
  ocrTooth: ImageBuffer
  ocrExtra: ImageBuffer
  cropTable: ImageBuffer
}

export type DisplayInfo = {
  id: string
  name: string
  width: number
  height: number
}
