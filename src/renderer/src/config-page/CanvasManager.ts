import Konva from 'konva'
import type { AppConfig, RegionKey, RectRegionKey } from '@shared/config-schema'
import { isRectRegion } from '@shared/config-schema'
import {
  REGION_META,
  RECT_KEYS,
  ANCHOR_RADIUS,
  MIN_LAYER_SCALE,
  MAX_LAYER_SCALE,
  ZOOM_FACTOR,
  WHEEL_PAN_PX
} from './constants'

export type CanvasEvents = {
  onRegionChange: (config: AppConfig) => void
  onRegionSelect: (key: RegionKey | null) => void
  onCursorMove: (x: number | null, y: number | null) => void
}

export class CanvasManager {
  private stage!: Konva.Stage
  private layer!: Konva.Layer
  private transformer!: Konva.Transformer
  private bgNode!: Konva.Rect
  private bgImage: Konva.Image | null = null
  private shapes: Partial<Record<RegionKey, Konva.Rect | Konva.Group>> = {}
  private labels: Partial<Record<RectRegionKey, Konva.Label>> = {}
  private config!: AppConfig
  private events!: CanvasEvents
  private resizeObserver!: ResizeObserver

  init(container: HTMLDivElement, config: AppConfig, events: CanvasEvents): void {
    this.config = config
    this.events = events

    const stageW = config.screenWidth
    const stageH = config.screenHeight

    this.stage = new Konva.Stage({
      container,
      width: stageW,
      height: stageH,
      draggable: false
    })

    this.layer = new Konva.Layer()
    this.stage.add(this.layer)

    this.bgNode = new Konva.Rect({
      x: 0, y: 0, width: stageW, height: stageH,
      fill: '#1e293b', listening: true
    })
    this.layer.add(this.bgNode)

    for (const key of RECT_KEYS) {
      this.addRectRegion(key)
    }
    this.addAnchor()

    this.transformer = new Konva.Transformer({
      borderStrokeWidth: 2,
      anchorSize: 8,
      anchorStroke: '#ffffff',
      anchorFill: '#ffffff',
      anchorCornerRadius: 4,
      keepRatio: false
    })
    this.layer.add(this.transformer)

    this.setupStageEvents()
    this.fitToContainer(container)
    this.layer.draw()

    this.resizeObserver = new ResizeObserver(() => {
      this.fitToContainer(container)
      this.layer.batchDraw()
    })
    this.resizeObserver.observe(container)
  }

  setBackground(dataUrl: string): void {
    const img = new Image()
    img.onload = () => {
      if (this.bgImage) {
        this.bgImage.destroy()
      }
      this.bgImage = new Konva.Image({
        x: 0, y: 0,
        width: this.config.screenWidth,
        height: this.config.screenHeight,
        image: img,
        listening: false
      })
      this.layer.add(this.bgImage)
      this.bgImage.moveToBottom()
      this.bgNode.visible(false)
      this.layer.batchDraw()
    }
    img.src = dataUrl
  }

  updateConfig(config: AppConfig): void {
    this.config = config
    for (const key of RECT_KEYS) {
      const shape = this.shapes[key] as Konva.Rect | undefined
      const label = this.labels[key]
      const r = config.regions[key]
      if (shape) {
        shape.setAttrs({ x: r.x, y: r.y, width: r.width, height: r.height, scaleX: 1, scaleY: 1 })
      }
      if (label) {
        label.setAttrs({ x: r.x, y: r.y })
      }
    }
    const anchor = this.shapes.overlayAnchor as Konva.Group | undefined
    if (anchor) {
      anchor.setAttrs({ x: config.regions.overlayAnchor.x, y: config.regions.overlayAnchor.y })
    }
    this.layer.batchDraw()
  }

  selectRegion(key: RegionKey | null): void {
    if (!key) {
      this.transformer.nodes([])
    } else {
      const shape = this.shapes[key]
      if (shape && isRectRegion(key)) {
        this.transformer.nodes([shape])
      } else {
        this.transformer.nodes([])
      }
    }
    this.layer.batchDraw()
  }

  setVisibility(key: RegionKey, visible: boolean): void {
    const shape = this.shapes[key]
    if (shape) shape.visible(visible)
    if (isRectRegion(key)) {
      const label = this.labels[key]
      if (label) label.visible(visible)
    }
    this.layer.batchDraw()
  }

  destroy(): void {
    this.resizeObserver.disconnect()
    this.stage.destroy()
  }

  private addRectRegion(key: RectRegionKey): void {
    const r = this.config.regions[key]
    const meta = REGION_META[key]

    const rect = new Konva.Rect({
      x: r.x, y: r.y, width: r.width, height: r.height,
      stroke: meta.color, strokeWidth: 2,
      fill: meta.fill, draggable: true, name: key
    })

    const label = this.createTag(key, r.x, r.y)

    const syncLabel = () => { label.setAttrs({ x: rect.x(), y: rect.y() }) }
    rect.on('dragmove transform', syncLabel)
    rect.on('dragend', () => this.syncFromShapes())
    rect.on('transformend', () => {
      rect.width(rect.width() * (rect.scaleX() || 1))
      rect.height(rect.height() * (rect.scaleY() || 1))
      rect.scaleX(1)
      rect.scaleY(1)
      this.syncFromShapes()
    })
    rect.on('click tap', () => this.events.onRegionSelect(key))

    this.layer.add(label)
    this.layer.add(rect)
    this.shapes[key] = rect
    this.labels[key] = label
  }

  private createTag(key: RectRegionKey, x: number, y: number): Konva.Label {
    const meta = REGION_META[key]
    const text = new Konva.Text({
      text: meta.label,
      fontFamily: 'Inter, sans-serif',
      fontSize: 11,
      fontStyle: 'bold',
      fill: meta.tagTextColor,
      padding: 3,
      listening: false
    })
    const tag = new Konva.Tag({
      fill: meta.color,
      cornerRadius: [4, 4, 0, 0]
    })
    const label = new Konva.Label({ x, y, offsetY: text.height() + 6, listening: false })
    label.add(tag)
    label.add(text)
    return label
  }

  private addAnchor(): void {
    const a = this.config.regions.overlayAnchor
    const group = new Konva.Group({ x: a.x, y: a.y, draggable: true, name: 'overlayAnchor' })

    group.add(new Konva.Circle({
      radius: ANCHOR_RADIUS + 4, fill: 'transparent',
      stroke: 'rgba(19, 127, 236, 0.2)', strokeWidth: 4
    }))
    group.add(new Konva.Circle({
      radius: ANCHOR_RADIUS, fill: REGION_META.overlayAnchor.fill,
      stroke: '#ffffff', strokeWidth: 2
    }))
    group.add(new Konva.Text({
      text: '⚓', fontSize: 14, fill: '#ffffff',
      x: -7, y: -7, width: 14, height: 14,
      align: 'center', verticalAlign: 'middle', listening: false
    }))

    group.on('dragend', () => this.syncFromShapes())
    group.on('click tap', () => this.events.onRegionSelect('overlayAnchor'))

    this.layer.add(group)
    this.shapes.overlayAnchor = group
  }

  private syncFromShapes(): void {
    const next = { ...this.config, regions: { ...this.config.regions } }

    for (const key of RECT_KEYS) {
      const s = this.shapes[key] as Konva.Rect | undefined
      if (!s) continue
      next.regions[key] = {
        x: Math.round(s.x()),
        y: Math.round(s.y()),
        width: Math.round(s.width() * (s.scaleX() || 1)),
        height: Math.round(s.height() * (s.scaleY() || 1))
      }
    }
    const anchor = this.shapes.overlayAnchor as Konva.Group | undefined
    if (anchor) {
      next.regions.overlayAnchor = { x: Math.round(anchor.x()), y: Math.round(anchor.y()) }
    }

    this.config = next
    this.events.onRegionChange(next)
  }

  private setupStageEvents(): void {
    this.stage.on('click tap', (e) => {
      const t = e.target
      if (t === this.stage || t === this.bgNode || t === this.bgImage) {
        this.events.onRegionSelect(null)
      }
    })

    this.stage.on('mousemove', () => {
      const pos = this.stage.getPointerPosition()
      if (pos && this.layer) {
        const sx = this.layer.scaleX()
        const lx = this.layer.x()
        const ly = this.layer.y()
        this.events.onCursorMove(
          Math.round((pos.x - lx) / sx),
          Math.round((pos.y - ly) / sx)
        )
      }
    })
    this.stage.on('mouseleave', () => this.events.onCursorMove(null, null))

    this.stage.on('wheel', (e) => {
      e.evt.preventDefault()
      const sx = this.layer.scaleX()
      const dx = this.layer.x()
      const dy = this.layer.y()
      const pointer = this.stage.getPointerPosition()
      const delta = e.evt.deltaY

      if (e.evt.ctrlKey) {
        const factor = delta > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR
        const ns = Math.min(MAX_LAYER_SCALE, Math.max(MIN_LAYER_SCALE, sx * factor))
        if (pointer) {
          const lx = (pointer.x - dx) / sx
          const ly = (pointer.y - dy) / sx
          this.layer.scaleX(ns)
          this.layer.scaleY(ns)
          this.layer.x(pointer.x - lx * ns)
          this.layer.y(pointer.y - ly * ns)
        } else {
          this.layer.scaleX(ns)
          this.layer.scaleY(ns)
        }
      } else if (e.evt.shiftKey) {
        this.layer.x(dx + (delta > 0 ? -WHEEL_PAN_PX : WHEEL_PAN_PX))
      } else {
        this.layer.y(dy + (delta > 0 ? -WHEEL_PAN_PX : WHEEL_PAN_PX))
      }
      this.layer.batchDraw()
    })
  }

  private fitToContainer(container: HTMLDivElement): void {
    const cw = container.clientWidth - 48
    const ch = container.clientHeight - 48
    const sw = this.config.screenWidth
    const sh = this.config.screenHeight
    const scale = Math.min(cw / sw, ch / sh, 1)

    this.layer.scaleX(scale)
    this.layer.scaleY(scale)
    this.layer.x((cw - sw * scale) / 2 + 24)
    this.layer.y((ch - sh * scale) / 2 + 24)
    this.stage.width(cw + 48)
    this.stage.height(ch + 48)
  }
}
