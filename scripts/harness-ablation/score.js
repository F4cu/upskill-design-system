#!/usr/bin/env node
// Scores one harness-ablation run inside its workspace, with the workspace's own
// npm gates and the pattern-accuracy traps. Scope and buckets:
// .claude/handoff/archive/2026-10-07-harness-ablation-eval.handoff.md → "Scoring".
//
//   node scripts/harness-ablation/score.js <runDir>           (run.js calls this)
//   node scripts/harness-ablation/score.js --calibrate <task> (Stage 0: the shipped
//     component restored into an Arm 2 workspace must score 0 product violations)
//
// Two buckets, never summed: product quality (the headline: what a consumer of
// the component would notice) and system compliance (what this system also
// demands, which Arm 0 was never shown). Process numbers come from result.json.

import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import ts from 'typescript'
import { trapChecksTsx, trapChecksCss, runPatternChecks, typographyParts } from '../pattern-accuracy-harness/score.js'
import { parseFile, namingDrift } from '../generate-pattern-schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const TASKS_DIR = path.join(__dirname, 'tasks')
const RUNS_DIR = path.join(__dirname, '.runs')
const COMPONENTS_REL = 'packages/components/src/components'

// Native props a spread of the HTML attributes type provides, counted as part of
// a component's vocabulary. Limited to the ones a consumer would reach for.
const NATIVE_VOCABULARY = {
  InputHTMLAttributes: ['checked', 'defaultChecked', 'onChange', 'disabled', 'name'],
}

const SELECTION_ROLE_RE = /role=["'{](combobox|listbox|menu|option)/

function usage(msg) {
  if (msg) console.error(msg)
  console.error('Usage: node scripts/harness-ablation/score.js <runDir> | --calibrate <task>')
  process.exit(1)
}

function loadTask(id) {
  return JSON.parse(fs.readFileSync(path.join(TASKS_DIR, `${id}.json`), 'utf8'))
}

function sh(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { recursive: true }).map((f) => path.join(dir, f)).filter((f) => fs.statSync(f).isFile())
}

const isStory = (f) => f.endsWith('.stories.tsx')
const isTest = (f) => /\.test\.tsx?$/.test(f)

// ---------- product quality ----------

function deliverables(ws, target) {
  const dir = path.join(ws, COMPONENTS_REL, target)
  const expected = ['index.tsx', `${target}.module.css`, `${target}.stories.tsx`]
  return expected
    .filter((f) => !fs.existsSync(path.join(dir, f)))
    .map((f) => ({ trap: 'missing-deliverable', file: `${target}/${f}`, detail: 'the brief asks for this file' }))
}

function typecheck(ws) {
  const res = sh('npm', ['run', '-s', 'typecheck'], ws)
  const errors = (res.stdout + res.stderr).split('\n').filter((l) => /error TS\d+/.test(l))
  return { violations: errors.length, detail: errors.slice(0, 20) }
}

function lint(ws, target) {
  const dir = path.join(COMPONENTS_REL, target)
  if (!fs.existsSync(path.join(ws, dir))) return { violations: 0, detail: [] }
  const res = sh(path.join(ws, 'node_modules/.bin/eslint'), ['--format', 'json', dir], ws)
  const report = JSON.parse(res.stdout || '[]')
  const detail = report.flatMap((file) => file.messages
    .filter((m) => m.severity === 2)
    .map((m) => `${path.relative(fs.realpathSync(ws), file.filePath)}:${m.line} ${m.ruleId ?? 'fatal'} ${m.message}`))
  return { violations: detail.length, detail: detail.slice(0, 20) }
}

// The workspace's own axe sweep over every story. A failure anywhere counts (the
// baseline passes clean, so any failure is the run's); a target story switched
// off with parameters.a11y counts too, since it hides the component from axe.
function a11yStories(ws, target) {
  const pkg = path.join(ws, 'packages/components')
  const out = path.join(os.tmpdir(), `ablation-a11y-${process.pid}-${Date.now()}.json`)
  sh(path.join(ws, 'node_modules/.bin/vitest'), ['run', '--config', 'vitest.stories.config.ts', '--reporter=json', `--outputFile=${out}`], pkg)
  if (!fs.existsSync(out)) return { violations: 1, detail: ['a11y:stories produced no report (sweep crashed)'] }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'))
  fs.rmSync(out)

  const detail = []
  let targetStories = 0
  for (const file of report.testResults) {
    if (file.status === 'failed' && file.assertionResults.length === 0) {
      detail.push(`suite failed: ${file.message?.split('\n')[0] ?? path.basename(file.name)}`)
    }
    for (const t of file.assertionResults) {
      const suite = t.ancestorTitles[0] ?? ''
      const isTarget = suite.startsWith(`components/${target}/`)
      if (isTarget) targetStories++
      if (t.status === 'failed') detail.push(`${suite} › ${t.title}: ${(t.failureMessages[0] ?? '').split('\n').slice(0, 3).join(' ').slice(0, 200)}`)
      if (isTarget && (t.status === 'skipped' || t.status === 'pending')) detail.push(`${suite} › ${t.title}: axe switched off for this story`)
    }
  }
  const storyFile = path.join(ws, COMPONENTS_REL, target, `${target}.stories.tsx`)
  if (fs.existsSync(storyFile) && targetStories === 0) detail.push(`${target}.stories.tsx composes no stories`)
  return { violations: detail.length, detail: detail.slice(0, 20), targetStories }
}

// Traps from the pattern-accuracy harness, on the component's own files. A story
// file's off-scale-inline-style (decided 2026-10-08) and raw-visible-text (decided
// 2026-10-09) hits are system compliance, not the headline: consumers never see
// story scaffolding.
const STORY_SYSTEM_TRAPS = { 'off-scale-inline-style': 'storyInlineStyle', 'raw-visible-text': 'storyVisibleText' }

function traps(ws, target) {
  const componentsDir = path.join(ws, COMPONENTS_REL)
  const dir = path.join(componentsDir, target)
  const product = []
  const story = { storyInlineStyle: [], storyVisibleText: [] }
  const parts = typographyParts(dir)
  for (const file of listFiles(dir)) {
    const rel = path.relative(componentsDir, file)
    if (file.endsWith('.tsx') && !isTest(file)) {
      const found = []
      trapChecksTsx(rel, fs.readFileSync(file, 'utf8'), found, parts)
      for (const v of found) (isStory(file) && STORY_SYSTEM_TRAPS[v.trap] ? story[STORY_SYSTEM_TRAPS[v.trap]] : product).push(v)
    }
    if (file.endsWith('.css')) trapChecksCss(rel, fs.readFileSync(file, 'utf8'), product)
  }
  return { product, story }
}

function definedTokens(ws) {
  const dist = path.join(ws, 'packages/tokens/dist/css')
  const names = new Set()
  for (const file of listFiles(dist).filter((f) => f.endsWith('.css'))) {
    for (const [, name] of fs.readFileSync(file, 'utf8').matchAll(/(--ds-[\w-]+)\s*:/g)) names.add(name)
  }
  return names
}

// Every var(--ds-*) the component reads must exist in the built tokens. A name the
// component defines itself in the same file is local, not hallucinated.
function unknownTokens(ws, target) {
  const defined = definedTokens(ws)
  const out = []
  for (const file of listFiles(path.join(ws, COMPONENTS_REL, target))) {
    if (!/\.(css|tsx?)$/.test(file) || isTest(file)) continue
    const source = fs.readFileSync(file, 'utf8')
    const local = new Set([...source.matchAll(/(--ds-[\w-]+)\s*:/g)].map((m) => m[1]))
    for (const [i, line] of source.split('\n').entries()) {
      for (const [, name] of line.matchAll(/var\(\s*(--ds-[\w-]+)/g)) {
        if (!defined.has(name) && !local.has(name)) {
          out.push({ trap: 'unknown-token', file: path.relative(path.join(ws, COMPONENTS_REL), file), line: i + 1, detail: `${name} is not in the built tokens` })
        }
      }
    }
  }
  return out
}

function baselineComponents(ws) {
  const res = sh('git', ['ls-tree', '--name-only', `HEAD:${COMPONENTS_REL}`], ws)
  return new Set(res.stdout.split('\n').filter(Boolean))
}

function baselineExports(ws) {
  const index = sh('git', ['show', 'HEAD:packages/components/src/index.ts'], ws).stdout
  const names = new Set()
  for (const [, list] of index.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const n of list.split(',')) names.add(n.trim().split(/\s+as\s+/).pop())
  }
  return names
}

// Imports of a library component outside the fixed set: a sibling directory that
// didn't exist at baseline, or a name @upskill/components never exported.
function inventedImports(ws, target) {
  const components = baselineComponents(ws)
  const exported = baselineExports(ws)
  const out = []
  for (const file of listFiles(path.join(ws, COMPONENTS_REL, target))) {
    if (!/\.tsx?$/.test(file)) continue
    const rel = path.relative(path.join(ws, COMPONENTS_REL), file)
    for (const [i, line] of fs.readFileSync(file, 'utf8').split('\n').entries()) {
      const sibling = line.match(/from\s+['"](?:\.\.\/|\.\.\/\.\.\/components\/)([A-Z]\w*)['"]/)
      if (sibling && sibling[1] !== target && !components.has(sibling[1])) {
        out.push({ trap: 'invented-import', file: rel, line: i + 1, detail: `imports ${sibling[1]}, which is not in the fixed set` })
      }
      const pkg = line.match(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]@upskill\/components['"]/)
      for (const name of pkg ? pkg[1].split(',').map((n) => n.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean) : []) {
        if (!exported.has(name) && !name.startsWith(target)) {
          out.push({ trap: 'invented-import', file: rel, line: i + 1, detail: `@upskill/components has no export ${name}` })
        }
      }
    }
  }
  return out
}

// ---------- system compliance ----------

function npmScript(ws, name) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ws, 'package.json'), 'utf8'))
  if (!pkg.scripts[name]) return { ran: false, reason: 'arm has no such script' }
  const res = sh('npm', ['run', '-s', name], ws)
  const tail = (res.stdout + res.stderr).trim().split('\n').slice(-15)
  return { ran: true, passed: res.status === 0, detail: res.status === 0 ? [] : tail }
}

function patternDrift(ws, target) {
  const script = path.join(ws, 'scripts/generate-pattern-schema.js')
  if (!fs.existsSync(script)) return { ran: false, reason: 'arm has no pattern script' }
  const res = sh('node', [script], ws)
  if (res.status !== 0) return { ran: true, passed: false, detail: res.stderr.trim().split('\n').slice(-5) }
  const patterns = JSON.parse(fs.readFileSync(path.join(ws, '.claude/component-patterns.json'), 'utf8'))
  const drift = patterns.drift.filter((d) => d.components.includes(target)).map((d) => `${d.issue}: ${d.detail}`)
  return { ran: true, passed: drift.length === 0, detail: drift }
}

function tokenSourceChanges(ws) {
  const res = sh('git', ['status', '--porcelain', '--', 'packages/tokens/src'], ws)
  return res.stdout.split('\n').filter(Boolean)
}

// ---------- prop vocabulary (ADR-026) ----------

function literalUnion(typeNode, aliases) {
  if (!typeNode) return null
  if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) return literalUnion(aliases.get(typeNode.typeName.text), aliases)
  const members = ts.isUnionTypeNode(typeNode) ? typeNode.types : [typeNode]
  const values = members
    .filter((m) => ts.isLiteralTypeNode(m) && ts.isStringLiteral(m.literal))
    .map((m) => m.literal.text)
  return values.length ? values.sort() : null
}

function omitted(text) {
  return new Set([...text.matchAll(/['"](\w+)['"]/g)].map((m) => m[1]))
}

// The vocabulary a component exposes: the props declared on `<Target>Props` (or
// on every *Props type when that one doesn't exist), plus the native props a spread
// of an HTML attributes type supplies, with any string-literal union values.
function vocabulary(sf, target) {
  const aliases = new Map()
  const propTypes = []
  sf.forEachChild(function visit(node) {
    if (ts.isTypeAliasDeclaration(node)) {
      aliases.set(node.name.text, node.type)
      if (/Props$/.test(node.name.text)) propTypes.push(node)
    }
    if (ts.isInterfaceDeclaration(node) && /Props$/.test(node.name.text)) propTypes.push(node)
    node.forEachChild(visit)
  })
  const own = propTypes.filter((t) => t.name.text === `${target}Props`)
  const chosen = own.length ? own : propTypes

  const props = new Map()
  const explicit = new Set()
  for (const decl of chosen) {
    const members = ts.isInterfaceDeclaration(decl) ? [decl] : ts.isIntersectionTypeNode(decl.type) ? decl.type.types : [decl.type]
    const spreads = ts.isInterfaceDeclaration(decl) ? (decl.heritageClauses ?? []).flatMap((h) => h.types) : members.filter((m) => !ts.isTypeLiteralNode(m))
    const literals = ts.isInterfaceDeclaration(decl) ? decl.members : members.filter(ts.isTypeLiteralNode).flatMap((m) => m.members)
    for (const m of literals) {
      if (ts.isPropertySignature(m) && m.name && ts.isIdentifier(m.name)) {
        props.set(m.name.text, literalUnion(m.type, aliases))
        explicit.add(m.name.text)
      }
    }
    for (const spread of spreads) {
      const text = spread.getText(sf)
      for (const [htmlType, names] of Object.entries(NATIVE_VOCABULARY)) {
        if (!text.includes(htmlType)) continue
        const dropped = /Omit</.test(text) ? omitted(text) : new Set()
        for (const n of names) if (!dropped.has(n) && !props.has(n)) props.set(n, null)
      }
    }
  }
  return { props, explicit }
}

function propVocabulary(ws, task) {
  const target = task.target
  const file = path.join(ws, COMPONENTS_REL, target, 'index.tsx')
  if (!fs.existsSync(file)) return { ran: false, reason: 'no index.tsx' }
  const reference = vocabulary(ts.createSourceFile('ref.tsx', referenceSource(target), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), target).props
  const { props: generated, explicit } = vocabulary(parseFile(file), target)
  const ignore = new Set(task.propVocabulary?.ignore ?? [])
  // A reference prop that is itself recorded drift (ADR-026 migration table) is
  // satisfied by its vocabulary name too, e.g. Badge `label` → `children`.
  const equivalents = task.propVocabulary?.equivalents ?? {}

  // Native props follow the native contract (ADR-025 exception: checked/onChange),
  // so ADR-026's naming check applies only to props the component declares.
  const detail = namingDrift(explicit).map((d) => `naming drift: ${d}`)
  const source = fs.readFileSync(file, 'utf8')
  if (SELECTION_ROLE_RE.test(source)) {
    for (const p of generated.keys()) if (/^selected[A-Z]/.test(p)) detail.push(`selection state named \`${p}\`, ADR-026 says \`value\``)
  }
  for (const [name, values] of reference) {
    if (ignore.has(name)) continue
    if (!generated.has(name) && !(equivalents[name] ?? []).some((n) => generated.has(n))) {
      detail.push(`reference prop \`${name}\` missing or renamed`)
      continue
    }
    const got = generated.get(name)
    for (const v of values ?? []) if (!got?.includes(v)) detail.push(`\`${name}\` lacks the reference value '${v}'`)
  }
  return {
    ran: true,
    passed: detail.length === 0,
    detail,
    reference: Object.fromEntries(reference),
    generated: Object.fromEntries(generated),
  }
}

function referenceSource(target) {
  return sh('git', ['show', `HEAD:${COMPONENTS_REL}/${target}/index.tsx`], ROOT).stdout
}

// ---------- process ----------

function reviewerFindings(runDir, target) {
  const p = path.join(runDir, 'output', `${target}.review.json`)
  if (!fs.existsSync(p)) return null
  const review = JSON.parse(fs.readFileSync(p, 'utf8'))
  const findings = [...(review.codeReview ?? []), ...(review.a11y ?? [])]
  const bySeverity = {}
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1
  return { verdict: review.verdict ?? null, total: findings.length, bySeverity, lintErrors: review.lint?.errors ?? null }
}

// ---------- token tasks ----------

const readJsonFile = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

function tokenAt(json, dotPath) {
  return dotPath.split('.').reduce((node, k) => node?.[k], json)
}

function baselineFile(ws, rel) {
  const res = sh('git', ['show', `HEAD:${rel}`], ws)
  return res.status === 0 ? res.stdout : null
}

// The contrast gate as the baseline commit had it (PAIRS and waivers), run on the
// workspace's built CSS, so editing the script or waiving a pair can't pass it.
function baselineContrast(ws) {
  const dir = path.join(ws, '.ablation-score')
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'packages/tokens'), { recursive: true })
  fs.symlinkSync(path.join(ws, 'packages/tokens/dist'), path.join(dir, 'packages/tokens/dist'))
  fs.writeFileSync(path.join(dir, 'scripts/token-contrast-check.js'), baselineFile(ws, 'scripts/token-contrast-check.js'))
  fs.writeFileSync(path.join(dir, 'scripts/token-contrast-waivers.json'), baselineFile(ws, 'scripts/token-contrast-waivers.json') ?? '[]')
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}\n')
  const res = sh('node', [path.join(dir, 'scripts/token-contrast-check.js')], ws)
  fs.rmSync(dir, { recursive: true, force: true })
  if (res.status === 0) return { violations: 0, detail: [] }
  // Feedback aliases are brand-independent, so a failing pair repeats once per
  // brand with the same line; count it once.
  const failures = [...new Set(res.stderr.split('\n').filter((l) => l.trim().startsWith('✗')).map((l) => l.trim()))]
  if (failures.length) return { violations: failures.length, detail: failures.slice(0, 20) }
  const crash = res.stderr.match(/Error: .*/)?.[0] ?? 'contrast check exited non-zero'
  return { violations: 1, detail: [crash] }
}

function tokensBuild(ws) {
  const res = sh('npm', ['run', '-s', 'tokens:build'], ws)
  if (res.status === 0) return { violations: 0, detail: [] }
  return { violations: 1, detail: (res.stdout + res.stderr).split('\n').filter(Boolean).slice(-10) }
}

// Follows semantic-to-semantic aliases inside the theme file to the primitive
// (or brand slot) the token finally points at.
function resolveAlias(value, theme, seen = new Set()) {
  const m = typeof value === 'string' && value.match(/^\{([^}]+)\}$/)
  if (!m) return null
  const target = tokenAt(theme, m[1])
  if (target?.$value !== undefined && !seen.has(m[1])) return resolveAlias(target.$value, theme, new Set([...seen, m[1]])) ?? m[1]
  return m[1]
}

const BRAND_SLOTS = ['brand', 'accent', 'neutral', 'surface']

// Pre-registered (ADR-029 Step 6 handoff): what a consumer of the tokens would
// notice, plus the rules that hold for the shipped reference.
function tokenTraps(ws, task) {
  const primitives = readJsonFile(path.join(ws, 'packages/tokens/src/primitives.json'))
  const hasDarkRamp = (hue) => primitives.color?.[hue]?.dark !== undefined
  const traps = []
  const hueOf = {}

  for (const rel of task.tokenFiles) {
    const mode = path.basename(rel, '.json')
    const theme = readJsonFile(path.join(ws, rel))
    if (JSON.stringify(theme).includes('"$extensions"')) traps.push({ trap: 'extensions', file: rel, detail: '$extensions is never committed' })
    for (const role of task.roles) {
      for (const tone of task.tones) {
        const name = `color.${role}.feedback.${tone}`
        const token = tokenAt(theme, name)
        if (token?.$value === undefined) {
          traps.push({ trap: 'missing-token', file: rel, detail: name })
          continue
        }
        const resolved = resolveAlias(token.$value, theme)
        if (!resolved) {
          traps.push({ trap: 'raw-value', file: rel, detail: `${name} = ${JSON.stringify(token.$value)}` })
          continue
        }
        const [, hue, ...rest] = resolved.split('.')
        if (BRAND_SLOTS.includes(hue)) traps.push({ trap: 'brand-slot', file: rel, detail: `${name} → {${resolved}}: feedback follows the active brand` })
        const reserved = task.reservedHues?.[tone]
        if (reserved && !reserved.includes(hue)) traps.push({ trap: 'reserved-hue', file: rel, detail: `${name} → {${resolved}}: ${tone} must use ${reserved.join('/')}` })
        const scale = rest[0] === 'dark' ? 'dark' : rest[0] === 'alpha' ? 'alpha' : 'light'
        if (hasDarkRamp(hue) && scale !== 'alpha' && scale !== (mode === 'dark' ? 'dark' : 'light')) {
          traps.push({ trap: 'scale-mix', file: rel, detail: `${name} → {${resolved}} in the ${mode} theme` })
        }
        ;(hueOf[tone] ??= new Set()).add(hue)
      }
    }
  }
  for (const [tone, hues] of Object.entries(hueOf)) {
    if (hues.size > 1) traps.push({ trap: 'hue-split', file: 'theme', detail: `${tone} spans ${[...hues].join(', ')} across roles or themes` })
  }
  return traps
}

function withoutTargets(json, task) {
  const copy = structuredClone(json)
  for (const dotPath of task.deleteTokenPaths) {
    const keys = dotPath.split('.')
    const parent = keys.slice(0, -1).reduce((node, k) => node?.[k], copy)
    if (parent) delete parent[keys.at(-1)]
  }
  return copy
}

// Anything changed outside the target paths: other tokens, primitives, brands,
// the contrast gate or its waivers. Consumers would see it.
function collateralChanges(ws, task) {
  const traps = []
  const diff = sh('git', ['diff', '--name-only', 'HEAD', '--', 'packages/tokens/src', 'scripts/token-contrast-check.js', 'scripts/token-contrast-waivers.json'], ws)
  for (const rel of diff.stdout.split('\n').filter(Boolean)) {
    if (task.tokenFiles.includes(rel)) {
      const before = baselineFile(ws, rel)
      const after = fs.readFileSync(path.join(ws, rel), 'utf8')
      if (JSON.stringify(withoutTargets(JSON.parse(before), task)) !== JSON.stringify(withoutTargets(JSON.parse(after), task))) {
        traps.push({ trap: 'collateral-change', file: rel, detail: 'tokens outside the feedback group changed' })
      }
    } else {
      traps.push({ trap: 'collateral-change', file: rel, detail: 'file outside the task changed' })
    }
  }
  return traps
}

// Secondary: how many of the shipped reference's aliases the run reproduced.
function referenceMatch(ws, task) {
  let matched = 0
  let total = 0
  for (const rel of task.tokenFiles) {
    const reference = JSON.parse(sh('git', ['show', `HEAD:${rel}`], ROOT).stdout)
    const generated = readJsonFile(path.join(ws, rel))
    for (const role of task.roles) {
      for (const tone of task.tones) {
        const name = `color.${role}.feedback.${tone}`
        total++
        if (resolveAlias(tokenAt(reference, name)?.$value, reference) === resolveAlias(tokenAt(generated, name)?.$value, generated)) matched++
      }
    }
  }
  return { matched, total }
}

function scoreTokenWorkspace(ws, task) {
  const gates = { 'tokens:build': tokensBuild(ws) }
  gates['tokens:contrast-check'] = gates['tokens:build'].violations ? { violations: 0, detail: ['skipped: build failed'] } : baselineContrast(ws)
  const productTraps = [...tokenTraps(ws, task), ...collateralChanges(ws, task)]

  const trapCounts = {}
  for (const v of productTraps) trapCounts[v.trap] = (trapCounts[v.trap] ?? 0) + 1
  const gateViolations = Object.values(gates).reduce((n, g) => n + g.violations, 0)
  const violations = gateViolations + productTraps.length

  return {
    product: { clean: violations === 0, violations, gateViolations, trapViolations: productTraps.length, trapCounts, gates, traps: productTraps },
    system: { referenceMatch: referenceMatch(ws, task), tokenSourceChanges: tokenSourceChanges(ws) },
  }
}

// ---------- scoring ----------

export function scoreWorkspace(ws, task) {
  if (task.kind === 'tokens') return scoreTokenWorkspace(ws, task)
  const target = task.target
  sh('npm', ['run', '-s', 'tokens:build'], ws)

  const { product: trapHits, story } = traps(ws, target)
  const checklist = []
  runPatternChecks(ws, task, checklist)
  const productTraps = [...deliverables(ws, target), ...trapHits, ...unknownTokens(ws, target), ...inventedImports(ws, target), ...checklist]
  const gates = { typecheck: typecheck(ws), lint: lint(ws, target), 'a11y:stories': a11yStories(ws, target) }

  const trapCounts = {}
  for (const v of productTraps) trapCounts[v.trap] = (trapCounts[v.trap] ?? 0) + 1
  const gateViolations = Object.values(gates).reduce((n, g) => n + g.violations, 0)
  const violations = gateViolations + productTraps.length

  const metadataFile = path.join(ws, COMPONENTS_REL, target, `${target}.metadata.json`)
  const system = {
    metadataPresent: fs.existsSync(metadataFile),
    'metadata:validate': npmScript(ws, 'metadata:validate'),
    'a11y:coverage': npmScript(ws, 'a11y:coverage'),
    patternDrift: patternDrift(ws, target),
    storyInlineStyle: { violations: story.storyInlineStyle.length, detail: story.storyInlineStyle },
    storyVisibleText: { violations: story.storyVisibleText.length, detail: story.storyVisibleText },
    propVocabulary: propVocabulary(ws, task),
    tokenSourceChanges: tokenSourceChanges(ws),
  }

  return {
    product: { clean: violations === 0, violations, gateViolations, trapViolations: productTraps.length, trapCounts, gates, traps: productTraps },
    system,
  }
}

function scoreRun(runDir) {
  const result = JSON.parse(fs.readFileSync(path.join(runDir, 'result.json'), 'utf8'))
  const task = loadTask(result.task)
  if (!fs.existsSync(result.workspace)) usage(`Workspace is gone: ${result.workspace}. The run must be redone (delete ${path.relative(ROOT, runDir)}/result.json).`)
  const scored = scoreWorkspace(result.workspace, task)
  const score = {
    task: result.task,
    arm: result.arm,
    run: result.run,
    smoke: result.smoke ?? false,
    model: result.model,
    ...scored,
    process: {
      outcome: result.outcome,
      totalCostUsd: result.totalCostUsd,
      numTurns: result.numTurns,
      durationMs: result.durationMs,
      subagentsSpawned: result.subagents?.spawned ?? null,
      reviewer: reviewerFindings(runDir, task.target),
      contaminationFlags: result.contamination.length,
      tier1Reads: result.tier1Reads ?? null,
      contextTokens: result.usage ? (result.usage.input_tokens ?? 0) + (result.usage.cache_creation_input_tokens ?? 0) + (result.usage.cache_read_input_tokens ?? 0) : null,
    },
  }
  fs.writeFileSync(path.join(runDir, 'score.json'), JSON.stringify(score, null, 2) + '\n')
  console.log(`score ${result.task} arm ${result.arm} run ${result.run}: ${score.product.violations} product violation(s)${score.product.clean ? ' — clean' : ''}`)
}

// Stage 0: restore the shipped component into a fresh workspace and score it (Arm 2,
// or Arm 0 while the task's redactions are unreviewed and Arm 2 is refused).
// Anything above 0 product violations is a scorer or reference bug to fix before
// the pilot, never something to tune per arm.
function calibrate(taskId) {
  const task = loadTask(taskId)
  const ws = path.join(os.tmpdir(), 'upskill-ablation', `calibrate-${taskId}-${Date.now()}`)
  const arm = task.redactionsReviewed ? '2' : '0'
  const prep = sh('node', [path.join(__dirname, 'prepare.js'), taskId, arm, '--out', ws, '--allow-missing-reference'], ROOT)
  if (prep.status !== 0) usage(`prepare.js failed:\n${prep.stderr}`)

  const restore = task.kind === 'tokens' ? task.tokenFiles.join(' ') : `${COMPONENTS_REL}/${task.target} packages/components/src/index.ts`
  const archive = sh('sh', ['-c', `git archive HEAD ${restore} | tar -x -C "${ws}"`], ROOT)
  if (archive.status !== 0) usage(`Restoring the reference failed:\n${archive.stderr}`)

  const scored = scoreWorkspace(ws, task)
  const outDir = path.join(RUNS_DIR, '_calibration', taskId)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'score.json'), JSON.stringify({ task: taskId, arm, workspace: ws, ...scored }, null, 2) + '\n')
  console.log(`calibrate ${taskId}: ${scored.product.violations} product violation(s) → ${path.relative(ROOT, outDir)}/score.json`)
  for (const [name, g] of Object.entries(scored.product.gates)) if (g.violations) console.log(`  ${name}: ${g.detail.join('\n    ')}`)
  for (const v of scored.product.traps) console.log(`  ${v.trap} ${v.file}${v.line ? `:${v.line}` : ''} ${v.detail}`)
  const vocab = scored.system.propVocabulary
  if (vocab?.ran && !vocab.passed) console.log(`  prop-vocabulary (system): ${vocab.detail.join('; ')}`)
  process.exit(scored.product.violations > 0 ? 1 : 0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args[0] === '--calibrate') {
    if (!args[1]) usage()
    calibrate(args[1])
  } else {
    if (!args[0]) usage()
    scoreRun(path.resolve(args[0]))
  }
}
