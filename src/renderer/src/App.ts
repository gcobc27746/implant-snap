import type { AppConfig } from '../../main/config/schema'

export type RoiKey = 'cropMain' | 'ocrTooth' | 'ocrExtra' | 'overlayAnchor'

export const ROI_META: Record<RoiKey, { label: string; color: string }> = {
  cropMain: { label: '主裁切區 (cropMain)', color: '#137fec' },
  ocrTooth: { label: '牙號 OCR (ocrTooth)', color: '#16a34a' },
  ocrExtra: { label: '補充 OCR (ocrExtra)', color: '#f59e0b' },
  overlayAnchor: { label: 'Overlay 錨點 (overlayAnchor)', color: '#e11d48' }
}

export function renderConfigWorkbench(config: AppConfig): string {
  return `
    <main class="layout-root">
      <aside class="left-nav card">
        <h1>ImplantSnap</h1>
        <p>Step 03 設定模式工作台</p>
        <ul id="roiList" class="roi-list"></ul>
      </aside>

      <section class="canvas-panel card">
        <div class="panel-header">
          <h2>Config Canvas</h2>
          <span>screen: ${config.screenWidth} × ${config.screenHeight}</span>
        </div>
        <div id="canvasViewport" class="canvas-viewport">
          <div id="roiLayer" class="roi-layer"></div>
        </div>
      </section>

      <aside class="right-panel card">
        <h2 id="editorTitle">區域屬性</h2>
        <div class="field-grid">
          <label>X <input id="fieldX" type="number" min="1" /></label>
          <label>Y <input id="fieldY" type="number" min="1" /></label>
          <label id="fieldWidthWrap">Width <input id="fieldWidth" type="number" min="1" /></label>
          <label id="fieldHeightWrap">Height <input id="fieldHeight" type="number" min="1" /></label>
        </div>
        <p id="validation" class="validation"></p>

        <div class="button-row">
          <button id="saveBtn" class="btn-primary">儲存設定</button>
          <button id="resetRegionBtn" class="btn-secondary">重置目前區域</button>
          <button id="resetAllBtn" class="btn-secondary">重置全部設定</button>
        </div>
      </aside>
    </main>

    <footer class="status-bar">
      <span id="statusText">設定檔已載入。</span>
    </footer>
  `
}
