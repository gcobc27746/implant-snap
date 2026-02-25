import type { ImageSize, RegionRect } from './types'

export function normalizeRegion(region: RegionRect): RegionRect {
  return {
    x: Math.max(0, Math.round(region.x)),
    y: Math.max(0, Math.round(region.y)),
    width: Math.max(1, Math.round(region.width)),
    height: Math.max(1, Math.round(region.height))
  }
}

export function clampRegionToImage(region: RegionRect, imageSize: ImageSize): RegionRect {
  const n = normalizeRegion(region)
  const left = Math.min(Math.max(0, n.x), imageSize.width - 1)
  const top = Math.min(Math.max(0, n.y), imageSize.height - 1)
  return {
    x: left,
    y: top,
    width: Math.min(n.width, imageSize.width - left),
    height: Math.min(n.height, imageSize.height - top)
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
