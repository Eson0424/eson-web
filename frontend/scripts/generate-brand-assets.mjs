/**
 * ESON 品牌静态资产生成器（无第三方依赖）。
 *
 * 生成物（全部落在 frontend/public/）：
 *   - apple-touch-icon.png   180×180，不透明
 *   - favicon.ico            16 / 32 / 48 多尺寸（ICO 内嵌 PNG）
 *   - og-image.png           1200×630 默认社交分享图
 *
 * favicon.svg 是手写的 SVG 源文件（同时被 <link rel="icon"> 引用），
 * 这里把它按位图尺寸渲染成 PNG，再打包成 .ico。
 *
 * 渲染器使用本机已安装的 Chrome / Edge 的 headless 截图能力 —— 不引入
 * sharp / canvas / ImageMagick 等依赖，也不访问任何第三方图片服务。
 *
 * 用法：
 *   node frontend/scripts/generate-brand-assets.mjs
 *   CHROME_PATH=/path/to/chrome node frontend/scripts/generate-brand-assets.mjs
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = resolve(SCRIPT_DIR, '..', 'public')
const FAVICON_SVG = join(PUBLIC_DIR, 'favicon.svg')

/* ── 设计令牌（与 app/assets/css/tokens.css 保持一致）────────────── */
const COLOR = {
  background: '#07080C',
  surface: '#0B0D12',
  surfaceElevated: '#141820',
  textPrimary: '#F2F4F7',
  textSecondary: '#A7ADB8',
  textMuted: '#6E7582',
  accent: '#3D6BFF',
}

const FONT_STACK = "Segoe UI, Inter, 'Noto Sans', system-ui, -apple-system, sans-serif"

/** 方括号标签用的大写字距（DESIGN §6） */
const LABEL_TRACKING = '0.24em'

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

function findBrowser() {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(
    'No Chrome/Edge binary found. Set CHROME_PATH to a Chromium-based browser executable.',
  )
}

/**
 * 用 headless 浏览器把内联 SVG 渲染成精确尺寸的 PNG。
 *
 * 必须包一层 HTML：直接把 .svg 文件交给 Chrome 时，独立 SVG 文档的缩放任凭浏览器
 * 决定（实测只画出了左上角一小块）。这里用 100vw/100vh 的 HTML 画布锁定像素尺寸。
 */
function renderPng(browser, workDir, name, svg, outPath, width, height, { opaque = true } = {}) {
  const htmlPath = join(workDir, `${name}.html`)

  writeFileSync(
    htmlPath,
    `<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden;background:${opaque ? COLOR.background : 'transparent'}}
svg{display:block;width:${width}px;height:${height}px}
</style></head><body>${svg}</body></html>
`,
  )

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    // 关闭 ClearType 子像素抗锯齿：否则深色底上的文字会出现彩色边缘
    '--disable-lcd-text',
    '--disable-font-subpixel-positioning',
    '--force-device-scale-factor=1',
    // Chrome profile 只写临时目录，不落进仓库
    '--user-data-dir=' + join(workDir, 'profile'),
    `--window-size=${width},${height}`,
    `--screenshot=${outPath.replace(/\\/g, '/')}`,
  ]

  if (!opaque) {
    args.push('--default-background-color=00000000')
  }

  args.push('file:///' + htmlPath.replace(/\\/g, '/'))

  execFileSync(browser, args, { stdio: 'pipe' })

  if (!existsSync(outPath)) {
    throw new Error(`Renderer produced no file for ${outPath}`)
  }
}

/**
 * 图标用 mark：纯矢量 E（不依赖字体），中间一笔用品牌蓝。
 * keepSquare 版本去掉圆角与透明背景，用于 apple-touch-icon。
 */
function markSvg({ size, rounded }) {
  const radius = rounded ? 96 : 0
  const surfaceLayer = rounded
    ? `<rect width="${size}" height="${size}" rx="${radius}" fill="url(#surface)"/>`
    : `<rect width="${size}" height="${size}" fill="${COLOR.background}"/>
  <rect width="${size}" height="${size}" fill="url(#surface)"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" role="img" aria-label="ESON" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="surface" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${COLOR.surfaceElevated}"/>
      <stop offset="1" stop-color="${COLOR.background}"/>
    </linearGradient>
  </defs>
  ${surfaceLayer}
  ${
    rounded
      ? `<rect x="1.5" y="1.5" width="509" height="509" rx="94.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="3"/>`
      : ''
  }
  <g>
    <rect x="128" y="128" width="64" height="256" fill="${COLOR.textPrimary}"/>
    <rect x="128" y="128" width="256" height="64" fill="${COLOR.textPrimary}"/>
    <rect x="128" y="224" width="208" height="64" fill="${COLOR.accent}"/>
    <rect x="128" y="320" width="256" height="64" fill="${COLOR.textPrimary}"/>
  </g>
</svg>
`
}

/** 1200×630 默认社交分享图 */
function ogImageSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" text-rendering="geometricPrecision">
  <defs>
    <radialGradient id="ambient" cx="0.78" cy="0.12" r="0.85">
      <stop offset="0" stop-color="${COLOR.accent}" stop-opacity="0.22"/>
      <stop offset="0.55" stop-color="${COLOR.accent}" stop-opacity="0.05"/>
      <stop offset="1" stop-color="${COLOR.accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${COLOR.surface}"/>
      <stop offset="0.76" stop-color="${COLOR.background}"/>
    </linearGradient>
    <pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse">
      <path d="M96 0H0V96" fill="none" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
    <radialGradient id="gridMask" cx="0.62" cy="0.18" r="0.75">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.76" stop-color="#000000"/>
    </radialGradient>
    <mask id="gridReveal">
      <rect width="1200" height="630" fill="url(#gridMask)"/>
    </mask>
  </defs>

  <rect width="1200" height="630" fill="url(#base)"/>
  <rect width="1200" height="630" fill="url(#grid)" mask="url(#gridReveal)"/>
  <rect width="1200" height="630" fill="url(#ambient)"/>

  <text x="96" y="150" font-family="${FONT_STACK}" font-size="22" letter-spacing="${LABEL_TRACKING}" fill="${COLOR.textSecondary}">[ PORTFOLIO ]</text>

  <text x="92" y="332" font-family="${FONT_STACK}" font-size="172" font-weight="700" letter-spacing="0.01em" fill="${COLOR.textPrimary}">ESON</text>

  <rect x="96" y="376" width="104" height="6" fill="${COLOR.accent}"/>

  <text x="96" y="462" font-family="${FONT_STACK}" font-size="42" font-weight="600" letter-spacing="0.1em" fill="${COLOR.textPrimary}">SOFTWARE ENGINEER &amp; BUILDER</text>

  <text x="96" y="524" font-family="${FONT_STACK}" font-size="26" fill="${COLOR.textMuted}">I build digital products, AI systems and interactive experiences.</text>

  <text x="1104" y="560" text-anchor="end" font-family="${FONT_STACK}" font-size="24" letter-spacing="0.08em" fill="${COLOR.textMuted}">esonji.cn</text>

  <g transform="translate(1040 96)">
    <rect x="0" y="0" width="22" height="88" fill="${COLOR.textPrimary}"/>
    <rect x="0" y="0" width="88" height="22" fill="${COLOR.textPrimary}"/>
    <rect x="0" y="33" width="72" height="22" fill="${COLOR.accent}"/>
    <rect x="0" y="66" width="88" height="22" fill="${COLOR.textPrimary}"/>
  </g>
</svg>
`
}

/** 把若干 PNG 打包成 ICO（ICO 从 Vista 起允许内嵌 PNG 数据） */
function buildIco(images) {
  const HEADER_BYTES = 6
  const ENTRY_BYTES = 16
  const header = Buffer.alloc(HEADER_BYTES)

  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)

  let offset = HEADER_BYTES + ENTRY_BYTES * images.length
  const entries = []

  for (const image of images) {
    const entry = Buffer.alloc(ENTRY_BYTES)

    // 256 及以上在 ICO 中用 0 表示
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0)
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1)
    entry.writeUInt8(0, 2) // 调色板颜色数
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(image.png.length, 8)
    entry.writeUInt32LE(offset, 12)

    entries.push(entry)
    offset += image.png.length
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)])
}

function main() {
  if (!existsSync(FAVICON_SVG)) {
    throw new Error(`Missing source SVG: ${FAVICON_SVG}`)
  }

  const browser = findBrowser()
  const workDir = mkdtempSync(join(tmpdir(), 'eson-brand-'))

  mkdirSync(PUBLIC_DIR, { recursive: true })

  try {
    /* 1) apple-touch-icon.png（180×180，不透明，iOS 自行做圆角遮罩） */
    const appleSource = join(workDir, 'apple-touch.svg')

    writeFileSync(appleSource, markSvg({ size: 180, rounded: false }))
    renderPng(browser, workDir, 'apple-touch', readFileSync(appleSource, 'utf8'), join(PUBLIC_DIR, 'apple-touch-icon.png'), 180, 180)

    /* 2) favicon.ico（16 / 32 / 48，由 favicon.svg 渲染，保留透明圆角） */
    const faviconImages = []

    for (const size of [16, 32, 48]) {
      const pngPath = join(workDir, `favicon-${size}.png`)

      renderPng(browser, workDir, `favicon-${size}`, readFileSync(FAVICON_SVG, 'utf8'), pngPath, size, size, { opaque: false })
      faviconImages.push({ size, png: readFileSync(pngPath) })
    }

    writeFileSync(join(PUBLIC_DIR, 'favicon.ico'), buildIco(faviconImages))

    /* 3) og-image.png（1200×630 默认分享图） */
    const ogSource = join(workDir, 'og-image.svg')

    writeFileSync(ogSource, ogImageSvg())
    renderPng(browser, workDir, 'og-image', readFileSync(ogSource, 'utf8'), join(PUBLIC_DIR, 'og-image.png'), 1200, 630)

    console.log('[brand-assets] generated:')
    for (const file of ['apple-touch-icon.png', 'favicon.ico', 'og-image.png']) {
      console.log(`  public/${file}`)
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}

main()
