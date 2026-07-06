#!/usr/bin/env node
// Driver for the UpSkill Storybook. Drives the running dev server
// (default http://localhost:6006) with headless Chromium via Playwright.
//
// Usage:
//   node driver.mjs list [filter]                  list story ids (optional substring filter)
//   node driver.mjs shot <story-id> [--theme dark] [--out file.png]
//   node driver.mjs errors <story-id> [--theme dark]
//
// Story ids are the iframe ids from /index.json, e.g. components-button--default.
// Screenshots default to ./shots/<story-id>[.<theme>].png next to this file.

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

const [cmd, ...rest] = process.argv.slice(2)
const { flags, positional } = parseFlags(rest)

const run = {
  list: () => list(positional[0]),
  shot: () => shot(positional[0], flags),
  errors: () => errorsCmd(positional[0], flags),
}[cmd]

if (!run) {
  console.error('commands: list [filter] | shot <story-id> [--theme dark] [--out f.png] | errors <story-id>')
  process.exit(1)
}
run().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
