import type { Schema } from 'electron-store'
import {
  DEFAULT_CONFIG,
  DEFAULT_OVERLAY_ANCHOR,
  DEFAULT_REGION_RECT,
  type AnchorPoint,
  type AppConfig,
  type RegionRect
} from '../../shared/config-schema'

export type { AnchorPoint, AppConfig, RegionRect }
export { DEFAULT_CONFIG, DEFAULT_OVERLAY_ANCHOR, DEFAULT_REGION_RECT }

export const CONFIG_SCHEMA: Schema<AppConfig> = {
  screenWidth: { type: 'number', minimum: 1 },
  screenHeight: { type: 'number', minimum: 1 },
  previewEnabled: { type: 'boolean', default: true },
  outputDir: { type: 'string', minLength: 1, default: 'ScreenshotOutput' },
  sidecarEnabled: { type: 'boolean', default: true },
  forceSaveOnParseIncomplete: { type: 'boolean', default: false },
  overlayFontSize: { type: 'number', minimum: 12, maximum: 72, default: 28 },
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
