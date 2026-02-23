import type { ImageSize, RegionRect } from './types'

export function normalizeRegion(region: RegionRect): RegionRect {
  const x = Math.round(region.x)
  const y = Math.round(region.y)
  const width = Math.round(region.width)
  const height = Math.round(region.height)

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.max(1, width),
    height: Math.max(1, height)
  }
}

export function clampRegionToImage(region: RegionRect, imageSize: ImageSize): RegionRect {
  const normalized = normalizeRegion(region)

  const left = Math.min(Math.max(0, normalized.x), imageSize.width - 1)
  const top = Math.min(Math.max(0, normalized.y), imageSize.height - 1)

  const maxWidth = imageSize.width - left
  const maxHeight = imageSize.height - top

  return {
    x: left,
    y: top,
    width: Math.min(normalized.width, maxWidth),
    height: Math.min(normalized.height, maxHeight)
  }
}

export function assertRegionWithinImage(region: RegionRect, imageSize: ImageSize, key: string): void {
  if (region.x < 0 || region.y < 0) {
    throw new Error(`${key} 超出影像範圍：x 或 y 小於 0`)
  }

  if (region.width < 1 || region.height < 1) {
    throw new Error(`${key} 超出影像範圍：width 或 height 小於 1`)
  }

  if (region.x + region.width > imageSize.width || region.y + region.height > imageSize.height) {
    throw new Error(
      `${key} 超出影像範圍：region(${region.x},${region.y},${region.width},${region.height}) image(${imageSize.width}x${imageSize.height})`
    )
  }
}
