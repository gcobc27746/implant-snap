import type { AppConfig, RegionKey } from '@shared/config-schema'
import { isRectRegion } from '@shared/config-schema'
import { CanvasManager } from './CanvasManager'
import { PropertiesPanel } from './PropertiesPanel'
import { REGION_META } from './constants'

export async function mountConfigPage(root: HTMLElement): Promise<void> {
  let config = await window.implantSnap.config.load()
  let selectedKey: RegionKey | null = null

  const canvas = new CanvasManager()
  const panel = new PropertiesPanel()

  root.innerHTML = buildLayout()

  const canvasContainer = root.querySelector<HTMLDivElement>('#canvasContainer')!
  const panelContainer = root.querySelector<HTMLElement>('#panelContainer')!
  const statusMsg = root.querySelector<HTMLElement>('#statusMsg')!
  const statusSel = root.querySelector<HTMLElement>('#statusSel')!
  const statusCur = root.querySelector<HTMLElement>('#statusCur')!

  canvas.init(canvasContainer, config, {
    onRegionChange(next) {
      config = next
      panel.updateConfig(config)
      updateStatusSelection()
    },
    onRegionSelect(key) {
      selectedKey = key
      canvas.selectRegion(key)
      panel.setSelected(key)
      updateStatusSelection()
    },
    onCursorMove(x, y) {
      statusCur.textContent = x !== null ? `Cursor: ${x}, ${y}` : 'Cursor: —, —'
    }
  })

  panel.init(panelContainer, config, {
    onRegionChange(next) {
      config = next
      canvas.updateConfig(config)
      updateStatusSelection()
    },
    onVisibilityToggle(key, visible) {
      canvas.setVisibility(key, visible)
    },
    async onSave() {
      try {
        const result = await window.implantSnap.config.validate(config)
        if (!result.valid) {
          panel.setError(result.errors.join('; '))
          statusMsg.textContent = '⚠ 驗證失敗'
          return
        }
        config = await window.implantSnap.config.save(config)
        panel.clearError()
        statusMsg.textContent = '✓ 設定已儲存'
      } catch (err) {
        panel.setError((err as Error).message)
        statusMsg.textContent = '✗ 儲存失敗'
      }
    },
    async onReset() {
      config = await window.implantSnap.config.reset()
      canvas.updateConfig(config)
      panel.updateConfig(config)
      panel.clearError()
      statusMsg.textContent = '✓ 已重置為預設值'
    },
    async onCapture() {
      try {
        statusMsg.textContent = '擷取 + OCR 執行中…'
        const { capture, ocr } = await window.implantSnap.pipeline.run()
        canvas.setBackground(capture.dataUrl)
        updateOcrDisplay(ocr)
        statusMsg.textContent = `✓ 擷取+OCR 完成 (${capture.width}×${capture.height})`
      } catch (err) {
        statusMsg.textContent = `✗ 擷取失敗: ${(err as Error).message}`
      }
    },
    onRegionSelect(key) {
      selectedKey = key
      canvas.selectRegion(key)
      panel.setSelected(key)
      updateStatusSelection()
    }
  })

  function updateStatusSelection() {
    if (!selectedKey) {
      statusSel.textContent = 'No selection'
      return
    }
    const r = config.regions[selectedKey]
    if (isRectRegion(selectedKey)) {
      const rect = r as { x: number; y: number; width: number; height: number }
      statusSel.textContent = `${REGION_META[selectedKey].label}: ${rect.width}×${rect.height}`
    } else {
      const pt = r as { x: number; y: number }
      statusSel.textContent = `${REGION_META[selectedKey].label}: (${pt.x}, ${pt.y})`
    }
  }

  window.implantSnap.capture.onResult((result) => {
    canvas.setBackground(result.dataUrl)
    statusMsg.textContent = `✓ 快捷鍵擷取完成 (${result.width}×${result.height})`
  })

  window.implantSnap.pipeline.onOcrResult((ocr) => {
    updateOcrDisplay(ocr)
  })

  const ocrResultEl = root.querySelector<HTMLElement>('#ocrResult')!

  function updateOcrDisplay(ocr: { parsed: { tooth: string | null; diameter: string | null; length: string | null }; raw: { tooth: { text: string; confidence: number }; extra: { text: string; confidence: number } }; errors: string[] }) {
    const { tooth, diameter, length } = ocr.parsed
    const overlay = tooth && diameter && length
      ? `${tooth} ( ${diameter} x ${length} )`
      : '—'

    ocrResultEl.innerHTML = `
      <div class="text-xs space-y-1.5">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase w-12">結果</span>
          <span class="font-mono font-bold ${tooth && diameter && length ? 'text-emerald-400' : 'text-amber-400'}">${overlay}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase w-12">牙位</span>
          <span class="font-mono">${tooth ?? '<span class="text-red-400">未辨識</span>'}</span>
          <span class="text-slate-600 text-[10px]">(${Math.round(ocr.raw.tooth.confidence)}%)</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase w-12">規格</span>
          <span class="font-mono">${diameter && length ? `${diameter} × ${length}` : '<span class="text-red-400">未辨識</span>'}</span>
          <span class="text-slate-600 text-[10px]">(${Math.round(ocr.raw.extra.confidence)}%)</span>
        </div>
        ${ocr.errors.length ? `<div class="text-amber-400 text-[10px]">⚠ ${ocr.errors.join('; ')}</div>` : ''}
      </div>`
  }

  statusMsg.textContent = '就緒'
  updateStatusSelection()

  // ── Tab switching ───────────────────────────────────────────────────────
  const navCapture = root.querySelector<HTMLAnchorElement>('#navCapture')!
  const navSettings = root.querySelector<HTMLAnchorElement>('#navSettings')!
  const captureView = root.querySelector<HTMLElement>('#captureView')!
  const settingsView = root.querySelector<HTMLElement>('#settingsView')!
  const headerTitle = root.querySelector<HTMLElement>('#headerTitle')!

  const ACTIVE_NAV = 'bg-primary/10 text-primary'
  const INACTIVE_NAV = 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'

  function switchTab(tab: 'capture' | 'settings'): void {
    if (tab === 'capture') {
      captureView.style.display = ''
      settingsView.style.display = 'none'
      navCapture.className = `flex items-center gap-3 px-3 py-2 rounded-lg ${ACTIVE_NAV}`
      navSettings.className = `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${INACTIVE_NAV}`
      headerTitle.textContent = 'Region Configuration'
    } else {
      captureView.style.display = 'none'
      settingsView.style.display = ''
      navCapture.className = `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${INACTIVE_NAV}`
      navSettings.className = `flex items-center gap-3 px-3 py-2 rounded-lg ${ACTIVE_NAV}`
      headerTitle.textContent = 'Settings'
      loadSettingsView()
    }
  }

  navCapture.addEventListener('click', (e) => { e.preventDefault(); switchTab('capture') })
  navSettings.addEventListener('click', (e) => { e.preventDefault(); switchTab('settings') })

  // ── Settings panel ──────────────────────────────────────────────────────
  function loadSettingsView(): void {
    const cfg = config
    const outputDirInput = root.querySelector<HTMLInputElement>('#settingOutputDir')!
    const sidecarToggle = root.querySelector<HTMLInputElement>('#settingSidecar')!
    const previewToggle = root.querySelector<HTMLInputElement>('#settingPreview')!

    outputDirInput.value = cfg.outputDir ?? ''
    sidecarToggle.checked = cfg.sidecarEnabled ?? false
    previewToggle.checked = cfg.previewEnabled ?? true
  }

  root.querySelector('#btnBrowseOutputDir')?.addEventListener('click', async () => {
    const selected = await window.implantSnap.dialog.selectOutputDir()
    if (selected) {
      const input = root.querySelector<HTMLInputElement>('#settingOutputDir')!
      input.value = selected
    }
  })

  root.querySelector('#btnCheckUpdate')?.addEventListener('click', async () => {
    const updateMsg = root.querySelector<HTMLElement>('#updateMsg')!
    updateMsg.textContent = '檢查中…'
    updateMsg.className = 'text-slate-500 text-sm font-semibold'
    try {
      await window.implantSnap.updater.checkNow()
      updateMsg.textContent = '✓ 已完成檢查'
      updateMsg.className = 'text-emerald-500 text-sm font-semibold'
    } catch (err) {
      updateMsg.textContent = `✗ 檢查失敗: ${(err as Error).message}`
      updateMsg.className = 'text-red-400 text-sm font-semibold'
    }
  })

  root.querySelector('#btnSaveSettings')?.addEventListener('click', async () => {
    const outputDirInput = root.querySelector<HTMLInputElement>('#settingOutputDir')!
    const sidecarToggle = root.querySelector<HTMLInputElement>('#settingSidecar')!
    const previewToggle = root.querySelector<HTMLInputElement>('#settingPreview')!
    const settingsMsg = root.querySelector<HTMLElement>('#settingsMsg')!

    try {
      const updated: typeof config = {
        ...config,
        outputDir: outputDirInput.value.trim(),
        sidecarEnabled: sidecarToggle.checked,
        previewEnabled: previewToggle.checked
      }
      config = await window.implantSnap.config.save(updated)
      settingsMsg.textContent = '✓ 設定已儲存'
      settingsMsg.className = 'text-emerald-500 text-sm font-semibold'
    } catch (err) {
      settingsMsg.textContent = `✗ 儲存失敗: ${(err as Error).message}`
      settingsMsg.className = 'text-red-400 text-sm font-semibold'
    }
  })
}

function buildLayout(): string {
  return `
<div class="flex h-screen w-full font-display text-slate-900 dark:text-slate-100 bg-bg-light dark:bg-bg-dark">
  <!-- Sidebar -->
  <aside class="w-60 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-bg-dark shrink-0">
    <div class="p-5 flex items-center gap-3">
      <div class="bg-primary rounded-lg p-2 text-white flex items-center justify-center">
        <span class="material-symbols-outlined">dentistry</span>
      </div>
      <div>
        <h1 class="font-bold text-sm tracking-tight">ImplantSnap</h1>
        <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">Config</p>
      </div>
    </div>
    <nav class="flex-1 px-3 space-y-1">
      <a id="navCapture" class="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary" href="#">
        <span class="material-symbols-outlined">crop_free</span>
        <span class="text-sm font-medium">Capture Config</span>
      </a>
      <a id="navSettings" class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
        <span class="material-symbols-outlined">settings</span>
        <span class="text-sm font-medium">Settings</span>
      </a>
    </nav>
    <div class="p-4 mt-auto">
      <div class="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
        <p class="text-[10px] font-semibold text-slate-500 mb-1.5">全域快捷鍵</p>
        <div class="flex gap-1 items-center">
          <kbd class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-[10px] font-bold shadow-sm">Ctrl</kbd>
          <span class="text-slate-400 text-xs">+</span>
          <kbd class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-[10px] font-bold shadow-sm">Shift</kbd>
          <span class="text-slate-400 text-xs">+</span>
          <kbd class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-[10px] font-bold shadow-sm">S</kbd>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main Workspace -->
  <main class="flex-1 flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white/80 dark:bg-bg-dark/80 backdrop-blur-md shrink-0">
      <h2 class="text-sm font-bold flex items-center gap-2">
        <span class="text-primary material-symbols-outlined text-lg">layers</span>
        <span id="headerTitle">Region Configuration</span>
      </h2>
    </header>

    <!-- Capture Config view -->
    <div id="captureView" class="flex-1 flex overflow-hidden">
      <div id="canvasContainer" class="flex-1 relative overflow-hidden bg-slate-900/5 dark:bg-slate-900"></div>
      <aside class="w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-bg-dark/50 overflow-y-auto shrink-0">
        <div id="panelContainer" class="p-5 space-y-4"></div>
        <div class="px-5 pb-4">
          <div class="h-px bg-slate-200 dark:bg-slate-800 mb-4"></div>
          <div id="ocrResult" class="text-slate-400 text-[11px]">尚未執行 OCR</div>
        </div>
      </aside>
    </div>

    <!-- Settings view -->
    <div id="settingsView" style="display:none" class="flex-1 overflow-y-auto p-8">
      <div class="max-w-xl space-y-8">

        <!-- Output directory -->
        <section class="space-y-3">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-base">folder_open</span>
            輸出目錄
          </h3>
          <div class="flex gap-2">
            <input id="settingOutputDir" type="text" placeholder="（預設：桌面 ScreenshotOutput）"
              class="flex-1 bg-slate-50 dark:bg-[#1c2631] border border-slate-200 dark:border-slate-700 rounded-lg h-10 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-white outline-none transition-all" />
            <button id="btnBrowseOutputDir"
              class="px-4 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shrink-0">
              <span class="material-symbols-outlined text-base">folder</span>
              選擇
            </button>
          </div>
          <p class="text-xs text-slate-500">若留空則儲存至桌面的 ScreenshotOutput 資料夾。</p>
        </section>

        <div class="h-px bg-slate-200 dark:bg-slate-800"></div>

        <!-- Toggles -->
        <section class="space-y-5">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-base">tune</span>
            行為設定
          </h3>

          <label class="flex items-start gap-4 cursor-pointer group">
            <div class="mt-0.5 shrink-0">
              <input id="settingPreview" type="checkbox" class="peer hidden" />
              <div class="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                <span class="material-symbols-outlined text-white text-[15px] hidden peer-checked:flex">check</span>
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">顯示預覽視窗</p>
              <p class="text-xs text-slate-500 mt-0.5">每次執行快捷鍵後先開啟確認視窗，可手動修正資料再儲存。</p>
            </div>
          </label>

          <label class="flex items-start gap-4 cursor-pointer group">
            <div class="mt-0.5 shrink-0">
              <input id="settingSidecar" type="checkbox" class="peer hidden" />
              <div class="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                <span class="material-symbols-outlined text-white text-[15px] hidden peer-checked:flex">check</span>
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">輸出 Sidecar JSON</p>
              <p class="text-xs text-slate-500 mt-0.5">在圖片旁同時儲存一份包含解析資料的 .json 檔。</p>
            </div>
          </label>
        </section>

        <div class="flex items-center gap-4">
          <button id="btnSaveSettings"
            class="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
            <span class="material-symbols-outlined text-base">save</span>
            儲存設定
          </button>
          <span id="settingsMsg" class="text-sm font-semibold"></span>
        </div>

        <div class="h-px bg-slate-200 dark:bg-slate-800"></div>

        <!-- Update -->
        <section class="space-y-3">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-base">system_update</span>
            更新
          </h3>
          <div class="flex items-center gap-4">
            <button id="btnCheckUpdate"
              class="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all active:scale-95">
              <span class="material-symbols-outlined text-base">refresh</span>
              檢查更新
            </button>
            <span id="updateMsg" class="text-sm font-semibold"></span>
          </div>
        </section>

      </div>
    </div>

    <!-- Status Bar -->
    <footer class="h-9 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-bg-dark/95 flex items-center justify-between px-6 text-[11px] font-medium text-slate-500 shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span id="statusMsg">就緒</span>
      </div>
      <div class="flex items-center gap-4">
        <span id="statusSel">No selection</span>
        <div class="h-3 w-px bg-slate-300 dark:bg-slate-700"></div>
        <span id="statusCur">Cursor: —, —</span>
      </div>
    </footer>
  </main>
</div>`
}
