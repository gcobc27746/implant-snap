import Store from 'electron-store'
import { screen } from 'electron'
import {
  CONFIG_SCHEMA,
  DEFAULT_CONFIG,
  type AnchorPoint,
  type AppConfig,
  type RegionRect
} from './schema'

type ValidationResult = {
  valid: boolean
  errors: string[]
}

export class ConfigService {
  private readonly store: Store<AppConfig>

  constructor() {
    this.store = new Store<AppConfig>({
      name: 'implant-snap-config',
      defaults: DEFAULT_CONFIG,
      schema: CONFIG_SCHEMA
    })
  }

  load(): AppConfig {
    const mergedConfig = this.withDefaults(this.store.store as Partial<AppConfig>)
    const currentScreen = this.getCurrentScreenSize()

    const requiresRegionRedefinition =
      mergedConfig.screenWidth !== currentScreen.width ||
      mergedConfig.screenHeight !== currentScreen.height

    const nextConfig: AppConfig = {
      ...mergedConfig,
      screenWidth: currentScreen.width,
      screenHeight: currentScreen.height,
      requiresRegionRedefinition
    }

    this.store.set(nextConfig)
    return nextConfig
  }

  save(nextConfig: AppConfig): AppConfig {
    const currentScreen = this.getCurrentScreenSize()
    const normalizedConfig: AppConfig = {
      ...nextConfig,
      screenWidth: currentScreen.width,
      screenHeight: currentScreen.height
    }

    const validation = this.validate(normalizedConfig)
    if (!validation.valid) {
      throw new Error(validation.errors.join('\n'))
    }

    this.store.set(normalizedConfig)
    return normalizedConfig
  }

  validate(config: AppConfig): ValidationResult {
    const errors: string[] = []
    const { screenWidth, screenHeight, regions } = config

    if (!this.isPositiveInteger(screenWidth) || !this.isPositiveInteger(screenHeight)) {
      errors.push('screenWidth 與 screenHeight 必須為正整數。')
    }

    this.validateRect('regions.cropMain', regions.cropMain, screenWidth, screenHeight, errors)
    this.validateRect('regions.ocrTooth', regions.ocrTooth, screenWidth, screenHeight, errors)
    this.validateRect('regions.ocrExtra', regions.ocrExtra, screenWidth, screenHeight, errors)
    this.validateAnchor('regions.overlayAnchor', regions.overlayAnchor, screenWidth, screenHeight, errors)

    return {
      valid: errors.length === 0,
      errors
    }
  }

  reset(): AppConfig {
    const currentScreen = this.getCurrentScreenSize()
    const resetConfig: AppConfig = {
      ...DEFAULT_CONFIG,
      screenWidth: currentScreen.width,
      screenHeight: currentScreen.height,
      requiresRegionRedefinition: false
    }

    this.store.set(resetConfig)
    return resetConfig
  }

  private withDefaults(partialConfig: Partial<AppConfig>): AppConfig {
    return {
      ...DEFAULT_CONFIG,
      ...partialConfig,
      regions: {
        ...DEFAULT_CONFIG.regions,
        ...partialConfig.regions
      }
    }
  }

  private getCurrentScreenSize(): { width: number; height: number } {
    const { width, height } = screen.getPrimaryDisplay().bounds
    return { width, height }
  }

  private validateRect(
    key: string,
    rect: RegionRect,
    screenWidth: number,
    screenHeight: number,
    errors: string[]
  ): void {
    if (
      !this.isPositiveInteger(rect.x) ||
      !this.isPositiveInteger(rect.y) ||
      !this.isPositiveInteger(rect.width) ||
      !this.isPositiveInteger(rect.height)
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

  private validateAnchor(
    key: string,
    anchor: AnchorPoint,
    screenWidth: number,
    screenHeight: number,
    errors: string[]
  ): void {
    if (!this.isPositiveInteger(anchor.x) || !this.isPositiveInteger(anchor.y)) {
      errors.push(`${key} 的 x,y 必須為正整數。`)
      return
    }

    if (anchor.x > screenWidth || anchor.y > screenHeight) {
      errors.push(`${key} 超出目前螢幕解析度範圍。`)
    }
  }

  private isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value > 0
  }
}
