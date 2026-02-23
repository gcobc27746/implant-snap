import type { AppConfig } from '../../main/config/schema'

export function renderConfigApp(config: AppConfig): string {
  const { screenWidth, screenHeight, previewEnabled, requiresRegionRedefinition, regions } = config

  return `
    <main style="font-family: Inter, sans-serif; padding: 20px; max-width: 780px; margin: 0 auto;">
      <h1 style="margin-bottom: 10px;">ImplantSnap Step 01</h1>
      <p style="margin-top: 0; color: #55606d;">目前已完成 ConfigStore + Tray 常駐主流程。</p>

      <section style="padding: 12px; border: 1px solid #d8e0ea; border-radius: 10px; margin-bottom: 12px;">
        <h2 style="margin-top: 0;">螢幕資訊</h2>
        <div>screenWidth: <strong>${screenWidth}</strong></div>
        <div>screenHeight: <strong>${screenHeight}</strong></div>
        <div>previewEnabled: <strong>${previewEnabled}</strong></div>
        <div>requiresRegionRedefinition: <strong>${requiresRegionRedefinition}</strong></div>
      </section>

      <section style="padding: 12px; border: 1px solid #d8e0ea; border-radius: 10px; margin-bottom: 12px;">
        <h2 style="margin-top: 0;">座標設定</h2>
        <pre style="background: #f6f7f8; padding: 12px; border-radius: 8px; overflow-x: auto;">${JSON.stringify(
          regions,
          null,
          2
        )}</pre>
      </section>

      <button id="resetBtn" style="padding: 8px 14px; border: none; border-radius: 8px; background: #137fec; color: white; cursor: pointer;">
        重設為預設值
      </button>
      <p id="status" style="margin-top: 12px; color: #2e3a47;"></p>
    </main>
  `
}
