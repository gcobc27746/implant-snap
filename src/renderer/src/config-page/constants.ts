import type { RegionKey, RectRegionKey } from '@shared/config-schema'

export const REGION_META: Record<
  RegionKey,
  { label: string; color: string; tagTextColor: string; fill: string }
> = {
  cropMain: {
    label: 'MAIN CROP',
    color: '#10b981',
    tagTextColor: '#ffffff',
    fill: 'rgba(16, 185, 129, 0.08)'
  },
  ocrTooth: {
    label: 'OCR: TOOTH',
    color: '#137fec',
    tagTextColor: '#ffffff',
    fill: 'rgba(19, 127, 236, 0.12)'
  },
  ocrExtra: {
    label: 'OCR: DATA',
    color: '#22d3ee',
    tagTextColor: '#0f172a',
    fill: 'rgba(34, 211, 238, 0.08)'
  },
  cropTable: {
    label: 'TABLE',
    color: '#f59e0b',
    tagTextColor: '#ffffff',
    fill: 'rgba(245, 158, 11, 0.08)'
  },
  overlayAnchor: {
    label: 'ANCHOR',
    color: '#137fec',
    tagTextColor: '#ffffff',
    fill: 'rgba(19, 127, 236, 0.4)'
  }
}

export const RECT_KEYS: RectRegionKey[] = ['cropMain', 'ocrTooth', 'ocrExtra', 'cropTable']

export const ANCHOR_RADIUS = 16
export const MIN_LAYER_SCALE = 0.1
export const MAX_LAYER_SCALE = 10
export const ZOOM_FACTOR = 1.15
export const WHEEL_PAN_PX = 40
