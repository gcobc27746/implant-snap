import { renderConfigApp } from './App'

async function bootstrap() {
  const root = document.getElementById('app')
  if (!root) {
    return
  }

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
}

bootstrap()
