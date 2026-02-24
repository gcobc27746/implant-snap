import type { AppConfig, ValidationResult } from '@shared/config-schema'

type CaptureFullScreenResult = { dataUrl: string; width: number; height: number }

type ImplantSnapApi = {
  config: {
    load: () => Promise<AppConfig>
    save: (nextConfig: AppConfig) => Promise<AppConfig>
    validate: (candidate: AppConfig) => Promise<ValidationResult>
    reset: () => Promise<AppConfig>
  }
  capture: {
    fullScreen: () => Promise<CaptureFullScreenResult>
  }
}

declare global {
  interface Window {
    implantSnap: ImplantSnapApi
  }
}

export {}
