import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join } from 'node:path'
import { AppLifecycleService } from './lifecycle/AppLifecycleService'
import { ConfigService } from './config/ConfigService'
import type { AppConfig } from './config/schema'
import { CaptureService } from './capture/CaptureService'
import { CropService } from './capture/CropService'
import { CapturePipelineRunner } from './pipeline/CapturePipelineRunner'

const configService = new ConfigService()
const captureService = new CaptureService()
const cropService = new CropService()
const pipelineRunner = new CapturePipelineRunner(captureService, cropService)
let mainWindow: BrowserWindow | null = null

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

  ipcMain.handle('capture:fullScreen', async () => {
    const { buffer, size } = await captureService.captureFullScreen()
    const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`
    return { dataUrl, width: size.width, height: size.height }
  })
}

function registerCaptureShortcut(): void {
  const shortcut = 'CommandOrControl+Shift+S'
  const registered = globalShortcut.register(shortcut, async () => {
    try {
      const currentConfig = configService.load()
      const { traceId } = await pipelineRunner.run(currentConfig)
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
