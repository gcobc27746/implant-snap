import type {
  AppConfig,
  RegionKey,
  ValidationResult
} from '@shared/config-schema'
import {
  DEFAULT_CONFIG,
  type RegionRect,
  type AnchorPoint
} from '@shared/config-schema'

const STORAGE_KEY = 'implant-snap-web-config'

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

function validateRect(
  key: string,
  rect: RegionRect,
  screenWidth: number,
  screenHeight: number,
  errors: string[]
): void {
  if (
    !isPositiveInteger(rect.x) ||
    !isPositiveInteger(rect.y) ||
    !isPositiveInteger(rect.width) ||
    !isPositiveInteger(rect.height)
  ) {
    errors.push(`${key} 的 x,y,width,height 必須為正整數。`)
    return
  }
  const withinWidth = rect.x + rect.width - 1 <= screenWidth
  const withinHeight = rect.y + rect.height - 1 <= screenHeight
  if (!withinWidth || !withinHeight) {
    errors.push(`${key} 超出目前螢幕解析度範圍。`)
  }
}

function validateAnchor(
  key: string,
  anchor: AnchorPoint,
  screenWidth: number,
  screenHeight: number,
  errors: string[]
): void {
  if (!isPositiveInteger(anchor.x) || !isPositiveInteger(anchor.y)) {
    errors.push(`${key} 的 x,y 必須為正整數。`)
    return
  }
  if (anchor.x > screenWidth || anchor.y > screenHeight) {
    errors.push(`${key} 超出目前螢幕解析度範圍。`)
  }
}

function validate(config: AppConfig): ValidationResult {
  const errors: string[] = []
  const { screenWidth, screenHeight, regions } = config
  if (!isPositiveInteger(screenWidth) || !isPositiveInteger(screenHeight)) {
    errors.push('screenWidth 與 screenHeight 必須為正整數。')
  }
  validateRect('regions.cropMain', regions.cropMain, screenWidth, screenHeight, errors)
  validateRect('regions.ocrTooth', regions.ocrTooth, screenWidth, screenHeight, errors)
  validateRect('regions.ocrExtra', regions.ocrExtra, screenWidth, screenHeight, errors)
  validateAnchor('regions.overlayAnchor', regions.overlayAnchor, screenWidth, screenHeight, errors)
  return { valid: errors.length === 0, errors }
}

function loadFromStorage(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      regions: {
        ...DEFAULT_CONFIG.regions,
        ...parsed.regions
      }
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function saveToStorage(config: AppConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function createWebConfigApi(): { config: typeof window.implantSnap.config } {
  let memoryConfig: AppConfig = loadFromStorage()
  const screenWidth = typeof window !== 'undefined' ? window.screen?.width ?? 1920 : 1920
  const screenHeight = typeof window !== 'undefined' ? window.screen?.height ?? 1080 : 1080

  return {
    config: {
      load: async (): Promise<AppConfig> => {
        memoryConfig = loadFromStorage()
        memoryConfig = {
          ...memoryConfig,
          screenWidth,
          screenHeight,
          requiresRegionRedefinition:
            memoryConfig.screenWidth !== screenWidth || memoryConfig.screenHeight !== screenHeight
        }
        saveToStorage(memoryConfig)
        return memoryConfig
      },
      save: async (nextConfig: AppConfig): Promise<AppConfig> => {
        const normalized: AppConfig = {
          ...nextConfig,
          screenWidth,
          screenHeight
        }
        const result = validate(normalized)
        if (!result.valid) throw new Error(result.errors.join('\n'))
        memoryConfig = normalized
        saveToStorage(memoryConfig)
        return memoryConfig
      },
      validate: async (candidate: AppConfig): Promise<ValidationResult> => {
        return validate({
          ...candidate,
          screenWidth,
          screenHeight
        })
      },
      reset: async (): Promise<AppConfig> => {
        memoryConfig = {
          ...DEFAULT_CONFIG,
          screenWidth,
          screenHeight,
          requiresRegionRedefinition: false
        }
        saveToStorage(memoryConfig)
        return memoryConfig
      }
    }
  }
}
