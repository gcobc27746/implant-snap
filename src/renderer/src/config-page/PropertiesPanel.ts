import type { AppConfig, RegionKey, RectRegionKey } from '@shared/config-schema'
import { isRectRegion, RECT_REGION_KEYS } from '@shared/config-schema'
import { REGION_META } from './constants'

type DisplayInfo = { id: string; name: string; width: number; height: number }

export type PanelEvents = {
  onRegionChange: (config: AppConfig) => void
  onVisibilityToggle: (key: RegionKey, visible: boolean) => void
  onSave: () => void
  onReset: () => void
  onCapture: () => void
  onExecute: () => void
  onRegionSelect: (key: RegionKey) => void
}

export class PropertiesPanel {
  private container!: HTMLElement
  private config!: AppConfig
  private events!: PanelEvents
  private selectedKey: RegionKey | null = null
  private visibility: Record<RegionKey, boolean> = {
    cropMain: true, ocrTooth: true, ocrExtra: true, overlayAnchor: true
  }
  private errorText = ''
  private displays: DisplayInfo[] = []
  private selectedDisplayId: string | null = null

  init(container: HTMLElement, config: AppConfig, events: PanelEvents): void {
    this.container = container
    this.config = config
    this.events = events
    this.loadDisplays()
    this.render()
  }

  private async loadDisplays(): Promise<void> {
    try {
      this.displays = await window.implantSnap.capture.listDisplays()
      this.render()
    } catch {
      this.displays = []
    }
  }

  updateConfig(config: AppConfig): void {
    const shouldRerender =
      this.config.previewEnabled !== config.previewEnabled ||
      this.config.sidecarEnabled !== config.sidecarEnabled ||
      this.config.forceSaveOnParseIncomplete !== config.forceSaveOnParseIncomplete ||
      this.config.outputDir !== config.outputDir ||
      this.config.overlayFontSize !== config.overlayFontSize
    this.config = config
    if (shouldRerender) {
      this.render()
      return
    }
    this.refreshInputs()
  }

  setSelected(key: RegionKey | null): void {
    this.selectedKey = key
    this.render()
  }

  setError(msg: string): void {
    this.errorText = msg
    const el = this.container.querySelector('#panelError')
    if (el) el.textContent = msg
  }

  clearError(): void {
    this.setError('')
  }

  private render(): void {
    this.container.innerHTML = ''
    this.container.appendChild(this.buildRegionList())
    this.container.appendChild(this.divider())

    if (this.selectedKey) {
      this.container.appendChild(this.buildSelectedDetail())
      this.container.appendChild(this.divider())
    }

    this.container.appendChild(this.buildActions())
  }

  private buildRegionList(): HTMLElement {
    const wrap = this.el('div', 'space-y-3')
    const title = this.el('h3', 'text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3')
    title.textContent = 'Regions'
    wrap.appendChild(title)

    const allKeys: RegionKey[] = [...RECT_REGION_KEYS, 'overlayAnchor']

    for (const key of allKeys) {
      const meta = REGION_META[key]
      const row = this.el('div',
        `flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors
         ${this.selectedKey === key ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`
      )
      row.addEventListener('click', () => this.events.onRegionSelect(key))

      const left = this.el('div', 'flex items-center gap-2')
      const dot = this.el('div', 'w-3 h-3 rounded-sm')
      dot.style.backgroundColor = meta.color
      left.appendChild(dot)
      const label = this.el('span', 'text-sm font-semibold')
      label.textContent = meta.label
      left.appendChild(label)
      row.appendChild(left)

      const visBtn = this.el('span',
        `material-symbols-outlined text-lg cursor-pointer ${this.visibility[key] ? 'text-slate-400' : 'text-red-400'}`
      )
      visBtn.textContent = this.visibility[key] ? 'visibility' : 'visibility_off'
      visBtn.title = '切換顯示'
      visBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.visibility[key] = !this.visibility[key]
        this.events.onVisibilityToggle(key, this.visibility[key])
        this.render()
      })
      row.appendChild(visBtn)

      wrap.appendChild(row)
    }
    return wrap
  }

  private buildSelectedDetail(): HTMLElement {
    const key = this.selectedKey!
    const meta = REGION_META[key]
    const wrap = this.el('div', 'space-y-4')

    const header = this.el('div', 'flex items-center gap-2 mb-2')
    const dot = this.el('div', 'w-3 h-3 rounded-sm')
    dot.style.backgroundColor = meta.color
    header.appendChild(dot)
    const title = this.el('span', 'text-sm font-bold')
    title.textContent = meta.label
    header.appendChild(title)
    wrap.appendChild(header)

    if (isRectRegion(key)) {
      const grid = this.el('div', 'grid grid-cols-2 gap-3')
      grid.appendChild(this.inputField('X', `input_${key}_x`, this.config.regions[key].x))
      grid.appendChild(this.inputField('Y', `input_${key}_y`, this.config.regions[key].y))
      grid.appendChild(this.inputField('W', `input_${key}_w`, this.config.regions[key].width))
      grid.appendChild(this.inputField('H', `input_${key}_h`, this.config.regions[key].height))
      wrap.appendChild(grid)
    } else {
      const grid = this.el('div', 'grid grid-cols-2 gap-3')
      grid.appendChild(this.inputField('X', `input_${key}_x`, this.config.regions[key].x))
      grid.appendChild(this.inputField('Y', `input_${key}_y`, this.config.regions[key].y))
      wrap.appendChild(grid)
    }

    const errEl = this.el('p', 'text-xs text-red-500 min-h-[1rem]')
    errEl.id = 'panelError'
    errEl.textContent = this.errorText
    wrap.appendChild(errEl)

    return wrap
  }

  private inputField(label: string, id: string, value: number): HTMLElement {
    const wrap = this.el('div', 'space-y-1')
    const lbl = this.el('label', 'text-[10px] font-bold text-slate-400 uppercase')
    lbl.textContent = label
    wrap.appendChild(lbl)

    const row = this.el('div', 'flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 py-1')
    const input = document.createElement('input')
    input.type = 'text'
    input.id = id
    input.value = String(value)
    input.className = 'bg-transparent border-none p-0 text-sm font-mono focus:ring-0 w-full outline-none'
    input.addEventListener('change', () => this.applyInputChange())
    input.addEventListener('blur', () => this.applyInputChange())
    row.appendChild(input)

    const unit = this.el('span', 'text-[10px] text-slate-500 ml-1')
    unit.textContent = 'PX'
    row.appendChild(unit)

    wrap.appendChild(row)
    return wrap
  }

  private applyInputChange(): void {
    const key = this.selectedKey
    if (!key) return

    const getVal = (suffix: string): number => {
      const el = document.getElementById(`input_${key}_${suffix}`) as HTMLInputElement | null
      return el ? parseInt(el.value, 10) || 0 : 0
    }

    const next = { ...this.config, regions: { ...this.config.regions } }

    if (isRectRegion(key)) {
      next.regions[key] = {
        x: getVal('x'), y: getVal('y'), width: getVal('w'), height: getVal('h')
      }
    } else {
      next.regions[key] = { x: getVal('x'), y: getVal('y') }
    }

    this.config = next
    this.events.onRegionChange(next)
  }

  private buildActions(): HTMLElement {
    const wrap = this.el('div', 'space-y-2')

    if (this.displays.length > 1) {
      const selectWrap = this.el('div', 'space-y-1')
      const label = this.el('label', 'text-[10px] font-bold text-slate-400 uppercase')
      label.textContent = '擷取螢幕'
      selectWrap.appendChild(label)

      const select = document.createElement('select')
      select.className = 'w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm outline-none focus:border-primary'

      const defaultOpt = document.createElement('option')
      defaultOpt.value = ''
      defaultOpt.textContent = '自動（主螢幕）'
      select.appendChild(defaultOpt)

      for (const d of this.displays) {
        const opt = document.createElement('option')
        opt.value = d.id
        opt.textContent = `${d.name} (${d.width}×${d.height})`
        if (d.id === this.selectedDisplayId) opt.selected = true
        select.appendChild(opt)
      }

      select.addEventListener('change', () => {
        this.selectedDisplayId = select.value || null
        window.implantSnap.capture.selectDisplay(this.selectedDisplayId)
      })
      selectWrap.appendChild(select)
      wrap.appendChild(selectWrap)
    }

    wrap.appendChild(this.buildPipelineSettings())

    const executeBtn = this.el('button',
      'w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95'
    )
    executeBtn.innerHTML = '<span class="material-symbols-outlined text-sm">rocket_launch</span>執行完整流程'
    executeBtn.addEventListener('click', () => this.events.onExecute())
    wrap.appendChild(executeBtn)

    const captureBtn = this.el('button',
      'w-full flex items-center justify-center gap-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
    )
    captureBtn.innerHTML = '<span class="material-symbols-outlined text-sm">screenshot_monitor</span>擷取螢幕樣本'
    captureBtn.addEventListener('click', () => this.events.onCapture())
    wrap.appendChild(captureBtn)

    const saveBtn = this.el('button',
      'w-full flex items-center justify-center gap-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
    )
    saveBtn.innerHTML = '<span class="material-symbols-outlined text-sm">save</span>儲存設定'
    saveBtn.addEventListener('click', () => this.events.onSave())
    wrap.appendChild(saveBtn)

    const resetBtn = this.el('button',
      'w-full flex items-center justify-center gap-2 py-2 border border-transparent text-red-500 rounded-lg text-sm font-bold hover:bg-red-500/10 transition-colors'
    )
    resetBtn.innerHTML = '<span class="material-symbols-outlined text-sm">restart_alt</span>重置區域'
    resetBtn.addEventListener('click', () => this.events.onReset())
    wrap.appendChild(resetBtn)

    return wrap
  }

  private buildPipelineSettings(): HTMLElement {
    const section = this.el('div', 'space-y-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/40')
    const title = this.el('p', 'text-[10px] font-bold uppercase tracking-widest text-slate-500')
    title.textContent = 'Pipeline Settings'
    section.appendChild(title)

    section.appendChild(
      this.toggleRow('預覽確認', this.config.previewEnabled, (checked) => {
        this.applyConfigField('previewEnabled', checked)
      })
    )
    section.appendChild(
      this.toggleRow('輸出 Sidecar JSON', this.config.sidecarEnabled, (checked) => {
        this.applyConfigField('sidecarEnabled', checked)
      })
    )
    section.appendChild(
      this.toggleRow('解析不完整仍儲存', this.config.forceSaveOnParseIncomplete, (checked) => {
        this.applyConfigField('forceSaveOnParseIncomplete', checked)
      })
    )
    section.appendChild(
      this.textRow('輸出資料夾', this.config.outputDir, (value) => {
        this.applyConfigField('outputDir', value.trim())
      })
    )
    section.appendChild(
      this.textRow('Overlay 字級', String(this.config.overlayFontSize), (value) => {
        const parsed = Number.parseInt(value, 10)
        if (Number.isFinite(parsed)) {
          this.applyConfigField('overlayFontSize', parsed)
        }
      })
    )
    return section
  }

  private toggleRow(
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void
  ): HTMLElement {
    const row = this.el('label', 'flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300')
    row.textContent = label
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = checked
    input.className = 'h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary'
    input.addEventListener('change', () => onChange(input.checked))
    row.appendChild(input)
    return row
  }

  private textRow(
    label: string,
    value: string,
    onChange: (next: string) => void
  ): HTMLElement {
    const row = this.el('div', 'space-y-1')
    const title = this.el('label', 'text-[10px] font-bold text-slate-400 uppercase')
    title.textContent = label
    row.appendChild(title)
    const input = document.createElement('input')
    input.type = 'text'
    input.value = value
    input.className = 'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs outline-none focus:border-primary'
    input.addEventListener('change', () => onChange(input.value))
    input.addEventListener('blur', () => onChange(input.value))
    row.appendChild(input)
    return row
  }

  private applyConfigField<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    const next = { ...this.config, [key]: value }
    this.config = next
    this.events.onRegionChange(next)
  }

  private refreshInputs(): void {
    if (!this.selectedKey) return
    const key = this.selectedKey
    const setVal = (suffix: string, v: number) => {
      const el = document.getElementById(`input_${key}_${suffix}`) as HTMLInputElement | null
      if (el && el !== document.activeElement) el.value = String(v)
    }
    if (isRectRegion(key)) {
      const r = this.config.regions[key]
      setVal('x', r.x); setVal('y', r.y); setVal('w', r.width); setVal('h', r.height)
    } else {
      const a = this.config.regions[key]
      setVal('x', a.x); setVal('y', a.y)
    }
  }

  private divider(): HTMLElement {
    return this.el('div', 'h-px bg-slate-200 dark:bg-slate-800 my-4')
  }

  private el(tag: string, className = ''): HTMLElement {
    const el = document.createElement(tag)
    if (className) el.className = className
    return el
  }
}
