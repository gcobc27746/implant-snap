import { BrowserWindow, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import type { ParsedSnapshot } from '../../shared/pipeline-schema'

export type PreviewOpenInput = {
  imageDataUrl: string
  parsed: ParsedSnapshot
  overlayText: string | null
}

export type PreviewOpenResult = {
  action: 'save' | 'cancel'
  parsed: ParsedSnapshot
  skipPreview: boolean
}

export class PreviewService {
  async open(parent: BrowserWindow | null, input: PreviewOpenInput): Promise<PreviewOpenResult> {
    const channel = `preview:result:${randomUUID()}`
    const html = this.buildHtml(channel, input)
    const previewWindow = new BrowserWindow({
      width: 1040,
      height: 820,
      show: false,
      title: 'Preview & Confirm',
      parent: parent ?? undefined,
      modal: Boolean(parent),
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
        sandbox: false
      }
    })
    previewWindow.setMenuBarVisibility(false)

    const fallbackResult: PreviewOpenResult = {
      action: 'cancel',
      parsed: input.parsed,
      skipPreview: false
    }

    return await new Promise<PreviewOpenResult>((resolve) => {
      let settled = false

      const settle = (result: PreviewOpenResult) => {
        if (settled) return
        settled = true
        ipcMain.removeListener(channel, onResult)
        resolve(result)
      }

      const onResult = (_event: Electron.IpcMainEvent, result: PreviewOpenResult) => {
        settle(result)
        if (!previewWindow.isDestroyed()) {
          previewWindow.close()
        }
      }

      ipcMain.on(channel, onResult)

      previewWindow.on('closed', () => {
        settle(fallbackResult)
      })

      previewWindow.on('ready-to-show', () => {
        previewWindow.show()
        previewWindow.focus()
      })

      previewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html)).catch(() => {
        if (!previewWindow.isDestroyed()) {
          previewWindow.destroy()
        }
      })
    })
  }

  private buildHtml(channel: string, input: PreviewOpenInput): string {
    const initialPayload = JSON.stringify({
      channel,
      imageDataUrl: input.imageDataUrl,
      parsed: input.parsed,
      overlayText: input.overlayText
    }).replace(/</g, '\\u003c')

    return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview & Confirm</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, "Noto Sans TC", "Microsoft JhengHei", sans-serif;
      background: #101922;
      color: #e2e8f0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal {
      width: min(1000px, 100%);
      max-height: 100%;
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 1px solid #1f2a35;
      background: #161e27;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
    }
    .header {
      padding: 22px 28px;
      border-bottom: 1px solid #243446;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .title {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.01em;
    }
    .subtitle {
      margin: 6px 0 0;
      font-size: 13px;
      color: #94a3b8;
    }
    .close-btn {
      border: 0;
      border-radius: 10px;
      width: 36px;
      height: 36px;
      cursor: pointer;
      background: transparent;
      color: #9ca3af;
      font-size: 20px;
    }
    .close-btn:hover {
      background: rgba(148, 163, 184, 0.15);
      color: #e2e8f0;
    }
    .content {
      overflow: auto;
      padding: 24px 28px;
      display: grid;
      grid-template-columns: minmax(420px, 1fr) 320px;
      gap: 18px;
    }
    .preview-card {
      border: 1px solid #273244;
      border-radius: 12px;
      background: #0f172a;
      overflow: hidden;
    }
    .preview-image {
      width: 100%;
      display: block;
      object-fit: contain;
      max-height: 62vh;
      background: #020617;
    }
    .preview-meta {
      padding: 12px 14px;
      border-top: 1px solid #273244;
      color: #94a3b8;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .panel {
      border: 1px solid #273244;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.75);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: fit-content;
    }
    .panel h2 {
      margin: 0;
      font-size: 15px;
      color: #f8fafc;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field label {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .field input {
      border: 1px solid #334155;
      background: #0b1220;
      color: #f8fafc;
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 15px;
      outline: none;
    }
    .field input:focus {
      border-color: #137fec;
      box-shadow: 0 0 0 3px rgba(19, 127, 236, 0.2);
    }
    .overlay-preview {
      margin: 0;
      border-radius: 10px;
      border: 1px dashed #334155;
      padding: 10px 12px;
      background: rgba(2, 6, 23, 0.6);
      font-size: 13px;
      color: #cbd5e1;
      min-height: 40px;
      display: flex;
      align-items: center;
    }
    .footer {
      border-top: 1px solid #243446;
      background: #101a25;
      padding: 18px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #94a3b8;
      font-size: 13px;
      cursor: pointer;
      user-select: none;
    }
    .btns {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    button {
      cursor: pointer;
      border-radius: 10px;
      border: 1px solid transparent;
      padding: 10px 16px;
      font-weight: 700;
      font-size: 14px;
    }
    .btn-cancel {
      color: #cbd5e1;
      background: transparent;
      border-color: #334155;
    }
    .btn-cancel:hover {
      background: rgba(148, 163, 184, 0.14);
    }
    .btn-save {
      background: #137fec;
      color: white;
      box-shadow: 0 8px 20px rgba(19, 127, 236, 0.28);
    }
    .btn-save:hover {
      background: #0f6fd1;
    }
  </style>
</head>
<body>
  <div class="modal">
    <div class="header">
      <div>
        <h1 class="title">Preview & Confirm</h1>
        <p class="subtitle">儲存前可修改 tooth / diameter / length，Enter 儲存、Esc 取消。</p>
      </div>
      <button class="close-btn" id="closeBtn" aria-label="close">✕</button>
    </div>
    <div class="content">
      <div class="preview-card">
        <img id="previewImage" class="preview-image" alt="預覽影像" />
        <div class="preview-meta">
          <span>OCR 疊加預覽</span>
          <span id="overlayMeta">—</span>
        </div>
      </div>
      <div class="panel">
        <h2>Extracted Information</h2>
        <div class="field">
          <label for="toothInput">Tooth</label>
          <input id="toothInput" autocomplete="off" />
        </div>
        <div class="field">
          <label for="diameterInput">Diameter (mm)</label>
          <input id="diameterInput" autocomplete="off" />
        </div>
        <div class="field">
          <label for="lengthInput">Length (mm)</label>
          <input id="lengthInput" autocomplete="off" />
        </div>
        <div class="field">
          <label>Overlay 文字</label>
          <p id="overlayPreview" class="overlay-preview">—</p>
        </div>
      </div>
    </div>
    <div class="footer">
      <label class="check" for="skipPreviewInput">
        <input id="skipPreviewInput" type="checkbox" />
        Skip Preview next time
      </label>
      <div class="btns">
        <button id="cancelBtn" class="btn-cancel">Cancel</button>
        <button id="saveBtn" class="btn-save">Save & Export</button>
      </div>
    </div>
  </div>
  <script>
    const { ipcRenderer } = require('electron')
    const boot = ${initialPayload}
    const toothInput = document.getElementById('toothInput')
    const diameterInput = document.getElementById('diameterInput')
    const lengthInput = document.getElementById('lengthInput')
    const overlayPreview = document.getElementById('overlayPreview')
    const overlayMeta = document.getElementById('overlayMeta')
    const skipPreviewInput = document.getElementById('skipPreviewInput')
    const previewImage = document.getElementById('previewImage')
    const saveBtn = document.getElementById('saveBtn')
    const cancelBtn = document.getElementById('cancelBtn')
    const closeBtn = document.getElementById('closeBtn')

    previewImage.src = boot.imageDataUrl
    toothInput.value = boot.parsed.tooth || ''
    diameterInput.value = boot.parsed.diameter || ''
    lengthInput.value = boot.parsed.length || ''
    overlayMeta.textContent = boot.overlayText || '尚未完整解析'

    let submitted = false

    function buildParsed() {
      const tooth = toothInput.value.trim()
      const diameter = diameterInput.value.trim()
      const length = lengthInput.value.trim()
      return {
        tooth: tooth || null,
        diameter: diameter || null,
        length: length || null
      }
    }

    function normalizeNumeric(raw) {
      if (!raw) return null
      const cleaned = raw.trim().replace(/[xX×]/g, 'x')
      if (!cleaned) return null
      const n = Number(cleaned)
      if (!Number.isFinite(n)) return cleaned
      return cleaned.includes('.') ? cleaned : n.toFixed(1)
    }

    function refreshOverlayPreview() {
      const parsed = buildParsed()
      parsed.diameter = normalizeNumeric(parsed.diameter)
      parsed.length = normalizeNumeric(parsed.length)
      if (parsed.tooth && parsed.diameter && parsed.length) {
        overlayPreview.textContent = parsed.tooth + ' ( ' + parsed.diameter + ' x ' + parsed.length + ' )'
      } else {
        overlayPreview.textContent = '資料不完整，將依降級策略處理。'
      }
    }

    function submit(action) {
      if (submitted) return
      submitted = true
      const parsed = buildParsed()
      const payload = {
        action,
        parsed: {
          tooth: parsed.tooth,
          diameter: normalizeNumeric(parsed.diameter),
          length: normalizeNumeric(parsed.length)
        },
        skipPreview: Boolean(skipPreviewInput.checked)
      }
      ipcRenderer.send(boot.channel, payload)
      window.close()
    }

    for (const input of [toothInput, diameterInput, lengthInput]) {
      input.addEventListener('input', refreshOverlayPreview)
    }

    saveBtn.addEventListener('click', () => submit('save'))
    cancelBtn.addEventListener('click', () => submit('cancel'))
    closeBtn.addEventListener('click', () => submit('cancel'))

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        submit('cancel')
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        submit('save')
      }
    })

    refreshOverlayPreview()
  </script>
</body>
</html>`
  }
}
