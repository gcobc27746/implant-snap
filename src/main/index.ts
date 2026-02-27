import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Notification } from 'electron'
import { join } from 'node:path'
import { AppLifecycleService } from './lifecycle/AppLifecycleService'
import { ConfigService } from './config/ConfigService'
import type { AppConfig } from './config/schema'
import { CaptureService } from './capture/CaptureService'
import { CropService } from './capture/CropService'
import { OcrService } from './ocr/OcrService'
import { CapturePipelineRunner } from './pipeline/CapturePipelineRunner'
import { OverlayService } from './overlay/OverlayService'
import { PreviewService } from './preview/PreviewService'
import { OutputService } from './output/OutputService'
import { AppError, ErrorCode, ERROR_MESSAGES } from './errors/AppError'
import type { ParsedData } from './ocr/types'

// ── Service singletons ──────────────────────────────────────────────────────

const configService = new ConfigService()
const captureService = new CaptureService()
const cropService = new CropService()
const ocrService = new OcrService({ debug: true })
const pipelineRunner = new CapturePipelineRunner(captureService, cropService, ocrService)
const overlayService = new OverlayService()
const previewService = new PreviewService()
const outputService = new OutputService()

// ── Helpers ─────────────────────────────────────────────────────────────────

function bufferToDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`
}

function notify(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show()
  } else {
    console.log(`[Notification] ${title}: ${body}`)
  }
}

function notifySuccess(body: string): void {
  notify('ImplantSnap', body)
}

function notifyWarning(body: string): void {
  notify('ImplantSnap ⚠', body)
}

function notifyError(body: string): void {
  notify('ImplantSnap ✗', body)
}

function log(traceId: string, step: string, msg: string): void {
  console.log(`[Pipeline][${traceId}][${step}] ${msg}`)
}

// ── Main window ──────────────────────────────────────────────────────────────

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

// ── IPC handlers ─────────────────────────────────────────────────────────────

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

  // Open folder picker dialog for output directory
  ipcMain.handle('dialog:selectOutputDir', async () => {
    const result = await dialog.showOpenDialog({
      title: '選擇輸出資料夾',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}

// ── Full pipeline: capture → crop → OCR → overlay → preview → save ──────────

async function runFullPipeline(traceId: string): Promise<void> {
  const currentConfig = configService.load()

  // 1. Capture + Crop + OCR
  log(traceId, 'pipeline', '開始截圖 → 裁切 → OCR 流程')
  const { fullScreen, crops, ocr } = await pipelineRunner.run(currentConfig, selectedDisplayId)
  log(traceId, 'ocr', `tooth="${ocr.parsed.tooth ?? '?'}" d="${ocr.parsed.diameter ?? '?'}" l="${ocr.parsed.length ?? '?'}"`)

  // Propagate capture result to config window (for canvas preview)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('capture:result', {
      dataUrl: bufferToDataUrl(fullScreen.buffer),
      width: fullScreen.size.width,
      height: fullScreen.size.height
    })
    mainWindow.webContents.send('pipeline:ocrResult', ocr)
  }

  // 2. Overlay
  let overlayedBuffer: Buffer
  try {
    overlayedBuffer = await overlayService.composite(
      crops.cropMain.buffer,
      currentConfig.regions.overlayAnchor,
      currentConfig.regions.cropMain,
      ocr.parsed
    )
    log(traceId, 'overlay', '疊加完成')
  } catch (e) {
    log(traceId, 'overlay', `疊加失敗 (fallback): ${(e as Error).message}`)
    overlayedBuffer = crops.cropMain.buffer
    notifyWarning(ERROR_MESSAGES[ErrorCode.OVERLAY_FAILED])
  }

  // 3. Determine whether to show preview
  let confirmedData: ParsedData = ocr.parsed
  const reloadedConfig = configService.load()

  if (reloadedConfig.previewEnabled) {
    log(traceId, 'preview', 'opening preview window')
    const result = await previewService.showAndWait(overlayedBuffer, ocr.parsed)

    if (!result.confirmed) {
      log(traceId, 'preview', 'user cancelled — aborting')
      return
    }

    confirmedData = result.data

    if (result.skipPreview) {
      const updated = configService.load()
      configService.save({ ...updated, previewEnabled: false })
      log(traceId, 'preview', 'previewEnabled set to false')
    }

    // Re-render overlay if user modified data
    const dataChanged =
      confirmedData.tooth !== ocr.parsed.tooth ||
      confirmedData.diameter !== ocr.parsed.diameter ||
      confirmedData.length !== ocr.parsed.length

    if (dataChanged) {
      try {
        overlayedBuffer = await overlayService.composite(
          crops.cropMain.buffer,
          reloadedConfig.regions.overlayAnchor,
          reloadedConfig.regions.cropMain,
          confirmedData
        )
        log(traceId, 'overlay', '使用修改後資料重新疊加')
      } catch {
        // keep previous overlayedBuffer
      }
    }
  }

  // 4. Error policy: handle incomplete parse
  if (ocr.errors.length > 0) {
    const allMissing = !confirmedData.tooth && !confirmedData.diameter && !confirmedData.length
    if (allMissing) {
      notifyWarning(ERROR_MESSAGES[ErrorCode.PARSE_INCOMPLETE])
      // Default policy: don't save when completely unparsed
      // (unless user confirmed via preview with manual edits)
      const hasManualData = confirmedData.tooth || confirmedData.diameter || confirmedData.length
      if (!hasManualData && !reloadedConfig.previewEnabled) {
        log(traceId, 'save', '解析完全失敗且無預覽確認，中止儲存')
        return
      }
    }
  }

  // 5. Save output
  log(traceId, 'save', `輸出至 "${reloadedConfig.outputDir || '(預設桌面)'}"`)
  const { filePath } = await outputService.save(
    overlayedBuffer,
    confirmedData,
    reloadedConfig.outputDir,
    reloadedConfig.sidecarEnabled
  )

  log(traceId, 'save', `儲存完成: ${filePath}`)
  notifySuccess(`已儲存：${filePath}`)
}

// ── Global shortcut ──────────────────────────────────────────────────────────

function registerCaptureShortcut(): void {
  const shortcut = 'CommandOrControl+Shift+S'
  const registered = globalShortcut.register(shortcut, async () => {
    const traceId = crypto.randomUUID().slice(0, 8)
    try {
      await runFullPipeline(traceId)
    } catch (error) {
      const appErr = error instanceof AppError ? error : null
      const code = appErr?.code ?? 'UNKNOWN'
      const message = appErr
        ? ERROR_MESSAGES[appErr.code] ?? appErr.message
        : (error as Error).message

      console.error(`[Pipeline][${traceId}][ERROR] ${code}: ${message}`, error)
      notifyError(message)
    }
  })

  if (!registered) {
    console.error(`[Pipeline] 無法註冊全域快捷鍵: ${shortcut}`)
  }
}

// ── App lifecycle ────────────────────────────────────────────────────────────

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
