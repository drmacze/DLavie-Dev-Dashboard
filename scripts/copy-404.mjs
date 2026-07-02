// Copy index.html -> 404.html so GitHub Pages serves the SPA shell
// on any deep-linked path (enables client-side routing on refresh).
import { copyFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../dist')
const indexHtml = resolve(distDir, 'index.html')
const notFoundHtml = resolve(distDir, '404.html')

if (!existsSync(indexHtml)) {
  console.error('[copy-404] dist/index.html not found — did `vite build` run?')
  process.exit(1)
}

copyFileSync(indexHtml, notFoundHtml)
console.log('[copy-404] Created dist/404.html for SPA deep-link support.')
