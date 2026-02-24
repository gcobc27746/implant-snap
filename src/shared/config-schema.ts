export type RegionRect = {
  x: number
  y: number
  width: number
  height: number
}

export type AnchorPoint = {
  x: number
  y: number
}

export type AppConfig = {
  screenWidth: number
  screenHeight: number
  previewEnabled: boolean
  requiresRegionRedefinition: boolean
  regions: {
    cropMain: RegionRect
    ocrTooth: RegionRect
    ocrExtra: RegionRect
    overlayAnchor: AnchorPoint
  }
}

export type RegionKey = keyof AppConfig['regions']

export const DEFAULT_REGION_RECT: RegionRect = {
  x: 1,
  y: 1,
  width: 100,
  height: 100
}

export const DEFAULT_OVERLAY_ANCHOR: AnchorPoint = {
  x: 1,
  y: 1
}

export const DEFAULT_CONFIG: AppConfig = {
  screenWidth: 1920,
  screenHeight: 1080,
  previewEnabled: true,
  requiresRegionRedefinition: false,
  regions: {
    cropMain: { x: 795, y: 571, width: 440, height: 345 },
    ocrTooth: { x: 85, y: 261, width: 72, height: 62 },
    ocrExtra: { x: 332, y: 551, width: 229, height: 300 },
    overlayAnchor: { x: 867, y: 662 }
  }
}

export type ValidationResult = {
  valid: boolean
  errors: string[]
}

export function isRegionRect(key: RegionKey): key is 'cropMain' | 'ocrTooth' | 'ocrExtra' {
  return key !== 'overlayAnchor'
}
