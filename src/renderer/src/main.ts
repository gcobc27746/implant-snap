// Web 模式：無 Electron 時掛上 mock API
if (typeof window !== 'undefined' && typeof (window as unknown as { implantSnap?: unknown }).implantSnap === 'undefined') {
  const { createWebConfigApi } = await import('./web-api')
  ;(window as unknown as { implantSnap: unknown }).implantSnap = createWebConfigApi()
}

import { mountConfigPage } from './config-page/ConfigPage'

async function bootstrap() {
  const root = document.getElementById('app')
  if (!root) return
  root.innerHTML = ''
  await mountConfigPage(root)
}

bootstrap()
