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
const ocrService = new OcrService({ debug: true })
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

function bufferToDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`
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
