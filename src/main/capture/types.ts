export type ImageSize = {
  width: number
  height: number
}

export type ImageBuffer = {
  buffer: Buffer
  size: ImageSize
}

export type RegionRect = {
  x: number
  y: number
  width: number
  height: number
}

export type CropRegions = {
  cropMain: RegionRect
  ocrTooth: RegionRect
  ocrExtra: RegionRect
}

export type CropResult = {
  cropMain: ImageBuffer
  ocrTooth: ImageBuffer
  ocrExtra: ImageBuffer
}
