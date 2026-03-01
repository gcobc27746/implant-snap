import { app, dialog } from 'electron'
import { createRequire } from 'node:module'
import type { BrowserWindow } from 'electron'
import type { UpdateInfo } from 'electron-updater'

// electron-updater is a CJS module; use createRequire for ESM-output main process
const { autoUpdater } = createRequire(import.meta.url)('electron-updater') as typeof import('electron-updater')

type ReleaseNoteInfo = { version: string; note: string | null }

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export class UpdaterService {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly getMainWindow: () => BrowserWindow | null) {}

  init(): void {
    if (!app.isPackaged) {
      console.log('[Updater] 開發模式 — 自動更新停用')
      return
    }

    // Suppress electron-updater's own verbose logging; we handle events ourselves.
    autoUpdater.logger = null
    autoUpdater.autoDownload = false       // ask user before downloading
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      void this.promptDownload(info)
    })

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      void this.promptInstall(info)
    })

    autoUpdater.on('error', (err: Error) => {
      console.error('[Updater] 更新錯誤:', err.message)
    })

    // Check immediately on startup (2 s grace period for window to appear).
    setTimeout(() => void this.check(), 2_000)

    // Hourly background check.
    this.timer = setInterval(() => void this.check(), CHECK_INTERVAL_MS)
  }

  destroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /** Trigger an immediate check (e.g. from tray menu or IPC). */
  async checkNow(): Promise<void> {
    if (!app.isPackaged) {
      console.log('[Updater] 開發模式 — 跳過手動檢查')
      return
    }
    await this.check()
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async check(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      console.error('[Updater] 檢查更新失敗:', (err as Error).message)
    }
  }

  private async promptDownload(info: UpdateInfo): Promise<void> {
    const notes = this.formatNotes(info.releaseNotes)
    const options = {
      type: 'info' as const,
      title: 'ImplantSnap 更新可用',
      message: `新版本 v${info.version} 已發布`,
      detail: notes
        ? `更新說明：\n${notes}\n\n是否立即下載更新？`
        : '是否立即下載更新？',
      buttons: ['下載更新', '稍後再說'],
      defaultId: 0,
      cancelId: 1
    }

    const win = this.getMainWindow()
    const { response } = win
      ? await dialog.showMessageBox(win, options)
      : await dialog.showMessageBox(options)

    if (response === 0) {
      autoUpdater.downloadUpdate().catch((err: Error) => {
        console.error('[Updater] 下載失敗:', err.message)
      })
    }
  }

  private async promptInstall(info: UpdateInfo): Promise<void> {
    const options = {
      type: 'info' as const,
      title: 'ImplantSnap 更新就緒',
      message: `v${info.version} 已下載完成`,
      detail: '重新啟動應用程式以完成安裝',
      buttons: ['立即重啟安裝', '稍後'],
      defaultId: 0,
      cancelId: 1
    }

    const win = this.getMainWindow()
    const { response } = win
      ? await dialog.showMessageBox(win, options)
      : await dialog.showMessageBox(options)

    if (response === 0) {
      autoUpdater.quitAndInstall()
    }
  }

  private formatNotes(notes: UpdateInfo['releaseNotes']): string {
    if (!notes) return ''
    if (typeof notes === 'string') return notes.replace(/<[^>]+>/g, '').trim()
    return (notes as ReleaseNoteInfo[])
      .map(n => n.note ?? '')
      .filter(Boolean)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim()
  }
}
