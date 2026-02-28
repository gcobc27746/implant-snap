import '../main.css'

declare global {
  interface Window {
    previewApi: {
      signalReady: () => void
      onInit: (cb: (data: {
        imageDataUrl: string
        toothCropDataUrl: string | null
        extraCropDataUrl: string | null
        tooth: string
        diameter: string
        length: string
      }) => void) => void
      confirm: (result: { tooth: string; diameter: string; length: string; skipPreview: boolean }) => void
      cancel: () => void
    }
  }
}

function mount(root: HTMLElement): void {
  root.innerHTML = buildLayout()

  const mainImg      = root.querySelector<HTMLImageElement>('#previewImgMain')!
  const toothImg     = root.querySelector<HTMLImageElement>('#previewImgTooth')!
  const extraImg     = root.querySelector<HTMLImageElement>('#previewImgExtra')!
  const toothInput   = root.querySelector<HTMLInputElement>('#fieldTooth')!
  const diameterInput= root.querySelector<HTMLInputElement>('#fieldDiameter')!
  const lengthInput  = root.querySelector<HTMLInputElement>('#fieldLength')!
  const skipCheckbox = root.querySelector<HTMLInputElement>('#skipPreview')!
  const overlayBadge = root.querySelector<HTMLElement>('#overlayBadge')!
  const cancelBtn    = root.querySelector<HTMLButtonElement>('#btnCancel')!
  const saveBtn      = root.querySelector<HTMLButtonElement>('#btnSave')!

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

  cancelBtn.addEventListener('click', () => window.previewApi.cancel())

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveBtn.click() }
    if (e.key === 'Escape') { e.preventDefault(); cancelBtn.click() }
  })

  window.previewApi.onInit((data) => {
    // Right: composited main image
    mainImg.src = data.imageDataUrl

    // Left-top: tooth OCR crop
    if (data.toothCropDataUrl) {
      toothImg.src = data.toothCropDataUrl
      toothImg.style.display = ''
    }

    // Left-bottom: extra OCR crop
    if (data.extraCropDataUrl) {
      extraImg.src = data.extraCropDataUrl
      extraImg.style.display = ''
    }

    toothInput.value    = data.tooth
    diameterInput.value = data.diameter
    lengthInput.value   = data.length
    updateBadge()

    setFieldState(toothInput.closest('.field-wrap')!, !!data.tooth)
    setFieldState(diameterInput.closest('.field-wrap')!, !!data.diameter)
    setFieldState(lengthInput.closest('.field-wrap')!, !!data.length)
  })

  window.previewApi.signalReady()
}

function setFieldState(wrap: Element, ok: boolean): void {
  const okIcon   = wrap.querySelector<HTMLElement>('.icon-ok')
  const warnIcon = wrap.querySelector<HTMLElement>('.icon-warn')
  if (okIcon)   okIcon.style.display   = ok ? '' : 'none'
  if (warnIcon) warnIcon.style.display = ok ? 'none' : ''
}

function buildLayout(): string {
  return `
<div class="flex h-screen w-full font-display text-slate-900 dark:text-slate-100 bg-bg-light dark:bg-bg-dark overflow-hidden">

  <!-- ═══ Left column ═══ -->
  <div class="flex flex-col w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161e27]">

    <!-- Header -->
    <div class="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-base font-bold tracking-tight">Preview &amp; Confirm</h1>
        <p class="text-slate-500 dark:text-slate-400 text-xs mt-0.5">確認後再儲存</p>
      </div>
      <button id="btnCancel" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
        <span class="material-symbols-outlined text-slate-400 text-[18px]">close</span>
      </button>
    </div>

    <!-- Top: Tooth crop -->
    <div class="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
      <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[13px]">dentistry</span>
        Tooth Region (OCR)
      </p>
      <div class="bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center" style="min-height:72px;max-height:120px;">
        <img id="previewImgTooth" src="" alt="tooth crop"
          class="max-w-full max-h-[120px] object-contain"
          style="display:none;image-rendering:pixelated;" />
      </div>
    </div>

    <!-- Bottom: Extra crop -->
    <div class="p-4 flex-1 overflow-hidden flex flex-col">
      <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5 shrink-0">
        <span class="material-symbols-outlined text-[13px]">data_object</span>
        Data Region (OCR)
      </p>
      <div class="bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center flex-1">
        <img id="previewImgExtra" src="" alt="extra crop"
          class="max-w-full max-h-full object-contain"
          style="display:none;image-rendering:pixelated;" />
      </div>
    </div>

  </div>

  <!-- ═══ Right column ═══ -->
  <div class="flex-1 flex flex-col overflow-hidden">

    <!-- Main image -->
    <div class="flex-1 overflow-hidden p-5 flex flex-col gap-3">
      <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[13px]">crop</span>
        Cropped Output
      </p>
      <div class="flex-1 relative bg-black rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 flex items-center justify-center">
        <img id="previewImgMain" src="" alt="output"
          class="max-w-full max-h-full object-contain"
          style="image-rendering:auto;" />
        <!-- Overlay badge -->
        <div class="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-sm">visibility</span>
          <span id="overlayBadge" class="text-white font-semibold text-base tracking-wide">— ( — x — )</span>
        </div>
        <div class="absolute inset-0 border-2 border-primary/25 pointer-events-none rounded-xl"></div>
      </div>
    </div>

    <!-- Fields -->
    <div class="shrink-0 px-5 pb-3">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-symbols-outlined text-primary text-base">analytics</span>
        <h2 class="text-sm font-bold">解析資料</h2>
        <span class="text-xs text-slate-400">（可手動修正）</span>
      </div>
      <div class="grid grid-cols-3 gap-3">

        <div class="flex flex-col gap-1 field-wrap">
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400">Tooth</label>
          <div class="relative">
            <input id="fieldTooth" type="text" placeholder="e.g. 21"
              class="w-full bg-slate-50 dark:bg-[#1c2631] border border-slate-200 dark:border-slate-700 rounded-lg h-9 px-3 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-white transition-all outline-none font-mono text-sm" />
            <span class="icon-ok  absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-emerald-500 text-[15px]" style="display:none">check_circle</span>
            <span class="icon-warn absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-amber-400 text-[15px]"  style="display:none">warning</span>
          </div>
        </div>

        <div class="flex flex-col gap-1 field-wrap">
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400">Diameter (mm)</label>
          <div class="relative">
            <input id="fieldDiameter" type="text" placeholder="e.g. 4.0"
              class="w-full bg-slate-50 dark:bg-[#1c2631] border border-slate-200 dark:border-slate-700 rounded-lg h-9 px-3 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-white transition-all outline-none font-mono text-sm" />
            <span class="icon-ok  absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-emerald-500 text-[15px]" style="display:none">check_circle</span>
            <span class="icon-warn absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-amber-400 text-[15px]"  style="display:none">warning</span>
          </div>
        </div>

        <div class="flex flex-col gap-1 field-wrap">
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400">Length (mm)</label>
          <div class="relative">
            <input id="fieldLength" type="text" placeholder="e.g. 13.0"
              class="w-full bg-slate-50 dark:bg-[#1c2631] border border-slate-200 dark:border-slate-700 rounded-lg h-9 px-3 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-white transition-all outline-none font-mono text-sm" />
            <span class="icon-ok  absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-emerald-500 text-[15px]" style="display:none">check_circle</span>
            <span class="icon-warn absolute right-2 top-1/2 -translate-y-1/2 material-symbols-outlined text-amber-400 text-[15px]"  style="display:none">warning</span>
          </div>
        </div>

      </div>
    </div>

    <!-- Footer -->
    <div class="shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/10 flex items-center justify-between">
      <label class="flex items-center gap-2.5 cursor-pointer group select-none">
        <input id="skipPreview" type="checkbox" class="peer hidden" />
        <div class="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-white text-[12px] hidden peer-checked:flex">check</span>
        </div>
        <span class="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
          下次不再顯示預覽
        </span>
      </label>
      <div class="flex items-center gap-2">
        <button id="btnCancel"
          class="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          取消
        </button>
        <button id="btnSave"
          class="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-primary/20 transition-all active:scale-95">
          <span class="material-symbols-outlined text-[16px]">save</span>
          Save &amp; Export
        </button>
      </div>
    </div>

  </div>
</div>`
}

const root = document.getElementById('app')
if (root) mount(root)
