import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

export class UpdateService {
  initialize(): void {
    if (!app.isPackaged || process.env.DISABLE_AUTO_UPDATE === '1') {
      console.log('[Updater] 跳過自動更新檢查（開發模式或已停用）。')
      return
    }

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = console

    autoUpdater.on('checking-for-update', () => {
      console.log('[Updater] 檢查更新中...')
    })
    autoUpdater.on('update-available', (info) => {
      console.log(`[Updater] 發現新版本: ${info.version}`)
    })
    autoUpdater.on('update-not-available', () => {
      console.log('[Updater] 目前已是最新版本。')
    })
    autoUpdater.on('error', (error) => {
      console.error(`[Updater] 更新失敗: ${error.message}`)
    })
    autoUpdater.on('download-progress', (progress) => {
      console.log(`[Updater] 下載進度: ${Math.round(progress.percent)}%`)
    })
    autoUpdater.on('update-downloaded', (info) => {
      console.log(`[Updater] 已下載更新 ${info.version}，將在程式關閉後安裝。`)
    })

    autoUpdater.checkForUpdatesAndNotify().catch((error: Error) => {
      console.error(`[Updater] 檢查更新失敗: ${error.message}`)
    })
  }
}
