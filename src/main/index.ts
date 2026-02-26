import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join } from 'node:path'
import { AppLifecycleService } from './lifecycle/AppLifecycleService'
import { ConfigService } from './config/ConfigService'
import type { AppConfig } from './config/schema'
import { CaptureService } from './capture/CaptureService'
import { CropService } from './capture/CropService'
import { OcrService } from './ocr/OcrService'
import { CapturePipelineRunner } from './pipeline/CapturePipelineRunner'

const configService = new ConfigService()
const captureService = new CaptureService()
const cropService = new CropService()

function bufferToDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const PREPROCESSED_LABELS: Record<string, string> = {
  ocrTooth: 'OCR 牙位 (預處理後)',
  ocrExtra: 'OCR 附加資訊 (預處理後)'
}

function showPreprocessedImagePopup(label: string, buffer: Buffer): void {
  const title = PREPROCESSED_LABELS[label] ?? `${label} (預處理後)`
  const dataUrl = bufferToDataUrl(buffer)
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-width: 200px; min-height: 120px;
      padding: 12px; background: #1e293b;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: system-ui, sans-serif; color: #e2e8f0;
    }
    h2 { font-size: 14px; margin-bottom: 8px; color: #94a3b8; }
    img { max-width: 100%; max-height: 85vh; object-fit: contain; image-rendering: pixelated; image-rendering: crisp-edges; }
  </style>
</head>
<body>
  <h2>${escapeHtml(title)}</h2>
  <img src="${dataUrl}" alt="預處理預覽" />
</body>
</html>`
  const win = new BrowserWindow({
    width: 420,
    height: 360,
    title,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  win.setMenuBarVisibility(false)
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
}

const ocrService = new OcrService({
  debug: true
})
const pipelineRunner = new CapturePipelineRunner(captureService, cropService, ocrService)
let mainWindow: BrowserWindow | null = null
let selectedDisplayId: string | undefined

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  window.on('ready-to-show', () => {
    window.show()
    window.focus()
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererUrl) {
    window.loadURL(rendererUrl)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

function showAndFocusConfigWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  if (!mainWindow.isVisible()) mainWindow.show()
  mainWindow.focus()
}

function registerIpcHandlers(): void {
  ipcMain.handle('config:load', () => configService.load())
  ipcMain.handle('config:save', (_event, nextConfig: AppConfig) => configService.save(nextConfig))
  ipcMain.handle('config:validate', (_event, candidate: AppConfig) => configService.validate(candidate))
  ipcMain.handle('config:reset', () => configService.reset())

  ipcMain.handle('capture:listDisplays', () => captureService.listDisplays())

  ipcMain.handle('capture:selectDisplay', (_event, displayId: string | null) => {
    selectedDisplayId = displayId ?? undefined
  })

  ipcMain.handle('capture:fullScreen', async (_event, displayId?: string) => {
    const id = displayId ?? selectedDisplayId
    const { buffer, size } = await captureService.captureFullScreen(id)
    return { dataUrl: bufferToDataUrl(buffer), width: size.width, height: size.height }
  })

  ipcMain.handle('pipeline:run', async (_event, displayId?: string) => {
    const id = displayId ?? selectedDisplayId
    const currentConfig = configService.load()
    const { fullScreen, ocr } = await pipelineRunner.run(currentConfig, id)
    return {
      capture: {
        dataUrl: bufferToDataUrl(fullScreen.buffer),
        width: fullScreen.size.width,
        height: fullScreen.size.height
      },
      ocr
    }
  })
}

function registerCaptureShortcut(): void {
  const shortcut = 'CommandOrControl+Shift+S'
  const registered = globalShortcut.register(shortcut, async () => {
    try {
      const currentConfig = configService.load()
      const { traceId, fullScreen, ocr } = await pipelineRunner.run(currentConfig, selectedDisplayId)

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('capture:result', {
          dataUrl: bufferToDataUrl(fullScreen.buffer),
          width: fullScreen.size.width,
          height: fullScreen.size.height
        })
        mainWindow.webContents.send('pipeline:ocrResult', ocr)
      }

      console.log(`[CapturePipeline][${traceId}] 快捷鍵流程執行成功。`)
    } catch (error) {
      console.error(`[CapturePipeline] 快捷鍵流程失敗: ${(error as Error).message}`)
    }
  })
  if (!registered) {
    console.error(`[CapturePipeline] 無法註冊全域快捷鍵: ${shortcut}`)
  }
}

app.whenReady().then(() => {
  mainWindow = createMainWindow()

  const lifecycleService = new AppLifecycleService(showAndFocusConfigWindow)
  lifecycleService.attachWindowCloseBehavior(mainWindow)
  lifecycleService.initializeTray()

  configService.load()
  registerIpcHandlers()
  registerCaptureShortcut()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  // 系統匣常駐，不在這裡自動退出。
})
