import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { AppLifecycleService } from './lifecycle/AppLifecycleService'
import { ConfigService } from './config/ConfigService'
import type { AppConfig } from './config/schema'

const configService = new ConfigService()
let mainWindow: BrowserWindow | null = null

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1100,
    height: 720,
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
  if (!mainWindow) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show()
  }
  mainWindow.focus()
}

function registerIpcHandlers(): void {
  ipcMain.handle('config:load', () => {
    return configService.load()
  })
  ipcMain.handle('config:save', (_event, nextConfig: AppConfig) => {
    return configService.save(nextConfig)
  })
  ipcMain.handle('config:validate', (_event, candidate: AppConfig) => {
    return configService.validate(candidate)
  })
  ipcMain.handle('config:reset', () => {
    return configService.reset()
  })
}

app.whenReady().then(() => {
  mainWindow = createMainWindow()

  const lifecycleService = new AppLifecycleService(showAndFocusConfigWindow)
  lifecycleService.attachWindowCloseBehavior(mainWindow)
  lifecycleService.initializeTray()

  // 啟動時載入設定，會順便做解析度比對與標記。
  configService.load()
  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  // Step 01 需要系統匣常駐，不在這裡自動退出。
})
