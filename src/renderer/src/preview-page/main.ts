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
        notePresets: string[]
      }) => void) => void
      confirm: (result: {
        tooth: string
        diameter: string
        length: string
        notes: { text: string; relX: number; relY: number; fontSize: number }[]
        skipPreview: boolean
      }) => void
      cancel: () => void
      rerender: (data: { tooth: string; diameter: string; length: string }) => void
      onRerenderResult: (cb: (imageDataUrl: string) => void) => void
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRenderedRect(img: HTMLImageElement): { left: number; top: number; width: number; height: number } {
  const cw = img.clientWidth
  const ch = img.clientHeight
  const nw = img.naturalWidth || cw
  const nh = img.naturalHeight || ch
  const scale = Math.min(cw / nw, ch / nh)
  const rw = nw * scale
  const rh = nh * scale
  return { left: (cw - rw) / 2, top: (ch - rh) / 2, width: rw, height: rh }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

// ── Note state ────────────────────────────────────────────────────────────────

interface NoteState {
  id: string
  text: string
  relX: number    // fraction of rendered image width (0–1)
  relY: number    // fraction of rendered image height (0–1)
  fontSize: number  // display pixels
  el: HTMLDivElement
}

// ── Mount ─────────────────────────────────────────────────────────────────────

function mount(root: HTMLElement): void {
  root.innerHTML = buildLayout()

  const mainImg       = root.querySelector<HTMLImageElement>('#previewImgMain')!
  const toothImg      = root.querySelector<HTMLImageElement>('#previewImgTooth')!
  const extraImg      = root.querySelector<HTMLImageElement>('#previewImgExtra')!
  const toothInput    = root.querySelector<HTMLInputElement>('#fieldTooth')!
  const diameterInput = root.querySelector<HTMLInputElement>('#fieldDiameter')!
  const lengthInput   = root.querySelector<HTMLInputElement>('#fieldLength')!
  const skipCheckbox  = root.querySelector<HTMLInputElement>('#skipPreview')!
  const overlayBadge  = root.querySelector<HTMLElement>('#overlayBadge')!
  const cancelBtn     = root.querySelector<HTMLButtonElement>('#btnCancel')!
  const saveBtn       = root.querySelector<HTMLButtonElement>('#btnSave')!
  const notePresetSel = root.querySelector<HTMLSelectElement>('#notePresetSelect')!
  const addNoteBtn    = root.querySelector<HTMLButtonElement>('#btnAddNote')!
  const imgContainer  = root.querySelector<HTMLDivElement>('#imgContainer')!

  // ── Notes state ────────────────────────────────────────────────────────────
  const notes: NoteState[] = []
  let selectedNoteId: string | null = null
  let editingNoteId: string | null = null

  // ── Single shared drag state ───────────────────────────────────────────────
  const RESIZE_SENSITIVITY = 0.28

  let activeDrag: {
    type: 'move' | 'resize'
    note: NoteState
    dir?: string
    startMx: number
    startMy: number
    startRelX: number
    startRelY: number
    startFs: number
  } | null = null

  document.addEventListener('mousemove', (e) => {
    if (!activeDrag) return
    const r = getRenderedRect(mainImg)
    if (r.width === 0 || r.height === 0) return

    const { note } = activeDrag
    const dx = e.clientX - activeDrag.startMx
    const dy = e.clientY - activeDrag.startMy

    if (activeDrag.type === 'move') {
      note.relX = activeDrag.startRelX + dx / r.width
      note.relY = activeDrag.startRelY + dy / r.height
      applyNotePosition(note)
    } else {
      const dir = activeDrag.dir ?? 'se'
      let outward = 0
      let adjRx = 0
      let adjRy = 0

      switch (dir) {
        case 'se': outward = (dx + dy) / 2; break
        case 'nw': outward = (-dx - dy) / 2; adjRx = dx / r.width; adjRy = dy / r.height; break
        case 'ne': outward = (dx - dy) / 2;                         adjRy = dy / r.height; break
        case 'sw': outward = (-dx + dy) / 2; adjRx = dx / r.width;                         break
        case 'e':  outward = dx;  break
        case 'w':  outward = -dx; adjRx = dx / r.width; break
        case 's':  outward = dy;  break
        case 'n':  outward = -dy; adjRy = dy / r.height; break
      }

      note.fontSize = Math.max(10, Math.min(120, activeDrag.startFs + outward * RESIZE_SENSITIVITY))
      note.relX = activeDrag.startRelX + adjRx
      note.relY = activeDrag.startRelY + adjRy
      applyNotePosition(note)
    }
  })

  document.addEventListener('mouseup', () => {
    activeDrag = null
  })

  // ── Note helpers ───────────────────────────────────────────────────────────

  function getImgOrigin(): { x: number; y: number } {
    const r = getRenderedRect(mainImg)
    return {
      x: mainImg.offsetLeft + r.left,
      y: mainImg.offsetTop  + r.top
    }
  }

  function applyNotePosition(note: NoteState): void {
    const r = getRenderedRect(mainImg)
    const { x: ox, y: oy } = getImgOrigin()
    note.el.style.left = `${ox + note.relX * r.width}px`
    note.el.style.top  = `${oy + note.relY * r.height}px`
    const inner = note.el.querySelector<HTMLElement>('.note-inner')!
    inner.style.fontSize = `${note.fontSize}px`
  }

  function applyAllPositions(): void {
    for (const n of notes) applyNotePosition(n)
  }

  function selectNote(id: string | null): void {
    for (const n of notes) {
      n.el.classList.toggle('note-selected', n.id === id)
    }
    selectedNoteId = id
  }

  function deleteNote(id: string): void {
    const idx = notes.findIndex(n => n.id === id)
    if (idx === -1) return
    notes[idx].el.remove()
    notes.splice(idx, 1)
    if (selectedNoteId === id) selectedNoteId = null
    if (editingNoteId === id) editingNoteId = null
  }

  function startEdit(note: NoteState): void {
    if (editingNoteId === note.id) return
    // Stop any other edit
    if (editingNoteId) {
      const prev = notes.find(n => n.id === editingNoteId)
      if (prev) stopEdit(prev)
    }
    editingNoteId = note.id
    const inner = note.el.querySelector<HTMLElement>('.note-inner')!
    inner.contentEditable = 'true'
    inner.style.cursor = 'text'
    inner.focus()
    // Move cursor to end
    const range = document.createRange()
    range.selectNodeContents(inner)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  function stopEdit(note: NoteState): void {
    if (editingNoteId !== note.id) return
    editingNoteId = null
    const inner = note.el.querySelector<HTMLElement>('.note-inner')!
    inner.contentEditable = 'false'
    inner.style.cursor = 'move'
    note.text = inner.innerText
    // Normalize: keep innerText in sync
    inner.innerText = note.text
  }

  function createNote(text: string): NoteState {
    const id = uid()
    const el = document.createElement('div')
    el.className = 'note-box'
    el.dataset.id = id

    // Default position: stagger each new note slightly
    const r = getRenderedRect(mainImg)
    const baseRelX = r.width > 0 ? 12 / r.width : 0.02
    const baseRelY = notes.length > 0
      ? Math.min(0.90, notes[notes.length - 1].relY + 0.12)
      : 0.72

    const note: NoteState = { id, text, relX: baseRelX, relY: baseRelY, fontSize: 24, el }

    const handleDirs = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']
    const handlesHtml = handleDirs
      .map(dir => `<div class="note-rh" data-dir="${dir}"></div>`)
      .join('')

    el.innerHTML = `
      <div class="note-inner" contenteditable="false" spellcheck="false"></div>
      <button class="note-delete" title="刪除備註" type="button">×</button>
      ${handlesHtml}
    `

    // Set initial text via innerText (handles newlines correctly)
    el.querySelector<HTMLElement>('.note-inner')!.innerText = text

    // ── Select on click (any part of box except handles / delete btn) ─────────
    el.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('note-rh')) return
      if (target.classList.contains('note-delete')) return
      if (selectedNoteId !== id) selectNote(id)
    })

    // ── Double-click inner → edit ─────────────────────────────────────────────
    el.querySelector('.note-inner')!.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      selectNote(id)
      startEdit(note)
    })

    // ── Blur inner → stop edit ────────────────────────────────────────────────
    el.querySelector('.note-inner')!.addEventListener('blur', () => {
      if (editingNoteId === id) stopEdit(note)
    })

    // ── Keydown inside inner ──────────────────────────────────────────────────
    el.querySelector('.note-inner')!.addEventListener('keydown', (e) => {
      const ke = e as KeyboardEvent
      if (ke.key === 'Escape') {
        ke.preventDefault()
        ke.stopPropagation()
        stopEdit(note)
      }
      // Enter alone = stop edit; Shift+Enter = newline (browser default)
      if (ke.key === 'Enter' && !ke.shiftKey) {
        ke.preventDefault()
        ke.stopPropagation()
        stopEdit(note)
      }
    })

    // ── Delete button ─────────────────────────────────────────────────────────
    el.querySelector('.note-delete')!.addEventListener('click', (e) => {
      e.stopPropagation()
      deleteNote(id)
    })

    // ── Move drag (on inner, only when not editing) ───────────────────────────
    el.querySelector('.note-inner')!.addEventListener('mousedown', (e) => {
      const me = e as MouseEvent
      if (editingNoteId === id) return  // let browser handle text selection
      if (me.button !== 0) return
      activeDrag = {
        type: 'move',
        note,
        startMx: me.clientX,
        startMy: me.clientY,
        startRelX: note.relX,
        startRelY: note.relY,
        startFs: note.fontSize
      }
      me.preventDefault()
    })

    // ── Resize handles ────────────────────────────────────────────────────────
    el.querySelectorAll<HTMLElement>('.note-rh').forEach((h) => {
      h.addEventListener('mousedown', (e) => {
        const me = e as MouseEvent
        if (me.button !== 0) return
        activeDrag = {
          type: 'resize',
          note,
          dir: h.dataset.dir ?? 'se',
          startMx: me.clientX,
          startMy: me.clientY,
          startRelX: note.relX,
          startRelY: note.relY,
          startFs: note.fontSize
        }
        me.preventDefault()
        me.stopPropagation()
      })
    })

    imgContainer.appendChild(el)
    notes.push(note)
    applyNotePosition(note)
    selectNote(id)

    return note
  }

  // ── Click outside all notes → deselect ────────────────────────────────────
  imgContainer.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement
    if (target.closest('.note-box')) return
    if (editingNoteId) {
      const prev = notes.find(n => n.id === editingNoteId)
      if (prev) stopEdit(prev)
    }
    selectNote(null)
  })

  // ── Reposition on image load / window resize ───────────────────────────────
  mainImg.addEventListener('load', applyAllPositions)
  window.addEventListener('resize', applyAllPositions)

  // ── Add note ───────────────────────────────────────────────────────────────
  addNoteBtn.addEventListener('click', () => {
    const val = notePresetSel.value
    const text = val === '__blank__' ? '' : (val ?? '')
    notePresetSel.value = ''
    const note = createNote(text)
    // For blank notes, immediately enter edit mode
    if (!text.trim()) startEdit(note)
  })

  // ── Rerender ───────────────────────────────────────────────────────────────
  let rerenderTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleRerender(): void {
    if (rerenderTimer) clearTimeout(rerenderTimer)
    rerenderTimer = setTimeout(() => {
      window.previewApi.rerender({
        tooth:    toothInput.value.trim(),
        diameter: diameterInput.value.trim(),
        length:   lengthInput.value.trim()
      })
    }, 300)
  }

  window.previewApi.onRerenderResult((url) => {
    mainImg.src = url
  })

  // ── Fields and badge ───────────────────────────────────────────────────────
  function updateBadge(): void {
    const t = toothInput.value.trim() || '?'
    const d = diameterInput.value.trim() || '?'
    const l = lengthInput.value.trim() || '?'
    overlayBadge.textContent = `${t} ( ${d} x ${l} )`
  }

  toothInput.addEventListener('input',    () => { updateBadge(); scheduleRerender() })
  diameterInput.addEventListener('input', () => { updateBadge(); scheduleRerender() })
  lengthInput.addEventListener('input',   () => { updateBadge(); scheduleRerender() })

  // ── Save / Cancel ──────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    // Stop any active edit
    if (editingNoteId) {
      const activeNote = notes.find(n => n.id === editingNoteId)
      if (activeNote) stopEdit(activeNote)
    }

    const r = getRenderedRect(mainImg)
    const imgScale = r.width > 0 && mainImg.naturalWidth > 0
      ? mainImg.naturalWidth / r.width
      : 1

    window.previewApi.confirm({
      tooth:    toothInput.value.trim(),
      diameter: diameterInput.value.trim(),
      length:   lengthInput.value.trim(),
      notes: notes
        .filter(n => n.text.trim())
        .map(n => ({
          text:     n.text,
          relX:     Math.max(0, Math.min(1, n.relX)),
          relY:     Math.max(0, Math.min(1, n.relY)),
          fontSize: Math.round(n.fontSize * imgScale)
        })),
      skipPreview: skipCheckbox.checked
    })
  })

  cancelBtn.addEventListener('click', () => window.previewApi.cancel())

  document.addEventListener('keydown', (e) => {
    if (editingNoteId) return  // don't interfere during text editing
    if (e.key === 'Enter' && !e.shiftKey && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault()
      saveBtn.click()
    }
    if (e.key === 'Escape') { e.preventDefault(); cancelBtn.click() }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteId) {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        deleteNote(selectedNoteId)
      }
    }
  })

  // ── Init ───────────────────────────────────────────────────────────────────
  window.previewApi.onInit((data) => {
    mainImg.src = data.imageDataUrl

    if (data.toothCropDataUrl) {
      toothImg.src = data.toothCropDataUrl
      toothImg.style.display = ''
    }
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

    // Populate preset dropdown
    notePresetSel.innerHTML =
      '<option value="">— 選擇預設備註 —</option>' +
      '<option value="__blank__">[空白]</option>'
    for (const preset of (data.notePresets ?? [])) {
      const opt = document.createElement('option')
      opt.value = preset
      opt.textContent = preset.replace(/\n/g, ' ／ ')
      notePresetSel.appendChild(opt)
    }
  })

  window.previewApi.signalReady()
}

function setFieldState(wrap: Element, ok: boolean): void {
  const okIcon   = wrap.querySelector<HTMLElement>('.icon-ok')
  const warnIcon = wrap.querySelector<HTMLElement>('.icon-warn')
  if (okIcon)   okIcon.style.display   = ok ? '' : 'none'
  if (warnIcon) warnIcon.style.display = ok ? 'none' : ''
}

// ── Layout ────────────────────────────────────────────────────────────────────

function buildLayout(): string {
  return `
<style>
/* ── Note box ── */
.note-box {
  position: absolute;
  z-index: 10;
  user-select: none;
  pointer-events: auto;
}
.note-inner {
  font-family: Arial, Helvetica, sans-serif;
  font-weight: 600;
  font-size: 24px;
  line-height: 1.4;
  color: #fff;
  white-space: pre-wrap;
  cursor: move;
  min-width: 40px;
  min-height: 20px;
  outline: none;
  padding: 3px 5px;
  border: 2px solid transparent;
  border-radius: 3px;
  /* text outline for readability without a background */
  text-shadow:
    -2px -2px 0 #000,
     2px -2px 0 #000,
    -2px  2px 0 #000,
     2px  2px 0 #000,
     0    2px 0 #000,
     0   -2px 0 #000,
     2px  0   0 #000,
    -2px  0   0 #000;
}
.note-inner[contenteditable="true"] {
  cursor: text;
  user-select: text;
}
/* Purple selection border — only when selected */
.note-selected .note-inner {
  border-color: rgba(168,85,247,0.85);
}
/* ── Delete button ── */
.note-delete {
  display: none;
  position: absolute;
  top: -10px;
  right: -10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(239,68,68,0.9);
  color: #fff;
  font-size: 13px;
  font-weight: bold;
  line-height: 20px;
  text-align: center;
  cursor: pointer;
  border: 1.5px solid rgba(255,255,255,0.5);
  z-index: 4;
  padding: 0;
}
.note-selected .note-delete { display: block; }
/* ── Resize handles ── */
.note-rh {
  display: none;
  position: absolute;
  width: 8px;
  height: 8px;
  background: #fff;
  border: 1.5px solid rgba(168,85,247,0.9);
  border-radius: 1px;
  z-index: 3;
}
.note-selected .note-rh { display: block; }
.note-rh[data-dir="nw"] { top:0;    left:0;   transform:translate(-50%,-50%); cursor:nw-resize; }
.note-rh[data-dir="n"]  { top:0;    left:50%; transform:translate(-50%,-50%); cursor:n-resize;  }
.note-rh[data-dir="ne"] { top:0;    right:0;  transform:translate(50%,-50%);  cursor:ne-resize; }
.note-rh[data-dir="w"]  { top:50%;  left:0;   transform:translate(-50%,-50%); cursor:w-resize;  }
.note-rh[data-dir="e"]  { top:50%;  right:0;  transform:translate(50%,-50%);  cursor:e-resize;  }
.note-rh[data-dir="sw"] { bottom:0; left:0;   transform:translate(-50%,50%);  cursor:sw-resize; }
.note-rh[data-dir="s"]  { bottom:0; left:50%; transform:translate(-50%,50%);  cursor:s-resize;  }
.note-rh[data-dir="se"] { bottom:0; right:0;  transform:translate(50%,50%);   cursor:se-resize; }
</style>

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

    <!-- Tooth crop -->
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

    <!-- Extra crop -->
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
    <div class="flex-1 overflow-hidden p-5 flex flex-col gap-3 min-h-0">
      <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0 flex items-center gap-1.5">
        <span class="material-symbols-outlined text-[13px]">crop</span>
        Cropped Output
        <span class="text-slate-500 font-normal normal-case tracking-normal text-[10px] ml-1">— 雙擊備註框可編輯，拖曳移動，拖角點縮放</span>
      </p>

      <!-- Image container: notes are absolute children of this -->
      <div id="imgContainer"
        class="flex-1 relative bg-black rounded-xl ring-1 ring-slate-200 dark:ring-slate-800 flex items-center justify-center overflow-hidden">
        <img id="previewImgMain" src="" alt="output"
          class="max-w-full max-h-full object-contain pointer-events-none"
          style="image-rendering:auto;" />

        <!-- Overlay badge (implant data) -->
        <div class="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 flex items-center gap-2 pointer-events-none">
          <span class="material-symbols-outlined text-primary text-sm">visibility</span>
          <span id="overlayBadge" class="text-white font-semibold text-base tracking-wide">— ( — x — )</span>
        </div>
        <div class="absolute inset-0 border-2 border-primary/25 pointer-events-none rounded-xl"></div>
      </div>
    </div>

    <!-- Fields -->
    <div class="shrink-0 px-5 pb-2">
      <div class="flex items-center gap-2 mb-2">
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

    <!-- Note section -->
    <div class="shrink-0 px-5 pb-2 border-t border-slate-100 dark:border-slate-800 pt-2">
      <div class="flex items-center gap-2 mb-2">
        <span class="material-symbols-outlined text-base" style="color:#a855f7">edit_note</span>
        <h2 class="text-sm font-bold">備註</h2>
        <span class="text-xs text-slate-400">（點「新增」加入備註框，雙擊框內可編輯，拖曳移動，拖角點縮放）</span>
      </div>
      <div class="flex gap-2">
        <select id="notePresetSelect"
          class="flex-1 bg-slate-50 dark:bg-[#1c2631] border border-slate-200 dark:border-slate-700 rounded-lg h-8 px-2 focus:ring-2 text-slate-900 dark:text-white transition-all outline-none text-xs">
          <option value="">— 選擇預設備註 —</option>
          <option value="__blank__">[空白]</option>
        </select>
        <button id="btnAddNote" type="button"
          class="px-3 h-8 rounded-lg text-sm font-semibold text-white shrink-0 transition-all active:scale-95"
          style="background:rgba(168,85,247,0.85);">
          新增
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="shrink-0 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/10 flex items-center justify-between">
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
