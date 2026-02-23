import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  server: {
    host: '0.0.0.0',
    port: 4173
  }
})
