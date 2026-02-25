import { contextBridge, ipcRenderer } from 'electron'
import type { AppConfig } from '../main/config/schema'

type ValidationResult = { valid: boolean; errors: string[] }
type CaptureFullScreenResult = { dataUrl: string; width: number; height: number }

const configApi = {
  load: (): Promise<AppConfig> => ipcRenderer.invoke('config:load'),
  save: (nextConfig: AppConfig): Promise<AppConfig> => ipcRenderer.invoke('config:save', nextConfig),
  validate: (candidate: AppConfig): Promise<ValidationResult> =>
    ipcRenderer.invoke('config:validate', candidate),
  reset: (): Promise<AppConfig> => ipcRenderer.invoke('config:reset')
}

const captureApi = {
  fullScreen: (): Promise<CaptureFullScreenResult> => ipcRenderer.invoke('capture:fullScreen')
}

contextBridge.exposeInMainWorld('implantSnap', {
  config: configApi,
  capture: captureApi
})
