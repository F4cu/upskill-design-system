#!/usr/bin/env node
// Validates generated layout files against the landmark grammar (ADR-011).
// Checks: one <main> per route, named <section> landmarks, labelled <nav>
// elements when duplicated, fixed-set component names only, no raw container
// divs. Exits non-zero on any violation so it can gate the layout-generation
// skill. Accepts a file path or a directory (scans *.tsx recursively).

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const parser = require('@babel/parser')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Fixed 26-component set (CLAUDE.md "Component scope") + required sub-components
const FIXED_SET = new Set([
  'Box', 'Stack', 'Inline', 'Text', 'Heading', 'Icon', 'Button',
  'TextField', 'Select', 'Checkbox', 'Card',
  'Avatar', 'AppHeader', 'Breadcrumb', 'Divider', 'ProgressBar', 'CardHorizontal',
  'CardVertical', 'Chip', 'VideoFrame', 'ButtonArrow', 'ScrollArea',
  'Accordion', 'Badge', 'TextLink',
  // Required sub-components exported alongside their parent
  'AccordionItem',      // child API of Accordion
  'DropdownMenu',       // used by AppHeader's user dropdown
  // React built-ins used as wrappers — not user components, so ignored
  'Fragment', 'StrictMode', 'Suspense',
])

// App-internal composition primitives (ADR-009 question 3: single parent,
// no other consumer in the fixed set → not a DS component, so they don't
// belong in FIXED_SET, but they're sanctioned app code, not a grammar
// violation). See .claude/handoff/pipeline-dashboard.handoff.md (T4's DAG
// node renderer) and pipeline-dashboard-chart-spec.md (T5's SplitChart).
const APP_INTERNAL_ELEMENTS = new Set([
  'PipelineDag',  // apps/showcase/src/pipeline/PipelineDag.tsx
  'SplitChart',   // apps/showcase/src/pipeline/SplitChart.tsx
])

// HTML intrinsic elements (lowercase) that are allowed when used directly
// (distinct from the Box as= pattern). These are not checked against FIXED_SET.
const HTML_INTRINSICS = new Set([
  'a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'blockquote',
  'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
  'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl',
  'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html',
  'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li',
  'link', 'main', 'map', 'mark', 'menu', 'meta', 'meter', 'nav', 'noscript',
  'object', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre',
  'progress', 'q', 's', 'samp', 'script', 'section', 'select', 'small',
  'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'table',
  'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time',
  'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr',
])

function getAttr(openingEl, name) {
  return openingEl.attributes.find(
    a => a.type === 'JSXAttribute' && a.name?.name === name
  ) ?? null
}

function getAttrStringValue(attr) {
  if (!attr) return null
  if (attr.value?.type === 'StringLiteral') return attr.value.value
  if (
    attr.value?.type === 'JSXExpressionContainer' &&
    attr.value.expression?.type === 'StringLiteral'
  ) return attr.value.expression.value
  return null
}

function hasAttr(openingEl, name) {
  return getAttr(openingEl, name) !== null
}

function walkNode(node, fn) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return
  if (node.type) fn(node)
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue
    const child = node[key]
    if (Array.isArray(child)) {
      for (const c of child) walkNode(c, fn)
    } else if (child && typeof child === 'object') {
      walkNode(child, fn)
    }
  }
}

function validateFile(filePath) {
  const rel = path.relative(ROOT, filePath)
  let source
  try {
    source = fs.readFileSync(filePath, 'utf8')
  } catch (e) {
    return [`Cannot read file: ${e.message}`]
  }

  let ast
  try {
    ast = parser.parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    })
  } catch (e) {
    return [`Parse error: ${e.message}`]
  }

  const errors = []
  let mainCount = 0
  const navNodes = []

  walkNode(ast, node => {
    if (node.type !== 'JSXOpeningElement') return

    const nameNode = node.name
    if (!nameNode) return

    const rawName =
      nameNode.type === 'JSXIdentifier' ? nameNode.name :
      nameNode.type === 'JSXMemberExpression' ? `${nameNode.object?.name}.${nameNode.property?.name}` :
      null

    if (!rawName) return

    // Determine effective landmark tag (Box as="…" → effective tag)
    let effectiveTag = rawName
    if (rawName === 'Box') {
      const asAttr = getAttr(node, 'as')
      const asVal = getAttrStringValue(asAttr)
      if (asVal) effectiveTag = asVal
    }

    // ── Fixed-set check ─────────────────────────────────────────────────────
    // Only check uppercase components (lowercase = HTML intrinsic, allowed)
    if (/^[A-Z]/.test(rawName) && !FIXED_SET.has(rawName) && !APP_INTERNAL_ELEMENTS.has(rawName)) {
      errors.push(
        `Line ${node.loc?.start.line}: <${rawName}> is not in the fixed 26-component set`
      )
    }

    // ── Main landmark count ──────────────────────────────────────────────────
    if (effectiveTag === 'main') {
      mainCount++
    }

    // ── Section must have accessible name ───────────────────────────────────
    if (effectiveTag === 'section') {
      const hasAriaLabel = hasAttr(node, 'aria-label')
      const hasAriaLabelledBy = hasAttr(node, 'aria-labelledby')
      if (!hasAriaLabel && !hasAriaLabelledBy) {
        errors.push(
          `Line ${node.loc?.start.line}: <Box as="section"> (or <section>) is missing aria-label or aria-labelledby`
        )
      }
    }

    // ── Collect nav nodes for duplicate-nav check ────────────────────────────
    if (effectiveTag === 'nav') {
      navNodes.push({
        line: node.loc?.start.line,
        hasLabel: hasAttr(node, 'aria-label') || hasAttr(node, 'aria-labelledby'),
      })
    }

    // ── No raw <div className="container"> ──────────────────────────────────
    // The grammar requires using <Box className="container"> not a bare div.
    if (rawName === 'div') {
      const classAttr = getAttr(node, 'className')
      const classVal = getAttrStringValue(classAttr)
      if (classVal && classVal.split(/\s+/).includes('container')) {
        errors.push(
          `Line ${node.loc?.start.line}: use <Box className="container"> not <div className="container">`
        )
      }
    }
  })

  // ── Main landmark rule ─────────────────────────────────────────────────────
  if (mainCount === 0) {
    errors.push('No <main> landmark found — page root must be <Box as="main">')
  } else if (mainCount > 1) {
    errors.push(`${mainCount} <main> landmarks found — exactly one per route`)
  }

  // ── Duplicate nav label rule ───────────────────────────────────────────────
  if (navNodes.length > 1) {
    for (const nav of navNodes) {
      if (!nav.hasLabel) {
        errors.push(
          `Line ${nav.line}: <nav> (or <Box as="nav">) is missing aria-label — required when multiple <nav> elements exist`
        )
      }
    }
  }

  return errors
}

function collectTsxFiles(target) {
  const stat = fs.statSync(target)
  if (stat.isFile()) return [target]
  const results = []
  function recurse(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) recurse(full)
      else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) results.push(full)
    }
  }
  recurse(target)
  return results
}

// ── Main ────────────────────────────────────────────────────────────────────

const target = process.argv[2]
if (!target) {
  console.error('Usage: npm run layout:validate <file-or-directory>')
  process.exit(1)
}

const absTarget = path.resolve(target)
if (!fs.existsSync(absTarget)) {
  console.error(`Not found: ${absTarget}`)
  process.exit(1)
}

const files = collectTsxFiles(absTarget)
if (files.length === 0) {
  console.error(`No .tsx/.jsx files found in ${absTarget}`)
  process.exit(1)
}

let totalFailures = 0
for (const file of files) {
  const rel = path.relative(ROOT, file)
  const errors = validateFile(file)
  if (errors.length) {
    console.error(`✗ ${rel}`)
    for (const msg of errors) console.error(`    ${msg}`)
    totalFailures += errors.length
  } else {
    console.log(`✓ ${rel}`)
  }
}

if (totalFailures) {
  console.error(`\n${totalFailures} violation(s) found.`)
  process.exit(1)
}
console.log(`\n✓ ${files.length} file(s) passed layout validation.`)
