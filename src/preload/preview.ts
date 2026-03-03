import { contextBridge, ipcRenderer } from 'electron'

export type PreviewInitPayload = {
  imageDataUrl: string
  toothCropDataUrl: string | null
  extraCropDataUrl: string | null
  tooth: string
  diameter: string
  length: string
  notePresets: string[]
}

export type NoteConfirmItem = {
  text: string
  /** Fractional x position within the crop image (0–1). */
  relX: number
  /** Fractional y position within the crop image (0–1). */
  relY: number
  /** Font size in image buffer pixels. */
  fontSize: number
}

export type PreviewConfirmPayload = {
  tooth: string
  diameter: string
  length: string
  notes: NoteConfirmItem[]
  skipPreview: boolean
}

const previewApi = {
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
  },
  rerender: (data: { tooth: string; diameter: string; length: string }): void => {
    ipcRenderer.send('preview:rerender', data)
  },
  onRerenderResult: (callback: (imageDataUrl: string) => void): void => {
    ipcRenderer.on('preview:rerenderResult', (_event, payload: { imageDataUrl: string }) => callback(payload.imageDataUrl))
  }
}

contextBridge.exposeInMainWorld('previewApi', previewApi)
