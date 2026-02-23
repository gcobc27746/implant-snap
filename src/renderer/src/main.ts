import { renderConfigWorkbench, ROI_META, type RoiKey } from './App'
import type { AppConfig, RegionRect } from '../../main/config/schema'

const STORAGE_KEY = 'implant-snap-web-config'
const BASE_WIDTH = 1280
const BASE_HEIGHT = 720

type ValidationResult = { valid: boolean; errors: string[] }

type RectLike = RegionRect & { visible?: boolean }

type UiState = {
  config: AppConfig
  selected: RoiKey
  visibility: Record<RoiKey, boolean>
}

function injectStyles(): void {
  const style = document.createElement('style')
  style.textContent = `
    .tools-panel { width:330px; min-width:330px; border-left:1px solid #1f2c38; background:#111c27; overflow:auto; padding:16px 14px 16px 12px; display:grid; gap:14px; }

    .region-form-grid { display:grid; gap:10px; }
    .region-card { border:1px solid #233749; border-radius:10px; padding:8px; background:#101c27; }
    .region-card h4 { margin:0 0 8px; font-size:12px; color:#cbd5e1; }
    h1,h2 { margin: 0 0 8px; }
    .left-nav p { margin-top: 0; color: #9db2c6; font-size: 13px; }
    .roi-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    .roi-item { border: 1px solid #35526a; border-radius: 10px; padding: 8px; cursor: pointer; display:flex; justify-content:space-between; align-items:center; }
    .roi-item.active { border-color: #137fec; box-shadow: inset 0 0 0 1px #137fec; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .canvas-panel { display: flex; flex-direction: column; }
    .panel-header { display: flex; justify-content: space-between; color: #9db2c6; margin-bottom: 8px; }
    .canvas-viewport { position: relative; flex: 1; border-radius: 12px; background: #0d151e; border: 1px dashed #2f495d; overflow: hidden; }
    .roi-layer { position: absolute; inset: 0; }
    .roi-box { position: absolute; border: 2px solid; border-radius: 8px; box-sizing: border-box; cursor: move; background: color-mix(in srgb, var(--color) 18%, transparent); }
    .roi-label { position: absolute; top: -22px; left: 0; font-size: 12px; background: #0f1b27; border: 1px solid #35526a; border-radius: 6px; padding: 2px 6px; }
    .roi-handle { position: absolute; width: 12px; height: 12px; right: -7px; bottom: -7px; border-radius: 50%; background: var(--color); cursor: nwse-resize; border: 1px solid white; }
    .anchor { width: 14px; height: 14px; border-radius: 50%; transform: translate(-7px, -7px); cursor: move; }
    .field-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    label { display: grid; font-size: 12px; color: #9db2c6; gap: 4px; }
    input { background: #0f1b27; color: white; border:1px solid #35526a; border-radius: 8px; padding: 8px; }
    input:focus { outline: 2px solid #137fec; }
    .button-row { display:grid; gap:8px; margin-top: 12px; }
    button { border-radius: 10px; border: 1px solid #35526a; padding: 8px 10px; cursor: pointer; }
    .btn-primary { background: #137fec; color: white; border-color: #137fec; }
    .btn-secondary { background: #0f1b27; color: #d5e3f3; }
    .validation { min-height: 20px; color: #fb7185; font-size: 13px; }
    .status-bar { height: 46px; display:flex; align-items:center; padding: 0 14px; border-top: 1px solid #294154; background:#0c141d; color:#9db2c6; }
  `
  document.head.appendChild(style)
}

const api = {
  async load(): Promise<AppConfig> {
    if (window.implantSnap?.config) {
      return window.implantSnap.config.load()
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig()
    return JSON.parse(raw) as AppConfig
  },
  async save(config: AppConfig): Promise<AppConfig> {
    if (window.implantSnap?.config) {
      return window.implantSnap.config.save(config)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    return config
  },
  async validate(config: AppConfig): Promise<ValidationResult> {
    if (window.implantSnap?.config) {
      return window.implantSnap.config.validate(config)
    }
    const errors: string[] = []
    ;(['cropMain', 'ocrTooth', 'ocrExtra'] as const).forEach((key) => {
      const r = config.regions[key]
      if (r.x < 1 || r.y < 1 || r.width < 1 || r.height < 1) errors.push(`${key} 不可為 0 或負值`)
      if (r.x + r.width - 1 > config.screenWidth || r.y + r.height - 1 > config.screenHeight) {
        errors.push(`${key} 超出畫布`)
      }
    })
    const a = config.regions.overlayAnchor
    if (a.x < 1 || a.y < 1 || a.x > config.screenWidth || a.y > config.screenHeight) {
      errors.push('overlayAnchor 超出畫布')
    }
    return { valid: errors.length === 0, errors }
  },
  async reset(): Promise<AppConfig> {
    if (window.implantSnap?.config) {
      return window.implantSnap.config.reset()
    }
    const next = defaultConfig()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  }
}

function defaultConfig(): AppConfig {
  return {
    screenWidth: BASE_WIDTH,
    screenHeight: BASE_HEIGHT,
    previewEnabled: true,
    requiresRegionRedefinition: false,
    regions: {
      cropMain: { x: 80, y: 70, width: 660, height: 500 },
      ocrTooth: { x: 770, y: 80, width: 180, height: 120 },
      ocrExtra: { x: 770, y: 220, width: 220, height: 160 },
      overlayAnchor: { x: 760, y: 600 }
    }
  }
}

function deepClone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)) as T }

async function bootstrap() {
  injectStyles()
  const root = document.getElementById('app')
  if (!root) return

  const state: UiState = {
    config: await api.load(),
    selected: 'cropMain',
    visibility: { cropMain: true, ocrTooth: true, ocrExtra: true, overlayAnchor: true }
  }

  root.innerHTML = renderConfigWorkbench(state.config)
  mount(state)
}

function mount(state: UiState): void {
  const fields = {
    cropMain: {
      x: document.getElementById('cropMainX') as HTMLInputElement,
      y: document.getElementById('cropMainY') as HTMLInputElement,
      width: document.getElementById('cropMainWidth') as HTMLInputElement,
      height: document.getElementById('cropMainHeight') as HTMLInputElement
    },
    ocrTooth: {
      x: document.getElementById('ocrToothX') as HTMLInputElement,
      y: document.getElementById('ocrToothY') as HTMLInputElement,
      width: document.getElementById('ocrToothWidth') as HTMLInputElement,
      height: document.getElementById('ocrToothHeight') as HTMLInputElement
    },
    ocrExtra: {
      x: document.getElementById('ocrExtraX') as HTMLInputElement,
      y: document.getElementById('ocrExtraY') as HTMLInputElement,
      width: document.getElementById('ocrExtraWidth') as HTMLInputElement,
      height: document.getElementById('ocrExtraHeight') as HTMLInputElement
    },
    overlayAnchor: {
      x: document.getElementById('overlayAnchorX') as HTMLInputElement,
      y: document.getElementById('overlayAnchorY') as HTMLInputElement
    }
  }

    fields.cropMain.x.value = String(state.config.regions.cropMain.x)
    fields.cropMain.y.value = String(state.config.regions.cropMain.y)
    fields.cropMain.width.value = String(state.config.regions.cropMain.width)
    fields.cropMain.height.value = String(state.config.regions.cropMain.height)

    fields.ocrTooth.x.value = String(state.config.regions.ocrTooth.x)
    fields.ocrTooth.y.value = String(state.config.regions.ocrTooth.y)
    fields.ocrTooth.width.value = String(state.config.regions.ocrTooth.width)
    fields.ocrTooth.height.value = String(state.config.regions.ocrTooth.height)

    fields.ocrExtra.x.value = String(state.config.regions.ocrExtra.x)
    fields.ocrExtra.y.value = String(state.config.regions.ocrExtra.y)
    fields.ocrExtra.width.value = String(state.config.regions.ocrExtra.width)
    fields.ocrExtra.height.value = String(state.config.regions.ocrExtra.height)

    fields.overlayAnchor.x.value = String(state.config.regions.overlayAnchor.x)
    fields.overlayAnchor.y.value = String(state.config.regions.overlayAnchor.y)

    editorTitle.textContent = ROI_META[state.selected].chip
    selectedColor.style.background = ROI_META[state.selected].color
    toggleVisibleBtn.textContent = state.visibility[state.selected] ? 'visibility' : 'visibility_off'
        dot.onclick = () => {
          state.selected = 'overlayAnchor'
          renderInputs()
        }
    state.selected = key


  const syncRectFromFields = async (key: 'cropMain' | 'ocrTooth' | 'ocrExtra') => {
    const set = fields[key]
    state.config.regions[key] = {
      x: Number(set.x.value),
      y: Number(set.y.value),
      width: Number(set.width.value),
      height: Number(set.height.value)
    state.selected = key
    renderLayer()
    renderInputs()
    await applyValidation()
  }
  const syncAnchorFromFields = async () => {
    state.config.regions.overlayAnchor = {
      x: Number(fields.overlayAnchor.x.value),
      y: Number(fields.overlayAnchor.y.value)
    }
    state.selected = 'overlayAnchor'
  ;(['cropMain', 'ocrTooth', 'ocrExtra'] as const).forEach((key) => {
    const set = fields[key]
    ;[set.x, set.y, set.width, set.height].forEach((el) => {
      el.addEventListener('input', () => void syncRectFromFields(key))
    })
  })
  fields.overlayAnchor.x.addEventListener('input', () => void syncAnchorFromFields())
  fields.overlayAnchor.y.addEventListener('input', () => void syncAnchorFromFields())
  }

    const startX = event.clientX
    const startY = event.clientY
    const snapshot = deepClone(state.config.regions[key]) as RectLike
    const move = (e: PointerEvent) => {
      const dx = toRealX(e.clientX - startX)
      const dy = toRealY(e.clientY - startY)
      if (key === 'overlayAnchor') {
        state.config.regions.overlayAnchor.x = Math.min(state.config.screenWidth, Math.max(1, snapshot.x + dx - 1))
        state.config.regions.overlayAnchor.y = Math.min(state.config.screenHeight, Math.max(1, snapshot.y + dy - 1))
      } else {
        const target = state.config.regions[key] as RegionRect
        if (mode === 'move') {
          target.x = Math.min(state.config.screenWidth - target.width + 1, Math.max(1, snapshot.x + dx - 1))
          target.y = Math.min(state.config.screenHeight - target.height + 1, Math.max(1, snapshot.y + dy - 1))
        } else {
          target.width = Math.max(1, snapshot.width + dx - 1)
          target.height = Math.max(1, snapshot.height + dy - 1)
          target.width = Math.min(target.width, state.config.screenWidth - target.x + 1)
          target.height = Math.min(target.height, state.config.screenHeight - target.y + 1)
        }
      }
      renderLayer()
      renderInputs()
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const renderLayer = () => {
    roiLayer.innerHTML = ''
    ;(Object.keys(ROI_META) as RoiKey[]).forEach((key) => {
      if (!state.visibility[key]) return
      const color = ROI_META[key].color
      if (key === 'overlayAnchor') {
        const a = state.config.regions.overlayAnchor
        const el = document.createElement('div')
        el.className = 'roi-box anchor'
        el.style.setProperty('--color', color)
        el.style.left = `${toPxX(a.x)}px`
        el.style.top = `${toPxY(a.y)}px`
        el.onpointerdown = (e) => startDrag(key, e, 'move')
        roiLayer.appendChild(el)
        return
      }

      const r = state.config.regions[key]
      const box = document.createElement('div')
      box.className = 'roi-box'
      box.style.setProperty('--color', color)
      box.style.left = `${toPxX(r.x)}px`
      box.style.top = `${toPxY(r.y)}px`
      box.style.width = `${Math.round(r.width * sx)}px`
      box.style.height = `${Math.round(r.height * sy)}px`
      box.onclick = () => {
        state.selected = key
        renderRoiList()
        renderInputs()
      }
      box.onpointerdown = (e) => startDrag(key, e, 'move')

      const label = document.createElement('div')
      label.className = 'roi-label'
      label.textContent = `${key} (${r.x}, ${r.y}) ${r.width}×${r.height}`
      box.appendChild(label)

      const handle = document.createElement('div')
      handle.className = 'roi-handle'
      handle.onpointerdown = (e) => {
        e.stopPropagation()
        startDrag(key, e, 'resize')
      }
      box.appendChild(handle)
      roiLayer.appendChild(box)
    })
  }

  const applyFieldValues = async () => {
    const key = state.selected
    const x = Number(fieldX.value)
    const y = Number(fieldY.value)
    if (key === 'overlayAnchor') {
      state.config.regions.overlayAnchor = { x, y }
    } else {
      state.config.regions[key] = { x, y, width: Number(fieldW.value), height: Number(fieldH.value) }
    }
    const result = await api.validate(state.config)
    validation.textContent = result.valid ? '' : result.errors.join('；')
    renderLayer()
  }

  ;[fieldX, fieldY, fieldW, fieldH].forEach((input) => input.addEventListener('input', () => void applyFieldValues()))

  saveBtn.onclick = async () => {
    const result = await api.validate(state.config)
    if (!result.valid) {
      validation.textContent = result.errors.join('；')
      status.textContent = '儲存失敗：請先修正欄位錯誤。'
      return
    }
    state.config = await api.save(state.config)
    status.textContent = '設定已儲存。'
    validation.textContent = ''
  }

  resetRegionBtn.onclick = async () => {
    const resetConfig = await api.reset()
    state.config.regions[state.selected] = deepClone(resetConfig.regions[state.selected]) as never
    renderInputs()
    renderLayer()
    status.textContent = `已重置 ${state.selected}。`
  }

  resetAllBtn.onclick = async () => {
    state.config = await api.reset()
    renderInputs()
    renderLayer()
    status.textContent = '已重置全部設定。'
  }

  renderRoiList()
  renderInputs()
  renderLayer()
}

void bootstrap()
    if (state.selected === 'overlayAnchor') {
      state.config.regions.overlayAnchor = clone(base.regions.overlayAnchor)
    } else {
      const selectedRectKey: 'cropMain' | 'ocrTooth' | 'ocrExtra' = state.selected
      state.config.regions[selectedRectKey] = clone(base.regions[selectedRectKey])
    }
