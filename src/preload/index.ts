import { contextBridge, ipcRenderer } from 'electron'
import type { AppConfig } from '../main/config/schema'
import type { PipelineExecuteResult, PipelineNotice } from '../shared/pipeline-schema'

type ValidationResult = { valid: boolean; errors: string[] }
type CaptureFullScreenResult = { dataUrl: string; width: number; height: number }
type DisplayInfo = { id: string; name: string; width: number; height: number }
type OcrResultPayload = {
  raw: { tooth: { text: string; confidence: number }; extra: { text: string; confidence: number } }
  parsed: { tooth: string | null; diameter: string | null; length: string | null }
  errors: string[]
}
type PipelineRunResult = { capture: CaptureFullScreenResult; ocr: OcrResultPayload }

const configApi = {
  load: (): Promise<AppConfig> => ipcRenderer.invoke('config:load'),
  save: (nextConfig: AppConfig): Promise<AppConfig> => ipcRenderer.invoke('config:save', nextConfig),
  validate: (candidate: AppConfig): Promise<ValidationResult> =>
    ipcRenderer.invoke('config:validate', candidate),
  reset: (): Promise<AppConfig> => ipcRenderer.invoke('config:reset')
}

const captureApi = {
  listDisplays: (): Promise<DisplayInfo[]> => ipcRenderer.invoke('capture:listDisplays'),
  selectDisplay: (displayId: string | null): Promise<void> => ipcRenderer.invoke('capture:selectDisplay', displayId),
  fullScreen: (displayId?: string): Promise<CaptureFullScreenResult> => ipcRenderer.invoke('capture:fullScreen', displayId),
  onResult: (callback: (result: CaptureFullScreenResult) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: CaptureFullScreenResult) => callback(result)
    ipcRenderer.on('capture:result', handler)
    return () => ipcRenderer.removeListener('capture:result', handler)
  }
}

const pipelineApi = {
  run: (displayId?: string): Promise<PipelineRunResult> => ipcRenderer.invoke('pipeline:run', displayId),
  execute: (displayId?: string): Promise<PipelineExecuteResult> => ipcRenderer.invoke('pipeline:execute', displayId),
  onOcrResult: (callback: (result: OcrResultPayload) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: OcrResultPayload) => callback(result)
    ipcRenderer.on('pipeline:ocrResult', handler)
    return () => ipcRenderer.removeListener('pipeline:ocrResult', handler)
  },
  onNotice: (callback: (notice: PipelineNotice) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, notice: PipelineNotice) => callback(notice)
    ipcRenderer.on('pipeline:notice', handler)
    return () => ipcRenderer.removeListener('pipeline:notice', handler)
  },
  onExecuted: (callback: (result: PipelineExecuteResult) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: PipelineExecuteResult) => callback(result)
    ipcRenderer.on('pipeline:executed', handler)
    return () => ipcRenderer.removeListener('pipeline:executed', handler)
  }
}

contextBridge.exposeInMainWorld('implantSnap', {
  config: configApi,
  capture: captureApi,
  pipeline: pipelineApi
})
