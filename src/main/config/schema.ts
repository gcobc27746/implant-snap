import type { Schema } from 'electron-store'

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
    cropMain: { ...DEFAULT_REGION_RECT },
    ocrTooth: { ...DEFAULT_REGION_RECT },
    ocrExtra: { ...DEFAULT_REGION_RECT },
    overlayAnchor: { ...DEFAULT_OVERLAY_ANCHOR }
  }
}

export const CONFIG_SCHEMA: Schema<AppConfig> = {
  screenWidth: { type: 'number', minimum: 1 },
  screenHeight: { type: 'number', minimum: 1 },
  previewEnabled: { type: 'boolean', default: true },
  requiresRegionRedefinition: { type: 'boolean', default: false },
  regions: {
    type: 'object',
    properties: {
      cropMain: {
        type: 'object',
        properties: {
          x: { type: 'number', minimum: 1 },
          y: { type: 'number', minimum: 1 },
          width: { type: 'number', minimum: 1 },
          height: { type: 'number', minimum: 1 }
        },
        required: ['x', 'y', 'width', 'height']
      },
      ocrTooth: {
        type: 'object',
        properties: {
          x: { type: 'number', minimum: 1 },
          y: { type: 'number', minimum: 1 },
          width: { type: 'number', minimum: 1 },
          height: { type: 'number', minimum: 1 }
        },
        required: ['x', 'y', 'width', 'height']
      },
      ocrExtra: {
        type: 'object',
        properties: {
          x: { type: 'number', minimum: 1 },
          y: { type: 'number', minimum: 1 },
          width: { type: 'number', minimum: 1 },
          height: { type: 'number', minimum: 1 }
        },
        required: ['x', 'y', 'width', 'height']
      },
      overlayAnchor: {
        type: 'object',
        properties: {
          x: { type: 'number', minimum: 1 },
          y: { type: 'number', minimum: 1 }
        },
        required: ['x', 'y']
      }
    },
    required: ['cropMain', 'ocrTooth', 'ocrExtra', 'overlayAnchor']
  }
}
