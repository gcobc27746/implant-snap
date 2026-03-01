import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { join } from 'node:path'

export class AppLifecycleService {
  private tray: Tray | null = null
  private isQuitting = false

  constructor(
    private readonly openAndFocusConfigWindow: () => void,
    private readonly onCapture: () => void,
    private readonly onCheckUpdate: () => void = () => {}
  ) {}

  attachWindowCloseBehavior(window: BrowserWindow): void {
    app.on('before-quit', () => {
      this.isQuitting = true
    })

    window.on('close', (event) => {
      if (this.isQuitting) {
        return
      }

      event.preventDefault()
      window.hide()
    })
  }

  initializeTray(): void {
    if (this.tray) {
      return
    }

    this.tray = new Tray(this.createTrayIcon())
    this.tray.setToolTip('ImplantSnap')
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: '截圖',
          click: () => {
            this.onCapture()
          }
        },
        { type: 'separator' },
        {
          label: '檢查更新',
          click: () => {
            this.onCheckUpdate()
          }
        },
        {
          label: '設定',
          click: () => {
            this.openAndFocusConfigWindow()
          }
        },
        {
          label: '關閉',
          click: () => {
            this.isQuitting = true
            app.quit()
          }
        }
      ])
    )
    this.tray.on('double-click', () => {
      this.openAndFocusConfigWindow()
    })
  }

  private createTrayIcon() {
    const iconPath = app.isPackaged
      ? join(process.resourcesPath, 'icon.png')
      : join(__dirname, '../../resources/icon.png')
    return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  }
}
