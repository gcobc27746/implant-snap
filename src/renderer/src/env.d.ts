import type { AppConfig } from '../../main/config/schema'

type ValidationResult = {
  valid: boolean
  errors: string[]
}

type ImplantSnapApi = {
  config: {
    load: () => Promise<AppConfig>
    save: (nextConfig: AppConfig) => Promise<AppConfig>
    validate: (candidate: AppConfig) => Promise<ValidationResult>
    reset: () => Promise<AppConfig>
  }
}

declare global {
  interface Window {
    implantSnap: ImplantSnapApi
  }
}

export {}
