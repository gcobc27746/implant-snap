import './main.css'
import { mountConfigPage } from './config-page/ConfigPage'

async function bootstrap() {
  const root = document.getElementById('app')
  if (!root) return
  root.innerHTML = ''
  await mountConfigPage(root)
}

bootstrap()
