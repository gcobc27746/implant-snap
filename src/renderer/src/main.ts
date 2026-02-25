import { renderConfigApp } from './App'

async function bootstrap() {
  const root = document.getElementById('app')
  if (!root) {
    return
  }

  // Check if implantSnap API is available
  if (!window.implantSnap) {
    root.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>Error: ImplantSnap API not available</h1>
        <p>The preload script did not load correctly.</p>
        <p>window.implantSnap is: ${typeof window.implantSnap}</p>
      </div>
    `
    return
  }

  try {
    const config = await window.implantSnap.config.load()
    root.innerHTML = renderConfigApp(config)

    const status = document.getElementById('status')
    const resetButton = document.getElementById('resetBtn')

    resetButton?.addEventListener('click', async () => {
      await window.implantSnap.config.reset()
      const updated = await window.implantSnap.config.load()
      root.innerHTML = renderConfigApp(updated)
      const nextStatus = document.getElementById('status')
      if (nextStatus) {
        nextStatus.textContent = '已重設設定檔。'
      }
    })

    if (status) {
      status.textContent = '設定檔已載入。'
    }
  } catch (error) {
    root.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>Error loading config</h1>
        <pre>${error}</pre>
      </div>
    `
  }
}

bootstrap()
