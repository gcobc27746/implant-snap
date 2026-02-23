import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'

export class AppLifecycleService {
  private tray: Tray | null = null
  private isQuitting = false

  constructor(private readonly openAndFocusConfigWindow: () => void) {}

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
    return nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2W4xQAAAAASUVORK5CYII='
    )
  }
}
