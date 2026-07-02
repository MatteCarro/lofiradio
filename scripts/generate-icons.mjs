/*
  Genera le icone PNG della PWA (192 e 512 px) rasterizzando
  scripts/icon-source.svg con Chromium headless via playwright-core.

  Uso:  node scripts/generate-icons.mjs
  Env:  CHROMIUM_PATH per indicare un eseguibile Chromium alternativo.
*/
import { readFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(resolve(root, 'scripts/icon-source.svg'), 'utf8')
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

const executablePath =
  process.env.CHROMIUM_PATH ??
  resolve(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '', 'chromium-1194/chrome-linux/chrome')

const browser = await chromium.launch({
  executablePath,
  args: ['--no-sandbox'],
})

mkdirSync(resolve(root, 'public/icons'), { recursive: true })

for (const size of [192, 512]) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  })
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;padding:0}img{display:block}</style>` +
      `<img src="${dataUrl}" width="${size}" height="${size}">`,
  )
  await page.screenshot({
    path: resolve(root, `public/icons/icon-${size}.png`),
    omitBackground: false,
  })
  await page.close()
  console.log(`✓ public/icons/icon-${size}.png`)
}

await browser.close()
