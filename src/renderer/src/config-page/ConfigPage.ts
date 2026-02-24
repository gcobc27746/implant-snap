import type { AppConfig, RegionKey } from '@shared/config-schema'
import { isRegionRect } from '@shared/config-schema'
import Konva from 'konva'
import '../main.css'

const STAGE_WIDTH = 800
const STAGE_HEIGHT = 450

const REGION_LABELS: Record<RegionKey, string> = {
  cropMain: 'MAIN CROP',
  ocrTooth: 'OCR: TOOTH',
  ocrExtra: 'OCR: DATA',
  overlayAnchor: 'ANCHOR'
}

const REGION_COLORS: Record<RegionKey, string> = {
  cropMain: '#10b981',
  ocrTooth: '#137fec',
  ocrExtra: '#22d3ee',
  overlayAnchor: '#137fec'
}

const REGION_FILL: Record<'cropMain' | 'ocrTooth' | 'ocrExtra', string> = {
  cropMain: 'rgba(16, 185, 129, 0.05)',
  ocrTooth: 'rgba(19, 127, 236, 0.1)',
  ocrExtra: 'rgba(34, 211, 238, 0.05)'
}

const TAG_TEXT_COLOR: Record<'cropMain' | 'ocrTooth' | 'ocrExtra', string> = {
  cropMain: '#ffffff',
  ocrTooth: '#ffffff',
  ocrExtra: '#0f172a'
}

interface ConfigPageState {
  config: AppConfig
  selectedRegionKey: RegionKey | null
  visibility: Record<RegionKey, boolean>
  panelError: string
  statusMessage: string
}

let state: ConfigPageState = {
  config: {} as AppConfig,
  selectedRegionKey: null,
  visibility: { cropMain: true, ocrTooth: true, ocrExtra: true, overlayAnchor: true },
  panelError: '',
  statusMessage: '就緒'
}

let stage: Konva.Stage
let layer: Konva.Layer
let transformer: Konva.Transformer
const shapeRefs: Partial<Record<RegionKey, Konva.Rect | Konva.Circle | Konva.Group>> = {}
const tagRefs: Partial<Record<'cropMain' | 'ocrTooth' | 'ocrExtra', Konva.Label>> = {}

function scaleToStage(config: AppConfig) {
  const w = config.screenWidth
  const h = config.screenHeight
  return {
    x: (v: number) => (v / w) * STAGE_WIDTH,
    y: (v: number) => (v / h) * STAGE_HEIGHT,
    width: (v: number) => (v / w) * STAGE_WIDTH,
    height: (v: number) => (v / h) * STAGE_HEIGHT
  }
}

function scaleFromStage(config: AppConfig) {
  const w = config.screenWidth
  const h = config.screenHeight
  return {
    x: (v: number) => Math.round((v / STAGE_WIDTH) * w),
    y: (v: number) => Math.round((v / STAGE_HEIGHT) * h),
    width: (v: number) => Math.round((v / STAGE_WIDTH) * w),
    height: (v: number) => Math.round((v / STAGE_HEIGHT) * h)
  }
}

function syncConfigFromKonva(config: AppConfig): AppConfig {
  const scaleFrom = scaleFromStage(config)
  const next = { ...config, regions: { ...config.regions } }

  const cropMain = shapeRefs.cropMain
  if (cropMain) {
    next.regions.cropMain = {
      x: scaleFrom.x(cropMain.x()),
      y: scaleFrom.y(cropMain.y()),
      width: scaleFrom.width(cropMain.width() * (cropMain.scaleX() ?? 1)),
      height: scaleFrom.height(cropMain.height() * (cropMain.scaleY() ?? 1))
    }
  }
  const ocrTooth = shapeRefs.ocrTooth
  if (ocrTooth) {
    next.regions.ocrTooth = {
      x: scaleFrom.x(ocrTooth.x()),
      y: scaleFrom.y(ocrTooth.y()),
      width: scaleFrom.width(ocrTooth.width() * (ocrTooth.scaleX() ?? 1)),
      height: scaleFrom.height(ocrTooth.height() * (ocrTooth.scaleY() ?? 1))
    }
  }
  const ocrExtra = shapeRefs.ocrExtra
  if (ocrExtra) {
    next.regions.ocrExtra = {
      x: scaleFrom.x(ocrExtra.x()),
      y: scaleFrom.y(ocrExtra.y()),
      width: scaleFrom.width(ocrExtra.width() * (ocrExtra.scaleX() ?? 1)),
      height: scaleFrom.height(ocrExtra.height() * (ocrExtra.scaleY() ?? 1))
    }
  }
  const anchor = shapeRefs.overlayAnchor
  if (anchor) {
    next.regions.overlayAnchor = {
      x: scaleFrom.x(anchor.x()),
      y: scaleFrom.y(anchor.y())
    }
  }
  return next
}

function buildKonvaStage(container: HTMLDivElement, config: AppConfig) {
  const scaleTo = scaleToStage(config)
  const { regions } = config

  if (stage) stage.destroy()
  stage = new Konva.Stage({
    container,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    draggable: false
  })

  layer = new Konva.Layer()
  stage.add(layer)

  const bg = new Konva.Rect({
    x: 0,
    y: 0,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    fill: '#1e293b'
  })
  layer.add(bg)

  const addRect = (key: 'cropMain' | 'ocrTooth' | 'ocrExtra') => {
    const r = regions[key]
    const stroke = REGION_COLORS[key]
    const fill = REGION_FILL[key]
    const rect = new Konva.Rect({
      x: scaleTo.x(r.x),
      y: scaleTo.y(r.y),
      width: scaleTo.width(r.width),
      height: scaleTo.height(r.height),
      stroke,
      strokeWidth: 2,
      fill,
      draggable: true,
      name: key
    })
    const tagText = new Konva.Text({
      text: REGION_LABELS[key],
      fontFamily: 'Inter',
      fontSize: 10,
      fontStyle: 'bold',
      fill: TAG_TEXT_COLOR[key],
      padding: 2,
      listening: false
    })
    const tagBg = new Konva.Tag({
      fill: stroke,
      cornerRadius: [4, 4, 0, 0],
      pointerDirection: 'down',
      pointerWidth: 0,
      pointerHeight: 0
    })
    tagBg.height(tagText.height() + 4)
    tagBg.width(tagText.width() + 6)
    const label = new Konva.Label({
      x: scaleTo.x(r.x),
      y: scaleTo.y(r.y),
      listening: false
    })
    label.add(tagBg)
    label.add(tagText)
    const updateLabelPos = () => {
      label.x(rect.x())
      label.y(rect.y())
    }
    rect.on('dragmove transform', updateLabelPos)
    rect.on('dragend', () => {
      state.config = syncConfigFromKonva(state.config)
      updatePanelInputs()
    })
    rect.on('transformend', () => {
      const node = rect
      node.width(node.width() * (node.scaleX() || 1))
      node.height(node.height() * (node.scaleY() || 1))
      node.scaleX(1)
      node.scaleY(1)
      state.config = syncConfigFromKonva(state.config)
      updatePanelInputs()
    })
    rect.on('click', () => selectRegion(key))
    layer.add(label)
    layer.add(rect)
    shapeRefs[key] = rect
    tagRefs[key] = label
  }

  addRect('cropMain')
  addRect('ocrTooth')
  addRect('ocrExtra')

  const anchor = regions.overlayAnchor
  const anchorRadius = 16
  const anchorGroup = new Konva.Group({
    x: scaleTo.x(anchor.x),
    y: scaleTo.y(anchor.y),
    draggable: true,
    name: 'overlayAnchor'
  })
  anchorGroup.add(new Konva.Circle({
    radius: anchorRadius + 4,
    fill: 'transparent',
    stroke: 'rgba(19, 127, 236, 0.2)',
    strokeWidth: 4
  }))
  anchorGroup.add(new Konva.Circle({
    radius: anchorRadius,
    fill: 'rgba(19, 127, 236, 0.4)',
    stroke: '#ffffff',
    strokeWidth: 2
  }))
  const anchorIcon = new Konva.Text({
    text: 'anchor',
    fontFamily: '"Material Symbols Outlined", sans-serif',
    fontSize: 14,
    fill: '#ffffff',
    x: -7,
    y: -7,
    width: 14,
    height: 14,
    align: 'center',
    verticalAlign: 'middle',
    listening: false
  })
  anchorGroup.add(anchorIcon)
  anchorGroup.on('dragend', () => {
    state.config = syncConfigFromKonva(state.config)
    updatePanelInputs()
  })
  anchorGroup.on('click', () => selectRegion('overlayAnchor'))
  layer.add(anchorGroup)
  shapeRefs.overlayAnchor = anchorGroup

  transformer = new Konva.Transformer({
    borderStrokeWidth: 2,
    anchorSize: 8,
    anchorStroke: '#ffffff',
    anchorFill: '#ffffff',
    anchorCornerRadius: 4,
    keepRatio: false
  })
  layer.add(transformer)

  stage.on('click', (e) => {
    if (e.target === stage || e.target === layer || e.target === bg) {
      state.selectedRegionKey = null
      transformer.nodes([])
      updatePanelSelection()
    }
  })

  updateVisibility()
  layer.draw()
}

function updateVisibility() {
  ;(['cropMain', 'ocrTooth', 'ocrExtra', 'overlayAnchor'] as const).forEach((key) => {
    const shape = shapeRefs[key]
    const tag = tagRefs[key]
    if (shape) shape.visible(state.visibility[key])
    if (tag) tag.visible(state.visibility[key])
  })
  layer?.draw()
}

function selectRegion(key: RegionKey) {
  state.selectedRegionKey = key
  const shape = shapeRefs[key]
  if (shape && isRegionRect(key)) {
    transformer.borderStroke(REGION_COLORS[key])
    transformer.anchorStroke(REGION_COLORS[key])
    transformer.nodes([shape])
    transformer.moveToTop()
    shape.moveToTop()
    const tag = tagRefs[key]
    if (tag) tag.moveToTop()
  } else {
    transformer.nodes([])
  }
  updatePanelSelection()
  layer?.draw()
}

function updatePanelSelection() {
  const visibilityBtnIds: Record<RegionKey, string> = {
    cropMain: 'btnVisibilityCropMain',
    ocrTooth: 'btnVisibilityOcrTooth',
    ocrExtra: 'btnVisibilityOcrExtra',
    overlayAnchor: 'btnVisibilityAnchor'
  }
  ;(['cropMain', 'ocrTooth', 'ocrExtra', 'overlayAnchor'] as const).forEach((key) => {
    const btn = document.getElementById(visibilityBtnIds[key])
    if (btn) (btn as HTMLElement).textContent = state.visibility[key] ? 'visibility' : 'visibility_off'
  })
  updatePanelInputs()
}

const REGION_INPUT_PREFIX: Record<'cropMain' | 'ocrTooth' | 'ocrExtra', string> = {
  cropMain: 'CropMain',
  ocrTooth: 'OcrTooth',
  ocrExtra: 'OcrExtra'
}

function updatePanelInputs() {
  const { regions } = state.config
  ;(['cropMain', 'ocrTooth', 'ocrExtra'] as const).forEach((key) => {
    const r = regions[key]
    const p = REGION_INPUT_PREFIX[key]
    setInputValue(`input${p}X`, String(r.x))
    setInputValue(`input${p}Y`, String(r.y))
    setInputValue(`input${p}W`, String(r.width))
    setInputValue(`input${p}H`, String(r.height))
  })
  const a = regions.overlayAnchor
  setInputValue('inputAnchorX', String(a.x))
  setInputValue('inputAnchorY', String(a.y))
  updateStatusBar()
}

function setInputValue(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement | null
  if (el) el.value = value
}

function getInputNumber(id: string): number | null {
  const el = document.getElementById(id) as HTMLInputElement | null
  if (!el) return null
  const n = parseInt(el.value, 10)
  return Number.isNaN(n) ? null : n
}

async function applyInputToRegion(key: RegionKey) {
  if (!layer) return
  const scaleTo = scaleToStage(state.config)
  const nextConfig = { ...state.config, regions: { ...state.config.regions } }

  if (key === 'overlayAnchor') {
    const x = getInputNumber('inputAnchorX')
    const y = getInputNumber('inputAnchorY')
    if (x == null || y == null) return
    nextConfig.regions.overlayAnchor = { x, y }
  } else {
    const p = REGION_INPUT_PREFIX[key]
    const x = getInputNumber(`input${p}X`)
    const y = getInputNumber(`input${p}Y`)
    const w = getInputNumber(`input${p}W`)
    const h = getInputNumber(`input${p}H`)
    if (x == null || y == null || w == null || h == null) return
    nextConfig.regions[key] = { x, y, width: w, height: h }
  }

  const result = await window.implantSnap.config.validate(nextConfig)
  if (!result.valid) {
    state.panelError = result.errors.join(' ')
    renderPanelError()
    return
  }

  state.config = nextConfig
  state.panelError = ''
  renderPanelError()

  if (key === 'overlayAnchor') {
    const shape = shapeRefs.overlayAnchor
    const a = nextConfig.regions.overlayAnchor
    if (shape) {
      shape.x(scaleTo.x(a.x))
      shape.y(scaleTo.y(a.y))
    }
  } else {
    const shape = shapeRefs[key] as Konva.Rect
    const r = nextConfig.regions[key]
    if (shape && r && 'width' in r) {
      shape.setPosition({ x: scaleTo.x(r.x), y: scaleTo.y(r.y) })
      shape.size({ width: scaleTo.width(r.width), height: scaleTo.height(r.height) })
      shape.scaleX(1)
      shape.scaleY(1)
      const tag = tagRefs[key]
      if (tag) {
        tag.x(scaleTo.x(r.x))
        const tagH = (tag as Konva.Label).height() || 18
        tag.y(scaleTo.y(r.y) - tagH - 2)
      }
    }
  }
  layer.draw()
  updateStatusBar()
}

function updateStatusBar() {
  const sel = document.getElementById('statusSelection') as HTMLElement
  const cur = document.getElementById('statusCursor') as HTMLElement
  if (!sel || !cur) return
  const key = state.selectedRegionKey
  if (!key) {
    sel.textContent = '未選取'
    return
  }
  if (key === 'overlayAnchor') {
    const a = state.config.regions.overlayAnchor
    sel.textContent = `Anchor: ${a.x}, ${a.y}`
  } else {
    const r = state.config.regions[key]
    sel.textContent = `選取: ${r.width}×${r.height} px`
  }
}

function validateCurrentConfig(): string[] {
  const result = window.implantSnap.config.validate(state.config)
  return (result as { then: (fn: (r: { errors: string[] }) => void) => void }).then
    ? []
    : (result as { errors: string[] }).errors
}

async function handleSave() {
  const result = await window.implantSnap.config.validate(state.config)
  if (!result.valid) {
    state.panelError = result.errors.join(' ')
    state.statusMessage = '驗證失敗'
    renderPanelError()
    updateStatusMessage()
    return
  }
  try {
    await window.implantSnap.config.save(state.config)
    state.panelError = ''
    state.statusMessage = '已儲存設定'
    renderPanelError()
    updateStatusMessage()
  } catch (e) {
    state.panelError = e instanceof Error ? e.message : String(e)
    state.statusMessage = '儲存失敗'
    renderPanelError()
    updateStatusMessage()
  }
}

async function handleReset() {
  try {
    state.config = await window.implantSnap.config.reset()
    state.selectedRegionKey = null
    state.panelError = ''
    state.statusMessage = '已重置區域'
    buildKonvaStage(
      document.getElementById('canvasContainer') as HTMLDivElement,
      state.config
    )
    updatePanelSelection()
  } catch (e) {
    state.statusMessage = '重置失敗'
  }
  updateStatusMessage()
}

function renderPanelError() {
  const el = document.getElementById('panelError') as HTMLElement
  if (el) {
    el.textContent = state.panelError
    el.style.display = state.panelError ? 'block' : 'none'
  }
}

function updateStatusMessage() {
  const el = document.getElementById('statusMessage') as HTMLElement
  if (el) el.textContent = state.statusMessage
}

export async function mountConfigPage(root: HTMLElement) {
  const config = await window.implantSnap.config.load()
  state.config = config
  state.selectedRegionKey = null
  state.panelError = ''
  state.statusMessage = '就緒'

  root.className = 'config-page flex h-screen w-full dark bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100'
  root.innerHTML = `
<!-- Sidebar Navigation -->
<aside class="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-background-dark">
<div class="p-6 flex items-center gap-3">
<div class="bg-primary rounded-lg p-2 flex items-center justify-center text-white">
<span class="material-symbols-outlined">dentistry</span>
</div>
<div>
<h1 class="font-bold text-sm tracking-tight">Dental OCR</h1>
<p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">v1.2.0-stable</p>
</div>
</div>
<nav class="flex-1 px-4 space-y-1">
<a class="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary group" href="#">
<span class="material-symbols-outlined">crop_free</span>
<span class="text-sm font-medium">Capture Config</span>
</a>
<a class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
<span class="material-symbols-outlined">history</span>
<span class="text-sm font-medium">History</span>
</a>
<a class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
<span class="material-symbols-outlined">analytics</span>
<span class="text-sm font-medium">Extraction Logs</span>
</a>
<a class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
<span class="material-symbols-outlined">settings</span>
<span class="text-sm font-medium">Settings</span>
</a>
</nav>
<div class="p-4 mt-auto">
<div class="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
<p class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Global Shortcut</p>
<div class="flex gap-1 items-center">
<kbd class="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-bold shadow-sm">Ctrl</kbd>
<span class="text-slate-400">+</span>
<kbd class="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-bold shadow-sm">Shift</kbd>
<span class="text-slate-400">+</span>
<kbd class="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-bold shadow-sm">S</kbd>
</div>
</div>
</div>
<div class="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
<div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
<span class="material-symbols-outlined text-sm">person</span>
</div>
<div class="flex-1 min-w-0">
<p class="text-xs font-bold truncate">Dr. Julian Smith</p>
<p class="text-[10px] text-slate-500 truncate">Radiology Dept.</p>
</div>
</div>
</aside>
<!-- Main Workspace -->
<main class="flex-1 flex flex-col bg-slate-50 dark:bg-background-dark overflow-hidden">
<!-- Header Bar -->
<header class="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-background-dark/80 backdrop-blur-md z-10">
<div class="flex items-center gap-4">
<h2 class="text-sm font-bold flex items-center gap-2">
<span class="text-primary material-symbols-outlined">layers</span>
                        Region Configuration
                    </h2>
<div class="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
<div class="flex items-center gap-2 text-xs text-slate-500">
<span>Workspace 01</span>
<span class="material-symbols-outlined text-xs">chevron_right</span>
<span class="text-slate-900 dark:text-slate-200 font-medium">Standard Orthopantomogram</span>
</div>
</div>
<div class="flex items-center gap-3">
<button class="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent">
<span class="material-symbols-outlined text-sm">image</span>
                        Update Sample
                    </button>
<button class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all active:scale-95">
<span class="material-symbols-outlined text-sm leading-none">play_arrow</span>
                        Start Capture
                    </button>
</div>
</header>
<div class="flex-1 flex overflow-hidden">
<!-- Editor Canvas -->
<div class="flex-1 relative p-6 canvas-container overflow-auto flex items-center justify-center">
<div class="relative inline-block shadow-2xl rounded-lg overflow-hidden border-4 border-slate-800 ring-1 ring-white/10 group" id="canvasContainer">
</div>
</div>
<!-- Right Configuration Panel -->
<aside class="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark/50 overflow-y-auto">
<div class="p-6 pt-2 space-y-4">
<div id="panelError" class="text-xs text-red-600 mt-1" style="display:none"></div>

<div>
<h3 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Regions</h3>
<div class="space-y-4">
<div>
<div class="flex items-center justify-between mb-2">
<div class="flex items-center gap-2">
<div class="w-3 h-3 rounded-sm bg-emerald-500"></div>
<span class="text-sm font-bold">MAIN CROP</span>
</div>
<span class="material-symbols-outlined text-slate-400 cursor-pointer text-lg" id="btnVisibilityCropMain" data-region="cropMain" title="切換顯示">visibility</span>
</div>
<div class="grid grid-cols-4 gap-3">
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">POS X</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputCropMainX" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">POS Y</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputCropMainY" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">WIDTH</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputCropMainW" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">HEIGHT</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputCropMainH" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
</div>
</div>

<div>
<div class="flex items-center justify-between mb-2">
<div class="flex items-center gap-2">
<div class="w-3 h-3 rounded-sm bg-primary"></div>
<span class="text-sm font-bold">OCR: TOOTH</span>
</div>
<span class="material-symbols-outlined text-slate-400 cursor-pointer text-lg" id="btnVisibilityOcrTooth" data-region="ocrTooth" title="切換顯示">visibility</span>
</div>
<div class="grid grid-cols-4 gap-3">
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">POS X</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputOcrToothX" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">POS Y</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputOcrToothY" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">WIDTH</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputOcrToothW" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">HEIGHT</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputOcrToothH" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
</div>
</div>

<div>
<div class="flex items-center justify-between mb-2">
<div class="flex items-center gap-2">
<div class="w-3 h-3 rounded-sm bg-cyan-400"></div>
<span class="text-sm font-bold">OCR: DATA</span>
</div>
<span class="material-symbols-outlined text-slate-400 cursor-pointer text-lg" id="btnVisibilityOcrExtra" data-region="ocrExtra" title="切換顯示">visibility</span>
</div>
<div class="grid grid-cols-4 gap-3">
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">POS X</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputOcrExtraX" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">POS Y</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputOcrExtraY" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">WIDTH</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputOcrExtraW" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">HEIGHT</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputOcrExtraH" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
</div>
</div>

<div>
<div class="flex items-center justify-between mb-2">
<div class="flex items-center gap-2">
<div class="w-3 h-3 rounded-sm bg-primary"></div>
<span class="text-sm font-bold">ANCHOR</span>
</div>
<span class="material-symbols-outlined text-slate-400 cursor-pointer text-lg" id="btnVisibilityAnchor" data-region="overlayAnchor" title="切換顯示">visibility</span>
</div>
<div class="grid grid-cols-4 gap-3">
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">POS X</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputAnchorX" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
<div class="space-y-1">
<label class="text-[10px] font-bold text-slate-400">POS Y</label>
<div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
<input class="bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full" type="text" id="inputAnchorY" />
<span class="text-[10px] text-slate-500">PX</span>
</div>
</div>
</div>
</div>
</div>
</div>
          <div class="h-px bg-slate-200 dark:bg-slate-800"></div>
          <div class="space-y-2">
<button id="btnSave" class="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
<span class="material-symbols-outlined text-sm">save</span>
                                Save Preset
                            </button>
<button id="btnReset" class="w-full flex items-center justify-center gap-2 py-2 border border-transparent text-red-500 rounded-lg text-sm font-bold hover:bg-red-500/10 transition-colors">
<span class="material-symbols-outlined text-sm">delete</span>
                                Reset Region
                            </button>
</div>
</div>
</aside>
</div>
<!-- Bottom Status Bar -->
<footer class="h-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark/95 flex items-center justify-between px-6 text-[11px] font-medium text-slate-500">
<div class="flex items-center gap-6">
<div class="flex items-center gap-2">
<div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
<span id="statusMessage">Engine: Ready</span>
</div>
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-[14px]">memory</span>
<span>GPU Acceleration: Enabled</span>
</div>
</div>
<div class="flex items-center gap-4">
<span id="statusSelection">Selected: 80x90px</span>
<div class="h-3 w-px bg-slate-200 dark:bg-slate-800"></div>
<span id="statusCursor">Cursor: 1042, 350</span>
</div>
</footer>
</main>
  `

  const container = document.getElementById('canvasContainer') as HTMLDivElement
  buildKonvaStage(container, state.config)

  document.getElementById('btnSave')?.addEventListener('click', handleSave)
  document.getElementById('btnReset')?.addEventListener('click', handleReset)
  const visibilityBtnIds: Record<RegionKey, string> = {
    cropMain: 'btnVisibilityCropMain',
    ocrTooth: 'btnVisibilityOcrTooth',
    ocrExtra: 'btnVisibilityOcrExtra',
    overlayAnchor: 'btnVisibilityAnchor'
  }
  ;(['cropMain', 'ocrTooth', 'ocrExtra', 'overlayAnchor'] as const).forEach((key) => {
    document.getElementById(visibilityBtnIds[key])?.addEventListener('click', () => {
      state.visibility[key] = !state.visibility[key]
      updateVisibility()
      updatePanelSelection()
    })
  })

  const bindInput = (id: string, fn: () => void) => {
    const el = document.getElementById(id)
    el?.addEventListener('change', fn)
    el?.addEventListener('blur', fn)
  }
  bindInput('inputCropMainX', () => applyInputToRegion('cropMain'))
  bindInput('inputCropMainY', () => applyInputToRegion('cropMain'))
  bindInput('inputCropMainW', () => applyInputToRegion('cropMain'))
  bindInput('inputCropMainH', () => applyInputToRegion('cropMain'))
  bindInput('inputOcrToothX', () => applyInputToRegion('ocrTooth'))
  bindInput('inputOcrToothY', () => applyInputToRegion('ocrTooth'))
  bindInput('inputOcrToothW', () => applyInputToRegion('ocrTooth'))
  bindInput('inputOcrToothH', () => applyInputToRegion('ocrTooth'))
  bindInput('inputOcrExtraX', () => applyInputToRegion('ocrExtra'))
  bindInput('inputOcrExtraY', () => applyInputToRegion('ocrExtra'))
  bindInput('inputOcrExtraW', () => applyInputToRegion('ocrExtra'))
  bindInput('inputOcrExtraH', () => applyInputToRegion('ocrExtra'))
  bindInput('inputAnchorX', () => applyInputToRegion('overlayAnchor'))
  bindInput('inputAnchorY', () => applyInputToRegion('overlayAnchor'))

  updatePanelSelection()
  updateStatusBar()
}
