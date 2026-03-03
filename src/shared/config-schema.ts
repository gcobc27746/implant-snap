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

export const DEFAULT_NOTE_PRESETS: string[] = [
  '骨量不足 需補骨\n需做上顎竇增高術',
  '拔牙後 頰側需補骨',
  '因平行需求\n顎側植體稍微露出 需補骨'
]

export type AppConfig = {
  screenWidth: number
  screenHeight: number
  previewEnabled: boolean
  requiresRegionRedefinition: boolean
  outputDir: string
  sidecarEnabled: boolean
  notePresets: string[]
  regions: {
    cropMain: RegionRect
    ocrTooth: RegionRect
    ocrExtra: RegionRect
    cropTable: RegionRect
    overlayAnchor: AnchorPoint
  }
}

export type RegionKey = keyof AppConfig['regions']

export const RECT_REGION_KEYS = ['cropMain', 'ocrTooth', 'ocrExtra', 'cropTable'] as const
export type RectRegionKey = (typeof RECT_REGION_KEYS)[number]

export const DEFAULT_REGION_RECT: RegionRect = { x: 1, y: 1, width: 100, height: 100 }
export const DEFAULT_OVERLAY_ANCHOR: AnchorPoint = { x: 1, y: 1 }

export const DEFAULT_CONFIG: AppConfig = {
  screenWidth: 1920,
  screenHeight: 1080,
  previewEnabled: true,
  requiresRegionRedefinition: false,
  outputDir: '',
  sidecarEnabled: false,
  notePresets: DEFAULT_NOTE_PRESETS,
  regions: {
    cropMain: { x: 720, y: 90, width: 980, height: 920 },
    ocrTooth: { x: 1080, y: 120, width: 160, height: 90 },
    ocrExtra: { x: 1180, y: 700, width: 520, height: 360 },
    cropTable: { x: 27, y: 588, width: 300, height: 432 },
    overlayAnchor: { x: 760, y: 120 }
  }
}

export type ValidationResult = { valid: boolean; errors: string[] }

export function isRectRegion(key: RegionKey): key is RectRegionKey {
  return (RECT_REGION_KEYS as readonly string[]).includes(key)
}
