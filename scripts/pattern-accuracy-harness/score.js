#!/usr/bin/env node
// Deterministic scorer for the pattern-accuracy harness (§5 of the meta-schema
// handoff). Runs a task's pre-registered gates against a scratch dir plus a
// mechanical trap checklist (AST/regex only — no judgment calls). Gate names in
// task JSON map to scratch-dir equivalents of the repo's npm gates: metadata
// validation and a11y coverage are reimplemented here because the npm scripts
// scan packages/components/ only and cannot target a scratch dir.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { spawnSync } from 'child_process'
import Ajv from 'ajv/dist/2020.js'

const require = createRequire(import.meta.url)
const parser = require('@babel/parser')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const BIN = path.join(ROOT, 'node_modules/.bin')

const TEXT_WRAPPERS = new Set(['Text', 'Heading', 'Button', 'TextLink', 'Chip', 'Badge'])
const TEXT_PROP_NAMES = new Set(['title', 'subtitle', 'label', 'description', 'caption'])
const ALLOWED_STYLE_KEYS = new Set(['flex', 'minWidth', 'maxWidth'])
const CANONICAL_CALLBACKS = {
  Select: { forbidden: ['onChange', 'onSelect'], canonical: 'onValueChange' },
  Accordion: { forbidden: ['onChange', 'onToggle'], canonical: 'onOpenChange' },
  AccordionItem: { forbidden: ['onChange', 'onToggle'], canonical: 'onOpenChange' },
  DropdownMenu: { forbidden: ['onChange', 'onValueChange'], canonical: 'onSelect' },
  Checkbox: { forbidden: ['onValueChange', 'onCheckedChange'], canonical: 'onChange (native)' },
}

function listFiles(dir, ext) {
  const out = []
  function recurse(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) recurse(full)
      else if (ext.some((e) => entry.name.endsWith(e))) out.push(full)
    }
  }
  recurse(dir)
  return out
}

function parseTsx(source) {
  return parser.parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
}

function elementName(openingEl) {
  const n = openingEl.name
  if (n?.type === 'JSXIdentifier') return n.name
  if (n?.type === 'JSXMemberExpression') return `${n.object?.name}.${n.property?.name}`
  return null
}

function getAttr(openingEl, name) {
  return openingEl.attributes.find((a) => a.type === 'JSXAttribute' && a.name?.name === name) ?? null
}

function walkJsx(node, ancestors, fn) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return
  const isElement = node.type === 'JSXElement'
  if (node.type) fn(node, ancestors)
  // '@attr' marks attribute position: a text prop passed TO a component
  // (title={x} on CardVertical) is the component's job to render correctly,
  // unlike the same expression in child/render position
  const nextAncestors = isElement ? [...ancestors, elementName(node.openingElement)]
    : node.type === 'JSXAttribute' ? [...ancestors, '@attr']
    : ancestors
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue
    const child = node[key]
    if (Array.isArray(child)) for (const c of child) walkJsx(c, nextAncestors, fn)
    else if (child && typeof child === 'object') walkJsx(child, nextAncestors, fn)
  }
}

function nearestComponent(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (ancestors[i] && /^[A-Z]/.test(ancestors[i])) return ancestors[i]
  }
  return null
}

function trapChecksTsx(rel, source, violations) {
  let ast
  try {
    ast = parseTsx(source)
  } catch (e) {
    violations.push({ trap: 'parse-error', file: rel, detail: e.message })
    return
  }

  walkJsx(ast, [], (node, ancestors) => {
    if (node.type === 'JSXOpeningElement') {
      const name = elementName(node)

      if (name === 'Icon') {
        for (const attr of ['color', 'style']) {
          if (getAttr(node, attr)) {
            violations.push({
              trap: 'icon-color-on-icon',
              file: rel,
              line: node.loc?.start.line,
              detail: `<Icon> has a \`${attr}\` prop — Icon inherits color via currentColor from an ancestor`,
            })
          }
        }
      }

      let effectiveTag = name
      if (name === 'Box') {
        const asAttr = getAttr(node, 'as')
        const v = asAttr?.value
        const asVal =
          v?.type === 'StringLiteral' ? v.value :
          v?.type === 'JSXExpressionContainer' && v.expression?.type === 'StringLiteral' ? v.expression.value :
          null
        if (asVal) effectiveTag = asVal
      }
      if (effectiveTag === 'section' && !getAttr(node, 'aria-labelledby') && !getAttr(node, 'aria-label')) {
        violations.push({
          trap: 'section-without-accessible-name',
          file: rel,
          line: node.loc?.start.line,
          detail: '<section> (or <Box as="section">) lacks aria-labelledby/aria-label',
        })
      }

      const styleAttr = getAttr(node, 'style')
      const styleExpr = styleAttr?.value?.expression
      if (styleExpr?.type === 'ObjectExpression') {
        for (const prop of styleExpr.properties) {
          const key = prop.key?.name ?? prop.key?.value
          if (key && !ALLOWED_STYLE_KEYS.has(key)) {
            violations.push({
              trap: 'off-scale-inline-style',
              file: rel,
              line: prop.loc?.start.line,
              detail: `inline style key \`${key}\` — only flex/minWidth/maxWidth are sanctioned; use token-based props`,
            })
          }
        }
      }

      const drift = name && CANONICAL_CALLBACKS[name]
      if (drift) {
        for (const wrong of drift.forbidden) {
          if (getAttr(node, wrong)) {
            violations.push({
              trap: 'callback-name-drift',
              file: rel,
              line: node.loc?.start.line,
              detail: `<${name} ${wrong}=…> — this system's ${name} uses \`${drift.canonical}\``,
            })
          }
        }
      }
    }

    if (node.type === 'JSXText' && node.value.trim() !== '') {
      const wrapper = nearestComponent(ancestors)
      if (!wrapper || !TEXT_WRAPPERS.has(wrapper)) {
        violations.push({
          trap: 'raw-visible-text',
          file: rel,
          line: node.loc?.start.line,
          detail: `visible text ${JSON.stringify(node.value.trim().slice(0, 40))} not wrapped in <Text>/<Heading> (nearest component: ${wrapper ?? 'none'})`,
        })
      }
    }

    if (node.type === 'JSXExpressionContainer' && ancestors.length > 0) {
      const expr = node.expression
      const propName =
        expr?.type === 'Identifier' ? expr.name :
        expr?.type === 'MemberExpression' && expr.property?.type === 'Identifier' ? expr.property.name :
        null
      if (propName && TEXT_PROP_NAMES.has(propName) && ancestors[ancestors.length - 1] !== '@attr') {
        const wrapper = nearestComponent(ancestors)
        if (wrapper !== 'Text' && wrapper !== 'Heading') {
          violations.push({
            trap: 'raw-text-prop-render',
            file: rel,
            line: node.loc?.start.line,
            detail: `text prop \`${propName}\` rendered outside <Text>/<Heading> (nearest component: ${wrapper ?? 'none'})`,
          })
        }
      }
    }
  })

  for (const [i, line] of source.split('\n').entries()) {
    if (/\d+px\b/.test(line) && !/minWidth|maxWidth|flex/.test(line)) {
      violations.push({ trap: 'px-literal', file: rel, line: i + 1, detail: line.trim().slice(0, 80) })
    }
    if (/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/.test(line)) {
      violations.push({ trap: 'raw-hex-color', file: rel, line: i + 1, detail: line.trim().slice(0, 80) })
    }
  }
}

function trapChecksCss(rel, source, violations) {
  for (const [i, line] of source.split('\n').entries()) {
    if (/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/.test(line)) {
      violations.push({ trap: 'raw-hex-color', file: rel, line: i + 1, detail: line.trim().slice(0, 80) })
    }
    const pxMatches = line.match(/\b\d*\.?\d+px\b/g) ?? []
    for (const m of pxMatches) {
      if (m !== '1px') {
        violations.push({ trap: 'px-literal', file: rel, line: i + 1, detail: line.trim().slice(0, 80) })
      }
    }
  }
}

function runPatternChecks(scratchDir, task, violations) {
  for (const spec of task.requiredPatterns ?? []) {
    const file = path.join(scratchDir, spec.file)
    const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
    if (!new RegExp(spec.pattern).test(content)) {
      violations.push({ trap: 'missing-required-pattern', file: spec.file, detail: `/${spec.pattern}/ not found — ${spec.reason}` })
    }
  }
  for (const spec of task.forbiddenPatterns ?? []) {
    const file = path.join(scratchDir, spec.file)
    if (!fs.existsSync(file)) continue
    const match = fs.readFileSync(file, 'utf8').match(new RegExp(spec.pattern))
    if (match) {
      violations.push({ trap: 'forbidden-pattern', file: spec.file, detail: `/${spec.pattern}/ matched "${match[0]}" — ${spec.reason}` })
    }
  }
}

function gateTypecheck(scratchDir) {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
      noEmit: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      baseUrl: ROOT,
      paths: { '@upskill/components': ['packages/components/src/index.ts'] },
    },
    include: ['**/*.ts', '**/*.tsx', path.join(ROOT, 'packages/components/src/*.d.ts')],
    exclude: ['node_modules'],
  }
  const tsconfigPath = path.join(scratchDir, 'tsconfig.json')
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2))
  const result = spawnSync(path.join(BIN, 'tsc'), ['-p', tsconfigPath], { cwd: scratchDir, encoding: 'utf8' })
  const errors = (result.stdout + result.stderr).split('\n').filter((l) => /error TS\d+/.test(l))
  return { violations: errors.length, detail: errors.slice(0, 20) }
}

function gateLint(scratchDir) {
  const result = spawnSync(
    path.join(BIN, 'eslint'),
    ['--no-config-lookup', '--config', path.join(__dirname, 'eslint.harness.config.js'), '--format', 'json', scratchDir],
    { cwd: ROOT, encoding: 'utf8' },
  )
  const report = JSON.parse(result.stdout)
  const detail = []
  let count = 0
  for (const file of report) {
    for (const msg of file.messages) {
      if (msg.severity === 2) {
        count++
        detail.push(`${path.relative(scratchDir, file.filePath)}:${msg.line} ${msg.ruleId ?? 'fatal'} ${msg.message}`)
      }
    }
  }
  return { violations: count, detail: detail.slice(0, 20) }
}

function gateLayoutValidate(scratchDir) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/validate-layout.js'), scratchDir], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  const detail = (result.stdout + result.stderr).split('\n').filter((l) => /^ {4}\S/.test(l)).map((l) => l.trim())
  return { violations: detail.length, detail }
}

function mergeTokens(target, source) {
  for (const key of Object.keys(source)) {
    const value = source[key]
    if (value && typeof value === 'object' && !Array.isArray(value) && !('$value' in value)) {
      target[key] ??= {}
      mergeTokens(target[key], value)
    } else {
      target[key] = value
    }
  }
  return target
}

function gateMetadataValidate(scratchDir) {
  const metadataFiles = listFiles(scratchDir, ['.metadata.json'])
  if (metadataFiles.length === 0) return { violations: 1, detail: ['no *.metadata.json emitted'] }

  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/components/component.schema.json'), 'utf8'))
  const validate = new Ajv({ allErrors: true }).compile(schema)

  const tokenTree = ['primitives.json', 'theme/light.json', 'theme/dark.json', 'device/desktop.json', 'device/tablet.json', 'device/mobile.json']
    .reduce((tree, rel) => mergeTokens(tree, JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/tokens/src', rel), 'utf8'))), {})
  function tokenExists(dotPath) {
    let node = tokenTree
    for (const segment of dotPath.split('.')) {
      if (node && typeof node === 'object' && segment in node) node = node[segment]
      else return false
    }
    return node != null && typeof node === 'object' && '$value' in node
  }

  const detail = []
  for (const file of metadataFiles) {
    const rel = path.relative(scratchDir, file)
    let data
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (e) {
      detail.push(`${rel}: invalid JSON — ${e.message}`)
      continue
    }
    if (!validate(data)) {
      for (const e of validate.errors) detail.push(`${rel}: ${e.instancePath || '/'} ${e.message}`)
    }
    for (const [category, refs] of Object.entries(data.tokens ?? {})) {
      for (const ref of Array.isArray(refs) ? refs : [refs]) {
        if (typeof ref === 'string' && !tokenExists(ref)) {
          detail.push(`${rel}: tokens.${category} references unknown token "${ref}"`)
        }
      }
    }
  }
  return { violations: detail.length, detail: detail.slice(0, 20) }
}

function gateA11yCoverage(scratchDir) {
  const detail = []
  for (const file of listFiles(scratchDir, ['.metadata.json'])) {
    let data
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {
      continue
    }
    const type = data.component?.type
    if (type === 'interactive' || type === 'input') {
      const dir = path.dirname(file)
      const hasTest = fs.readdirSync(dir).some((f) => f.endsWith('.a11y.test.tsx'))
      if (!hasTest) detail.push(`${data.component?.name}: interactive per metadata but no co-located *.a11y.test.tsx`)
    }
  }
  return { violations: detail.length, detail }
}

const GATE_RUNNERS = {
  typecheck: gateTypecheck,
  lint: gateLint,
  'layout:validate': gateLayoutValidate,
  'metadata:validate': gateMetadataValidate,
  'a11y:coverage': gateA11yCoverage,
}

export function scoreScratch(scratchDir, task) {
  const trapViolations = []
  for (const expected of task.outputHint) {
    if (!fs.existsSync(path.join(scratchDir, expected))) {
      trapViolations.push({ trap: 'missing-output-file', file: expected, detail: 'expected file was not emitted' })
    }
  }
  for (const file of listFiles(scratchDir, ['.tsx', '.ts'])) {
    if (/\.test\.tsx?$/.test(file)) continue
    trapChecksTsx(path.relative(scratchDir, file), fs.readFileSync(file, 'utf8'), trapViolations)
  }
  for (const file of listFiles(scratchDir, ['.css'])) {
    trapChecksCss(path.relative(scratchDir, file), fs.readFileSync(file, 'utf8'), trapViolations)
  }
  runPatternChecks(scratchDir, task, trapViolations)

  const gates = {}
  for (const gate of task.gates) {
    gates[gate] = GATE_RUNNERS[gate](scratchDir)
  }

  const trapCounts = {}
  for (const v of trapViolations) trapCounts[v.trap] = (trapCounts[v.trap] ?? 0) + 1

  const gateTotal = Object.values(gates).reduce((sum, g) => sum + g.violations, 0)
  const score = {
    task: task.id,
    kind: task.kind,
    gates,
    gateViolations: gateTotal,
    trapViolations: trapViolations.length,
    trapCounts,
    traps: trapViolations,
    total: gateTotal + trapViolations.length,
  }
  fs.writeFileSync(path.join(scratchDir, 'score.json'), JSON.stringify(score, null, 2) + '\n')
  return score
}

export function loadTask(taskId) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'tasks', `${taskId}.json`), 'utf8'))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [scratchDir, taskId] = process.argv.slice(2)
  if (!scratchDir || !taskId) {
    console.error('Usage: npm run harness:score <scratch-dir> <task-id>')
    process.exit(1)
  }
  const score = scoreScratch(path.resolve(scratchDir), loadTask(taskId))
  console.log(JSON.stringify(score, null, 2))
  process.exit(score.total > 0 ? 1 : 0)
}
