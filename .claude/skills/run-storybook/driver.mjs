#!/usr/bin/env node
// Driver for the UpSkill Storybook. Drives the running dev server
// (default http://localhost:6006) with headless Chromium via Playwright.
//
// Usage:
//   node driver.mjs list [filter]                  list story ids (optional substring filter)
//   node driver.mjs shot <story-id> [--theme dark] [--out file.png]
//   node driver.mjs errors <story-id> [--theme dark]
//   node driver.mjs route <path> [--theme dark] [--selector "css"] [--out f.png] [--base url] [--viewport WxH]
//
// Story ids are the iframe ids from /index.json, e.g. components-button--default.
// Screenshots default to ./shots/<story-id>[.<theme>].png next to this file.
//
// `route` drives an arbitrary page of a running app dev server (e.g. the
// showcase app), not a Storybook story — for pages with no story entry
// (full routes, not isolated components). Pass --base for a non-Storybook
// server; --selector scopes the screenshot to one element instead of the
// full page.

import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import { dirname, join, isAbsolute } from 'path'
import { mkdirSync } from 'fs'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.STORYBOOK_URL || 'http://localhost:6006'

function parseFlags(args) {
  const flags = {}
  const positional = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--theme') flags.theme = args[++i]
    else if (args[i] === '--brand') flags.brand = args[++i]
    else if (args[i] === '--out') flags.out = args[++i]
    else if (args[i] === '--selector') flags.selector = args[++i]
    else if (args[i] === '--base') flags.base = args[++i]
    else if (args[i] === '--viewport') flags.viewport = args[++i]
    else positional.push(args[i])
  }
  return { flags, positional }
}

async function fetchIndex() {
  const res = await fetch(`${BASE}/index.json`)
  if (!res.ok) throw new Error(`index.json ${res.status} — is Storybook running at ${BASE}?`)
  const json = await res.json()
  return Object.values(json.entries)
}

async function list(filter) {
  const entries = await fetchIndex()
  const rows = entries
    .filter((e) => e.type === 'story')
    .filter((e) => !filter || e.id.includes(filter))
    .map((e) => e.id)
  rows.forEach((id) => console.log(id))
  console.log(`\n${rows.length} stories`)
}

function iframeUrl(id, theme, brand) {
  const globals = [theme && `theme:${theme}`, brand && `brand:${brand}`].filter(Boolean).join(';')
  const g = globals ? `&globals=${globals}` : ''
  return `${BASE}/iframe.html?viewMode=story&id=${id}${g}`
}

async function withStory(id, { theme, brand }, fn) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(iframeUrl(id, theme, brand), { waitUntil: 'networkidle' })
  await page.waitForSelector('#storybook-root > *', { timeout: 15000 })
  await page.waitForTimeout(300) // let fonts/transitions settle
  try {
    return await fn(page, errors)
  } finally {
    await browser.close()
  }
}

async function shot(id, { theme, brand, out }) {
  const suffix = [theme, brand].filter(Boolean).map((s) => `.${s}`).join('')
  const file = out
    ? (isAbsolute(out) ? out : join(process.cwd(), out))
    : join(HERE, 'shots', `${id}${suffix}.png`)
  mkdirSync(dirname(file), { recursive: true })
  const errors = await withStory(id, { theme, brand }, async (page, errs) => {
    await page.screenshot({ path: file, fullPage: true })
    return errs
  })
  console.log(`saved ${file}`)
  if (errors.length) console.log(`\nconsole errors (${errors.length}):\n` + errors.join('\n'))
}

async function errorsCmd(id, { theme, brand }) {
  const errors = await withStory(id, { theme, brand }, async (_page, errs) => errs)
  if (!errors.length) console.log('no console errors')
  else console.log(`${errors.length} errors:\n` + errors.join('\n'))
}

function parseViewport(spec) {
  if (!spec) return { width: 1440, height: 900 }
  const [width, height] = spec.split('x').map(Number)
  return { width, height }
}

async function route(routePath, { theme, selector, out, base, viewport }) {
  const server = base || 'http://localhost:5183'
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: parseViewport(viewport) })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  try {
    await page.goto(`${server}${routePath}`, { waitUntil: 'networkidle' })
    if (theme) await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
    await page.waitForTimeout(300)
    const target = selector ? page.locator(selector) : page
    const suffix = theme ? `.${theme}` : ''
    const file = out
      ? (isAbsolute(out) ? out : join(process.cwd(), out))
      : join(HERE, 'shots', `${routePath.replace(/[/?#]/g, '_') || 'root'}${suffix}.png`)
    mkdirSync(dirname(file), { recursive: true })
    await target.screenshot({ path: file, fullPage: !selector })
    console.log(`saved ${file}`)
    if (errors.length) console.log(`\nconsole errors (${errors.length}):\n` + errors.join('\n'))
  } finally {
    await browser.close()
  }
}

const [cmd, ...rest] = process.argv.slice(2)
const { flags, positional } = parseFlags(rest)

const run = {
  list: () => list(positional[0]),
  shot: () => shot(positional[0], flags),
  errors: () => errorsCmd(positional[0], flags),
  route: () => route(positional[0], flags),
}[cmd]

if (!run) {
  console.error('commands: list [filter] | shot <story-id> [--theme dark] [--out f.png] | errors <story-id> | route <path> [--theme dark] [--selector css] [--out f.png] [--base url] [--viewport WxH]')
  process.exit(1)
}
run().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
