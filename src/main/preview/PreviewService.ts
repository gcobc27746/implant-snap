import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import type { ParsedData } from '../ocr/types'

export type PreviewResult =
  | { confirmed: true; data: ParsedData; skipPreview: boolean }
  | { confirmed: false }

export class PreviewService {
  /**
   * Open the preview window and wait for the user to confirm or cancel.
   * Returns a PreviewResult that the caller uses to decide whether to save.
   */
  showAndWait(imageBuffer: Buffer, data: ParsedData): Promise<PreviewResult> {
    return new Promise<PreviewResult>((resolve) => {
      const win = new BrowserWindow({
        width: 1100,
        height: 760,
        minWidth: 700,
        minHeight: 500,
        title: 'Preview & Confirm — ImplantSnap',
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
          // __dirname resolves to out/main/ in the bundled output,
          // so the preload is at out/preload/preview.mjs
          preload: join(__dirname, '../preload/preview.mjs'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false
        }
      })
      win.setMenuBarVisibility(false)

      // Show the window as soon as it is ready, regardless of IPC status.
      // Data is sent separately via preview:ready → preview:init handshake.
      win.once('ready-to-show', () => {
        win.show()
        win.focus()
      })

      let settled = false

      const settle = (result: PreviewResult): void => {
        if (settled) return
        settled = true
        cleanup()
        resolve(result)
      }

      const confirmHandler = (
        event: Electron.IpcMainEvent,
        payload: { tooth: string; diameter: string; length: string; skipPreview: boolean }
      ): void => {
        if (event.sender !== win.webContents) return
        settle({
          confirmed: true,
          data: {
            tooth: payload.tooth || null,
            diameter: payload.diameter || null,
            length: payload.length || null
          },
          skipPreview: payload.skipPreview
        })
      }

      const cancelHandler = (event: Electron.IpcMainEvent): void => {
        if (event.sender !== win.webContents) return
        settle({ confirmed: false })
      }

      const cleanup = (): void => {
        ipcMain.off('preview:confirm', confirmHandler)
        ipcMain.off('preview:cancel', cancelHandler)
        if (!win.isDestroyed()) win.close()
      }

      ipcMain.on('preview:confirm', confirmHandler)
      ipcMain.on('preview:cancel', cancelHandler)

      win.once('closed', () => settle({ confirmed: false }))

      // Wait for the renderer to signal it has registered its onInit listener,
      // then send the payload. This avoids the race where main sends 'preview:init'
      // before the <script type="module"> has finished registering the handler.
      const readyHandler = (event: Electron.IpcMainEvent): void => {
        if (event.sender !== win.webContents) return
        ipcMain.off('preview:ready', readyHandler)
        win.webContents.send('preview:init', {
          imageDataUrl: `data:image/png;base64,${imageBuffer.toString('base64')}`,
          tooth: data.tooth ?? '',
          diameter: data.diameter ?? '',
          length: data.length ?? ''
        })
      }
      ipcMain.on('preview:ready', readyHandler)

      // Clean up readyHandler if window is closed before it signals ready
      win.once('closed', () => ipcMain.off('preview:ready', readyHandler))

      // Load in dev vs prod
      const rendererUrl = process.env.ELECTRON_RENDERER_URL
      if (rendererUrl) {
        win.loadURL(`${rendererUrl}/preview.html`)
      } else {
        win.loadFile(join(__dirname, '../renderer/preview.html'))
      }
    })
  }
}
