import { contextBridge, ipcRenderer } from 'electron'
import type { AppConfig } from '../main/config/schema'

type ValidationResult = {
  valid: boolean
  errors: string[]
}

const configApi = {
  load: (): Promise<AppConfig> => ipcRenderer.invoke('config:load'),
  save: (nextConfig: AppConfig): Promise<AppConfig> => ipcRenderer.invoke('config:save', nextConfig),
  validate: (candidate: AppConfig): Promise<ValidationResult> =>
    ipcRenderer.invoke('config:validate', candidate),
  reset: (): Promise<AppConfig> => ipcRenderer.invoke('config:reset')
}

contextBridge.exposeInMainWorld('implantSnap', {
  config: configApi
})
