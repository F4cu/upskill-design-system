#!/usr/bin/env node
// Validates generated layout files against the landmark grammar (ADR-011).
// Checks: one <main> per route, named <section> landmarks, labelled <nav>
// elements when duplicated, fixed-set component names only (plus declared
// <Parent.Part> subcomponents and their composition rules, ADR-023), no raw container
// divs, Button emphasis by context (ADR-024), and the inline-style
// reconciliation rule (CLAUDE.md "Layout grammar").
// Exits non-zero on any violation so it can gate the layout-generation skill.
// Accepts a file path or a directory (scans *.tsx recursively).
//
// --style-only restricts to the inline-style check alone (skips the
// landmark/main/section/nav checks, which assume a full route page) — used to
// gate component .stories.tsx files, which share the same inline-style ban
// (CLAUDE.md "Component scope" / .claude/rules/components.md) but aren't pages.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { publicComponents } from './lib.js'

const require = createRequire(import.meta.url)
const parser = require('@babel/parser')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Shrinking ledger for pre-existing violations, same convention as
// a11y-backlog.json / token-contrast-waivers.json — never add a new file to
// this list, only remove entries as they're backfilled (issue #95).
const WAIVERS_PATH = path.join(__dirname, 'inline-style-waivers.json')
const WAIVED_FILES = new Set(
  fs.existsSync(WAIVERS_PATH)
    ? JSON.parse(fs.readFileSync(WAIVERS_PATH, 'utf8')).map(w => w.file)
    : []
)

// The package's public components (shared with validate-metadata.js, issue #98)
// plus React built-ins used as wrappers, which aren't user components
const FIXED_SET = new Set([...publicComponents(), 'Fragment', 'StrictMode', 'Suspense'])

// Subcomponents (ADR-023): Parent → Map(partName → part), from each fixed-set
// component's metadata composition.parts. <Parent.Part> is valid only when the
// part is declared here.
const COMPONENTS_DIR = path.join(ROOT, 'packages/components/src/components')
const PARTS = new Map()
for (const name of FIXED_SET) {
  const file = path.join(COMPONENTS_DIR, name, `${name}.metadata.json`)
  if (!fs.existsSync(file)) continue
  const parts = JSON.parse(fs.readFileSync(file, 'utf8')).composition?.parts
  if (parts) PARTS.set(name, new Map(parts.map(p => [p.name, p])))
}

// App-internal composition primitives (ADR-009 question 3: single parent,
// no other consumer in the fixed set → not a DS component, so they don't
// belong in FIXED_SET, but they're sanctioned app code, not a grammar
// violation). See .claude/handoff/archive/pipeline-dashboard.handoff.md (T4's DAG
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

// CSS properties with a direct token-backed Box/Text/Stack prop equivalent.
// Anything in this set hand-written into a style={{ … }} object duplicates a
// prop's own resolution and drifts from it — the exact mistake fixed in
// 663ff79 (raw background/borderRadius/borderTop style objects across four
// files). Dynamic layout math legitimately needed for things like the
// carousel track transform (transform, transition, display, gap, width) is
// deliberately not in this list — see the "Card carousel" pattern in
// layout-generation.md.
const BLOCKED_STYLE_PROPS = new Map([
  ['background', 'Box background="…"'],
  ['backgroundColor', 'Box background="…"'],
  ['color', '<Text color="…"> / <Heading color="…">'],
  ['border', 'Box borderTop="…" (or a CSS Module class for other sides)'],
  ['borderTop', 'Box borderTop="…"'],
  ['borderBottom', 'a CSS Module class'],
  ['borderLeft', 'a CSS Module class'],
  ['borderRight', 'a CSS Module class'],
  ['borderRadius', 'a CSS Module class (or Box background="elevated")'],
  ['flex', 'Box/Stack grow="…"'],
  ['minWidth', 'Box/Stack minWidth="…"'],
  ['maxWidth', 'Box/Stack maxWidth="…"'],
  ['minHeight', 'Box/Stack minHeight="…"'],
  ['maxHeight', 'Box/Stack maxHeight="…"'],
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

function jsxName(nameNode) {
  if (nameNode?.type === 'JSXIdentifier') return nameNode.name
  if (nameNode?.type === 'JSXMemberExpression') {
    return `${jsxName(nameNode.object)}.${nameNode.property.name}`
  }
  return null
}

// 'CardVertical.Body' → { parent: 'CardVertical', name: 'Body', part } when
// declared; null for anything that isn't a declared part.
function resolvePart(name) {
  const segments = name?.split('.') ?? []
  if (segments.length !== 2) return null
  const part = PARTS.get(segments[0])?.get(segments[1])
  return part ? { parent: segments[0], name: segments[1], part } : null
}

// Direct children of a JSX element, fragments flattened. Whitespace text and
// empty {/* comments */} are dropped; any other expression is 'dynamic' —
// statically uncountable, so slot/required checks skip elements that have one.
function directChildren(el) {
  const out = []
  for (const child of el.children) {
    if (child.type === 'JSXText') {
      if (child.value.trim()) {
        const leadingNewlines = child.value.slice(0, child.value.search(/\S/)).split('\n').length - 1
        out.push({ kind: 'text', line: child.loc?.start.line + leadingNewlines })
      }
    } else if (child.type === 'JSXFragment') {
      out.push(...directChildren(child))
    } else if (child.type === 'JSXElement') {
      out.push({ kind: 'element', name: jsxName(child.openingElement.name), line: child.loc?.start.line })
    } else if (child.type === 'JSXExpressionContainer') {
      if (child.expression.type !== 'JSXEmptyExpression') out.push({ kind: 'dynamic' })
    } else {
      out.push({ kind: 'dynamic' })
    }
  }
  return out
}

// Part composition rules (ADR-023): containedBy against the nearest JSX
// parent, accepts and the slot one-child rule against direct children, and
// required parts inside their container. An element passed through a prop
// (e.g. action={<CardVertical.Favorite />}) has no JSX parent and is not
// checked for containedBy — the receiving component places it.
function checkParts(ast, errors) {
  function visit(node, jsxParent) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const n of node) visit(n, jsxParent)
      return
    }
    if (node.type === 'JSXElement') {
      const name = jsxName(node.openingElement.name)
      const resolved = resolvePart(name)
      if (resolved) checkPartElement(node, name, resolved, jsxParent, errors)
      visit(node.openingElement, null)
      visit(node.children, name)
      return
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue
      const child = node[key]
      if (child && typeof child === 'object') visit(child, jsxParent)
    }
  }
  visit(ast, null)
}

function checkPartElement(node, name, { parent, part }, jsxParent, errors) {
  const line = node.loc?.start.line
  const siblings = PARTS.get(parent)

  if (part.containedBy && jsxParent) {
    const allowed = part.containedBy.map(p => `${parent}.${p}`)
    if (!allowed.includes(jsxParent)) {
      errors.push(`Line ${line}: <${name}> must be a direct child of ${allowed.map(a => `<${a}>`).join(' or ')}, not <${jsxParent}>`)
    }
  }

  if (part.kind === 'fixed') return
  const children = directChildren(node)
  if (hasAttr(node.openingElement, 'children')) children.push({ kind: 'dynamic' })
  const hasDynamic = children.some(c => c.kind === 'dynamic')

  if (part.kind === 'slot' && !hasDynamic && children.length !== 1) {
    errors.push(`Line ${line}: <${name}> is a slot and takes exactly one child, found ${children.length}`)
  }

  for (const child of children) {
    if (child.kind === 'text') {
      errors.push(`Line ${child.line}: <${name}> does not accept raw text — wrap it in one of: ${part.accepts.join(', ')}`)
    }
    if (child.kind !== 'element') continue
    const childPart = resolvePart(child.name)
    const key = childPart?.parent === parent ? childPart.name : child.name
    if (!part.accepts.includes(key)) {
      errors.push(`Line ${child.line}: <${child.name}> is not accepted by <${name}> (accepts: ${part.accepts.join(', ')})`)
    }
  }

  if (hasDynamic) return
  const present = new Set(children.map(c => c.name))
  for (const [sibling, def] of siblings) {
    if (def.required && def.containedBy?.includes(part.name) && !present.has(`${parent}.${sibling}`)) {
      errors.push(`Line ${line}: <${name}> is missing its required <${parent}.${sibling}>`)
    }
  }
}

// Button emphasis by context (ADR-024): variant names an absolute weight, so
// rank has to come from the container. accent is the one action a decision
// region exists for — never inside a repeated item (CardVertical/CardHorizontal or a .map()
// callback, where N items would render N primaries), and at most one per
// <section>. Only literal variant="accent" is checked; a computed variant
// can't be judged statically.
function checkButtonEmphasis(ast, errors) {
  const accentsBySection = new Map()
  function visit(node, ctx) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const n of node) visit(n, ctx)
      return
    }
    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'MemberExpression' &&
      node.callee.property?.name === 'map'
    ) {
      visit(node.callee, ctx)
      visit(node.arguments, { ...ctx, repeated: 'a .map() callback' })
      return
    }
    if (node.type === 'JSXElement') {
      const opening = node.openingElement
      const name = jsxName(opening.name)
      const line = opening.loc?.start.line
      let next = ctx
      if (name && /^Card(Vertical|Horizontal)(\.|$)/.test(name)) {
        next = { ...next, repeated: `<${name.split('.')[0]}>` }
      }
      if (name === 'section' || (name === 'Box' && getAttrStringValue(getAttr(opening, 'as')) === 'section')) {
        next = { ...next, section: line }
      }
      if (name === 'Button' && getAttrStringValue(getAttr(opening, 'variant')) === 'accent') {
        if (ctx.repeated) {
          errors.push(`Line ${line}: <Button variant="accent"> inside ${ctx.repeated} — repeated items use neutral/transparent; accent is reserved for the region's one decision (ADR-024)`)
        }
        const lines = accentsBySection.get(ctx.section) ?? []
        lines.push(line)
        accentsBySection.set(ctx.section, lines)
      }
      visit(opening, next)
      visit(node.children, next)
      return
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue
      const child = node[key]
      if (child && typeof child === 'object') visit(child, ctx)
    }
  }
  visit(ast, { repeated: null, section: null })
  for (const [section, lines] of accentsBySection) {
    if (section !== null && lines.length > 1) {
      errors.push(`Lines ${lines.join(', ')}: ${lines.length} <Button variant="accent"> in the <section> at line ${section} — at most one per decision region (ADR-024)`)
    }
  }
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

// Flags style={{ … }} attributes containing a BLOCKED_STYLE_PROPS key. Only
// literal (string/numeric) property values are checked — a computed value
// (identifier, template literal, expression) is left alone since those are
// usually genuine runtime layout math, not a copy-pasted token.
function checkInlineStyles(node, errors) {
  const styleAttr = getAttr(node, 'style')
  if (!styleAttr) return
  const expr = styleAttr.value?.type === 'JSXExpressionContainer'
    ? styleAttr.value.expression
    : null
  if (!expr || expr.type !== 'ObjectExpression') return

  for (const prop of expr.properties) {
    if (prop.type !== 'ObjectProperty') continue
    const keyName = prop.key?.type === 'Identifier' ? prop.key.name
      : prop.key?.type === 'StringLiteral' ? prop.key.value
      : null
    if (!keyName || !BLOCKED_STYLE_PROPS.has(keyName)) continue
    const valueType = prop.value?.type
    if (valueType !== 'StringLiteral' && valueType !== 'NumericLiteral') continue

    errors.push(
      `Line ${node.loc?.start.line}: inline style property "${keyName}" duplicates a token-backed prop — use ${BLOCKED_STYLE_PROPS.get(keyName)} instead`
    )
  }
}

function validateFile(filePath, { styleOnly = false } = {}) {
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
  const inlineStyleWaived = WAIVED_FILES.has(rel)

  walkNode(ast, node => {
    if (node.type !== 'JSXOpeningElement') return

    if (!inlineStyleWaived) checkInlineStyles(node, errors)
    if (styleOnly) return

    const rawName = jsxName(node.name)
    if (!rawName) return

    // Determine effective landmark tag (Box as="…" → effective tag)
    let effectiveTag = rawName
    if (rawName === 'Box') {
      const asAttr = getAttr(node, 'as')
      const asVal = getAttrStringValue(asAttr)
      if (asVal) effectiveTag = asVal
    }

    // ── Fixed-set check ─────────────────────────────────────────────────────
    // Only check uppercase components (lowercase = HTML intrinsic, allowed).
    // A dotted name must be a part declared in its parent's metadata (ADR-023).
    if (rawName.includes('.')) {
      if (/^[A-Z]/.test(rawName) && !resolvePart(rawName)) {
        const [parent] = rawName.split('.')
        errors.push(
          FIXED_SET.has(parent)
            ? `Line ${node.loc?.start.line}: <${rawName}> is not a declared part of ${parent} (metadata composition.parts, ADR-023)`
            : `Line ${node.loc?.start.line}: <${rawName}> — ${parent} is not a component exported by @upskill/components`
        )
      }
    } else if (/^[A-Z]/.test(rawName) && !FIXED_SET.has(rawName) && !APP_INTERNAL_ELEMENTS.has(rawName)) {
      errors.push(
        `Line ${node.loc?.start.line}: <${rawName}> is not a component exported by @upskill/components`
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

  if (!styleOnly) {
    checkParts(ast, errors)
    checkButtonEmphasis(ast, errors)

    // ── Main landmark rule ───────────────────────────────────────────────────
    if (mainCount === 0) {
      errors.push('No <main> landmark found — page root must be <Box as="main">')
    } else if (mainCount > 1) {
      errors.push(`${mainCount} <main> landmarks found — exactly one per route`)
    }

    // ── Duplicate nav label rule ─────────────────────────────────────────────
    if (navNodes.length > 1) {
      for (const nav of navNodes) {
        if (!nav.hasLabel) {
          errors.push(
            `Line ${nav.line}: <nav> (or <Box as="nav">) is missing aria-label — required when multiple <nav> elements exist`
          )
        }
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

const cliArgs = process.argv.slice(2)
const styleOnly = cliArgs.includes('--style-only')
const target = cliArgs.find(a => !a.startsWith('--'))
if (!target) {
  console.error('Usage: npm run layout:validate <file-or-directory> [--style-only]')
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
  const errors = validateFile(file, { styleOnly })
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
