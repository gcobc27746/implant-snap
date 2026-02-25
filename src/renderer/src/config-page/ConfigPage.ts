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
      <a class="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary" href="#">
        <span class="material-symbols-outlined">crop_free</span>
        <span class="text-sm font-medium">Capture Config</span>
      </a>
      <a class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
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
        Region Configuration
      </h2>
    </header>

    <!-- Canvas + Panel -->
    <div class="flex-1 flex overflow-hidden">
      <div id="canvasContainer" class="flex-1 relative overflow-hidden bg-slate-900/5 dark:bg-slate-900"></div>
      <aside class="w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-bg-dark/50 overflow-y-auto shrink-0">
        <div id="panelContainer" class="p-5 space-y-4"></div>
        <div class="px-5 pb-4">
          <div class="h-px bg-slate-200 dark:bg-slate-800 mb-4"></div>
          <div id="ocrResult" class="text-slate-400 text-[11px]">尚未執行 OCR</div>
        </div>
      </aside>
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
