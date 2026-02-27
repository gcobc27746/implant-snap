import '../main.css'

declare global {
  interface Window {
    previewApi: {
      onInit: (cb: (data: { imageDataUrl: string; tooth: string; diameter: string; length: string }) => void) => void
      confirm: (result: { tooth: string; diameter: string; length: string; skipPreview: boolean }) => void
      cancel: () => void
    }
  }
}

function mount(root: HTMLElement): void {
  root.innerHTML = buildLayout()

  const imgEl = root.querySelector<HTMLImageElement>('#previewImg')!
  const toothInput = root.querySelector<HTMLInputElement>('#fieldTooth')!
  const diameterInput = root.querySelector<HTMLInputElement>('#fieldDiameter')!
  const lengthInput = root.querySelector<HTMLInputElement>('#fieldLength')!
  const skipCheckbox = root.querySelector<HTMLInputElement>('#skipPreview')!
  const overlayBadge = root.querySelector<HTMLElement>('#overlayBadge')!
  const cancelBtn = root.querySelector<HTMLButtonElement>('#btnCancel')!
  const saveBtn = root.querySelector<HTMLButtonElement>('#btnSave')!

  function updateBadge(): void {
    const t = toothInput.value.trim() || '?'
    const d = diameterInput.value.trim() || '?'
    const l = lengthInput.value.trim() || '?'
    overlayBadge.textContent = `${t} ( ${d} x ${l} )`
  }

  toothInput.addEventListener('input', updateBadge)
  diameterInput.addEventListener('input', updateBadge)
  lengthInput.addEventListener('input', updateBadge)

  saveBtn.addEventListener('click', () => {
    window.previewApi.confirm({
      tooth: toothInput.value.trim(),
      diameter: diameterInput.value.trim(),
      length: lengthInput.value.trim(),
      skipPreview: skipCheckbox.checked
    })
  })

  cancelBtn.addEventListener('click', () => {
    window.previewApi.cancel()
  })

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveBtn.click()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelBtn.click()
    }
  })

  // Register the data listener first, then signal to main that we are ready.
  // This avoids the race condition where main sends 'preview:init' before
  // the module script has registered the listener (did-finish-load fires
  // before <script type="module"> code executes).
  window.previewApi.onInit((data) => {
    imgEl.src = data.imageDataUrl
    toothInput.value = data.tooth
    diameterInput.value = data.diameter
    lengthInput.value = data.length
    updateBadge()

    // Show/hide validation icons
    setFieldState(toothInput.closest('.field-wrap')!, !!data.tooth)
    setFieldState(diameterInput.closest('.field-wrap')!, !!data.diameter)
    setFieldState(lengthInput.closest('.field-wrap')!, !!data.length)
  })

  window.previewApi.signalReady()
}

function setFieldState(wrap: Element, ok: boolean): void {
  const okIcon = wrap.querySelector<HTMLElement>('.icon-ok')
  const warnIcon = wrap.querySelector<HTMLElement>('.icon-warn')
  if (okIcon) okIcon.style.display = ok ? '' : 'none'
  if (warnIcon) warnIcon.style.display = ok ? 'none' : ''
}

function buildLayout(): string {
  return `
<div class="flex h-screen w-full font-display text-slate-900 dark:text-slate-100 bg-bg-light dark:bg-bg-dark items-center justify-center overflow-hidden">
  <div class="bg-white dark:bg-[#161e27] w-full max-w-[1040px] rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] mx-4">

    <!-- Header -->
    <div class="px-8 pt-7 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Preview &amp; Confirm</h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm mt-0.5">儲存前確認裁切影像與 OCR 資料。</p>
      </div>
      <button id="btnCancel" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
        <span class="material-symbols-outlined text-slate-400">close</span>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-8 space-y-7">

      <!-- Image preview -->
      <div class="relative group">
        <div class="w-full rounded-xl overflow-hidden bg-black flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-800" style="min-height:220px;max-height:380px;">
          <img id="previewImg" src="" alt="裁切預覽" class="max-w-full max-h-[380px] object-contain" style="image-rendering:auto;" />
          <!-- Overlay badge (mirrors the text overlay on the image) -->
          <div class="absolute bottom-5 left-5 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-sm">visibility</span>
            <span id="overlayBadge" class="text-white font-semibold text-lg tracking-wide">— ( — x — )</span>
          </div>
          <div class="absolute inset-0 border-2 border-primary/30 pointer-events-none rounded-lg"></div>
        </div>
        <div class="mt-2 flex items-center justify-end text-[11px] text-slate-500 uppercase tracking-widest font-semibold">
          <span>自動裁切結果</span>
        </div>
      </div>

      <!-- OCR fields -->
      <div>
        <div class="flex items-center gap-2 mb-5">
          <span class="material-symbols-outlined text-primary">analytics</span>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">解析資料</h2>
          <span class="text-xs text-slate-400">（可於儲存前修改）</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">

          <div class="flex flex-col gap-1.5 field-wrap">
            <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Tooth Number</label>
            <div class="relative">
              <input id="fieldTooth" type="text" placeholder="e.g. 21"
                class="w-full bg-slate-50 dark:bg-[#1c2631] border border-slate-200 dark:border-slate-700 rounded-lg h-11 px-4 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-white transition-all outline-none font-mono" />
              <span class="icon-ok absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-emerald-500 text-[18px]" style="display:none">check_circle</span>
              <span class="icon-warn absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-amber-400 text-[18px]" style="display:none">warning</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 field-wrap">
            <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Diameter (mm)</label>
            <div class="relative">
              <input id="fieldDiameter" type="text" placeholder="e.g. 4.0"
                class="w-full bg-slate-50 dark:bg-[#1c2631] border border-slate-200 dark:border-slate-700 rounded-lg h-11 px-4 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-white transition-all outline-none font-mono" />
              <span class="icon-ok absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-emerald-500 text-[18px]" style="display:none">check_circle</span>
              <span class="icon-warn absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-amber-400 text-[18px]" style="display:none">warning</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 field-wrap">
            <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">Length (mm)</label>
            <div class="relative">
              <input id="fieldLength" type="text" placeholder="e.g. 13.0"
                class="w-full bg-slate-50 dark:bg-[#1c2631] border border-slate-200 dark:border-slate-700 rounded-lg h-11 px-4 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-white transition-all outline-none font-mono" />
              <span class="icon-ok absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-emerald-500 text-[18px]" style="display:none">check_circle</span>
              <span class="icon-warn absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-amber-400 text-[18px]" style="display:none">warning</span>
            </div>
          </div>

        </div>
        <p class="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[14px]">info</span>
          若 OCR 辨識有誤，可在此手動修正後再儲存。
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div class="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/10 flex items-center justify-between shrink-0">
      <label class="flex items-center gap-3 cursor-pointer group select-none">
        <input id="skipPreview" type="checkbox" class="peer hidden" />
        <div class="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
          <span class="material-symbols-outlined text-white text-[15px] hidden peer-checked:flex">check</span>
        </div>
        <span class="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
          下次不再顯示預覽 (Skip Preview)
        </span>
      </label>
      <div class="flex items-center gap-3">
        <button id="btnCancel"
          class="px-5 py-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          取消
        </button>
        <button id="btnSave"
          class="bg-primary hover:bg-primary/90 text-white px-7 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
          <span class="material-symbols-outlined text-[18px]">save</span>
          Save &amp; Export
        </button>
      </div>
    </div>

  </div>
</div>`
}

const root = document.getElementById('app')
if (root) mount(root)
