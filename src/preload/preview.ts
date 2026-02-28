import { contextBridge, ipcRenderer } from 'electron'

export type PreviewInitPayload = {
  imageDataUrl: string
  toothCropDataUrl: string | null
  extraCropDataUrl: string | null
  tooth: string
  diameter: string
  length: string
}

export type PreviewConfirmPayload = {
  tooth: string
  diameter: string
  length: string
  skipPreview: boolean
}

const previewApi = {
  /** Called by the renderer after it has registered the onInit callback. */
  signalReady: (): void => {
    ipcRenderer.send('preview:ready')
  },
  onInit: (callback: (data: PreviewInitPayload) => void): void => {
    ipcRenderer.on('preview:init', (_event, data: PreviewInitPayload) => callback(data))
  },
  confirm: (result: PreviewConfirmPayload): void => {
    ipcRenderer.send('preview:confirm', result)
  },
  cancel: (): void => {
    ipcRenderer.send('preview:cancel')
  }
}

contextBridge.exposeInMainWorld('previewApi', previewApi)
