import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const docsSamples = resolve(__dirname, 'docs/範例/單顆')

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  server: {
    port: 5174,
    fs: { allow: [resolve(__dirname), resolve(__dirname, 'docs')] }
  },
  plugins: [
    {
      name: 'serve-samples-from-docs',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const m = req.url?.match(/^\/samples\/([1-5])-1\.png$/)
          if (!m) return next()
          const n = m[1]
          const file = resolve(docsSamples, `範例${n}`, `範例${n}-1.png`)
          try {
            const buf = readFileSync(file)
            res.setHeader('Content-Type', 'image/png')
            res.end(buf)
          } catch {
            next()
          }
        })
      }
    }
  ],
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index.html')
    }
  }
})
