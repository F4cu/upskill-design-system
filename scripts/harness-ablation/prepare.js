#!/usr/bin/env node
// Builds one harness-ablation workspace: `prepare.js <task> <arm> [--out <dir>]`.
// Arms and leakage controls: .claude/handoff/archive/2026-10-07-harness-ablation-eval.handoff.md.
//
// HEAD is archived (never the working tree) into a fresh dir outside the repo, so
// no ancestor CLAUDE.md or AGENTS.md loads, then stripped per arm, the target removed, the
// frozen files regenerated without it, and the result committed as the baseline
// the Arm 2 reviewer diffs against. `.ablation-workspace` is written last and
// left untracked: it is the guard `/add-component --eval` checks.

import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync, spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const TASKS_DIR = path.join(__dirname, 'tasks')
const ARMS = ['0', '1', '2']

// Not part of any arm's context, and each describes the target's API, usage or
// scoring: the consumer apps, the human reference docs, the eval harnesses, and
// the committed handoffs (Arm 2 writes its own runs/ into an empty handoff dir).
const STRIP_ALL_ARMS = [
  'apps',
  'scripts/pattern-accuracy-harness',
  'scripts/harness-ablation',
  '.claude/handoff',
]

// Arm 0: a good component library with no agent harness.
const STRIP_ARM_0 = [
  'CLAUDE.md',
  'AGENTS.md',
  'ROADMAP.md',
  '.claude',
  'docs/decisions',
  'packages/components/component.schema.json',
  'packages/components/component.spec.schema.json',
  'packages/components/component.metadata.example.json',
  'scripts/sense.js',
  'scripts/sense-component.js',
  'scripts/validate-metadata.js',
  'scripts/validate-spec.js',
  'scripts/validate-layout.js',
  'scripts/generate-pattern-schema.js',
  'scripts/status.js',
  'scripts/handoff-tidy.js',
  'scripts/claude-md-check.js',
  'scripts/docs-check.js',
]

// Arm 1: the context without the loop.
const STRIP_ARM_1 = ['.claude/commands', '.claude/agents', '.claude/skills']

function usage(msg) {
  if (msg) console.error(msg)
  console.error('Usage: node scripts/harness-ablation/prepare.js <task> <arm 0|1|2> [--out <dir>] [--allow-missing-reference]')
  process.exit(1)
}

function parseArgs(argv) {
  const args = { positional: [], out: null, allowMissingReference: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = argv[++i]
    else if (argv[i] === '--allow-missing-reference') args.allowMissingReference = true
    else args.positional.push(argv[i])
  }
  return args
}

function loadTask(id) {
  const p = path.join(TASKS_DIR, `${id}.json`)
  if (!fs.existsSync(p)) usage(`No task file: ${path.relative(ROOT, p)}`)
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function run(cmd, cwd) {
  return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
}

function rm(ws, rel) {
  fs.rmSync(path.join(ws, rel), { recursive: true, force: true })
}

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, visit)
    else visit(p)
  }
}

function assertOutsideRepo(out) {
  const real = path.resolve(out)
  if (real === ROOT || real.startsWith(ROOT + path.sep)) usage(`--out must be outside the repo: ${real}`)
  for (let dir = path.dirname(real); dir !== path.dirname(dir); dir = path.dirname(dir)) {
    for (const file of ['CLAUDE.md', 'AGENTS.md']) {
      if (fs.existsSync(path.join(dir, file))) usage(`An ancestor of --out has a ${file}, which Claude Code would load: ${dir}`)
    }
  }
}

function archiveHead(ws) {
  fs.mkdirSync(ws, { recursive: true })
  if (fs.readdirSync(ws).length > 0) usage(`Workspace is not empty: ${ws}`)
  execSync(`git archive HEAD | tar -x -C "${ws}"`, { cwd: ROOT, stdio: 'inherit' })
}

function stripArm(ws, arm) {
  for (const rel of STRIP_ALL_ARMS) rm(ws, rel)
  for (const entry of fs.readdirSync(path.join(ws, 'docs'))) {
    if (entry !== 'decisions') rm(ws, path.join('docs', entry))
  }
  fs.mkdirSync(path.join(ws, '.claude/handoff/runs'), { recursive: true })

  if (arm === '0') {
    for (const rel of STRIP_ARM_0) rm(ws, rel)
    walk(path.join(ws, 'packages'), (p) => {
      if (p.endsWith('.metadata.json') || p.endsWith('.spec.json')) fs.rmSync(p)
    })
  }
  if (arm === '1') for (const rel of STRIP_ARM_1) rm(ws, rel)
}

// Drop scripts whose file or workspace no longer exists, so the arm isn't
// pointed at tooling it doesn't have.
function prunePackageJson(ws) {
  const p = path.join(ws, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8'))
  pkg.scripts.build = pkg.scripts.build.replace(' && npm run build -w @upskill/showcase', '')
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    const missingScript = [...cmd.matchAll(/node (scripts\/\S+\.js)/g)].some(([, f]) => !fs.existsSync(path.join(ws, f)))
    const missingWorkspace = /-w @upskill\/(showcase|docs)/.test(cmd)
    if (missingScript || missingWorkspace) delete pkg.scripts[name]
  }
  const dangling = Object.entries(pkg.scripts)
    .filter(([, cmd]) => cmd.split('&&').some((step) => {
      const m = step.match(/npm run ([\w:-]+)/)
      return m && !step.includes(' -w ') && !pkg.scripts[m[1]]
    }))
    .map(([name]) => name)
  for (const name of dangling) delete pkg.scripts[name]
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n')
}

function deleteTarget(ws, task) {
  const target = task.target
  rm(ws, `packages/components/src/components/${target}`)
  for (const rel of task.deleteFiles ?? []) {
    if (!fs.existsSync(path.join(ws, rel))) throw new Error(`deleteFiles entry not found: ${rel}`)
    rm(ws, rel)
  }

  const indexPath = path.join(ws, 'packages/components/src/index.ts')
  const index = fs.readFileSync(indexPath, 'utf8')
  const exportRe = new RegExp(`export\\s+(?:type\\s+)?\\{[^}]*\\}\\s+from\\s+'\\./components/${target}'\\n`, 'g')
  const stripped = index.replace(exportRe, '')
  if (stripped === index) throw new Error(`No export of ./components/${target} found in index.ts`)
  fs.writeFileSync(indexPath, stripped.replace(/\n{3,}/g, '\n\n'))

  const shotsDir = path.join(ws, 'packages/components/screenshots')
  const shotPrefixes = [`components-${target.toLowerCase()}--`, ...(task.deleteScreenshots ?? [])]
  for (const f of fs.readdirSync(shotsDir)) {
    if (shotPrefixes.some((prefix) => f.startsWith(prefix))) fs.rmSync(path.join(shotsDir, f))
  }
}

function stripNameFromArrays(node, name) {
  if (Array.isArray(node)) {
    const kept = node.filter((v) => v !== name)
    return kept.map((v) => stripNameFromArrays(v, name))
  }
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, stripNameFromArrays(v, name)]))
  }
  return node
}

// Other components' metadata/specs keep prose mentions of the target (passing
// mentions are an accepted leak) but lose it from relationship lists.
function stripRelationships(ws, target) {
  walk(path.join(ws, 'packages/components/src'), (p) => {
    if (!p.endsWith('.metadata.json') && !p.endsWith('.spec.json')) return
    const raw = fs.readFileSync(p, 'utf8')
    const next = JSON.stringify(stripNameFromArrays(JSON.parse(raw), target), null, 2) + '\n'
    if (next !== raw) fs.writeFileSync(p, next)
  })

  const reviewState = path.join(ws, '.claude/component-review-state.json')
  if (fs.existsSync(reviewState)) {
    const state = JSON.parse(fs.readFileSync(reviewState, 'utf8'))
    delete state[target]
    fs.writeFileSync(reviewState, JSON.stringify(state, null, 2) + '\n')
  }

  const pipelineStatus = path.join(ws, '.claude/pipeline-status.json')
  if (fs.existsSync(pipelineStatus)) {
    const status = JSON.parse(fs.readFileSync(pipelineStatus, 'utf8'))
    const mention = new RegExp(`\\b${target}\\b`)
    status.issues = status.issues.filter((issue) => !mention.test(issue.title))
    fs.writeFileSync(pipelineStatus, JSON.stringify(status, null, 2) + '\n')
  }
}

// Exact-string edits from the task file. A redaction that no longer matches is
// an error, not a skip: an ADR edited since the task was written would otherwise
// leak silently. Files the arm doesn't have are skipped.
function applyRedactions(ws, task) {
  const applied = []
  for (const r of task.redactions ?? []) {
    const p = path.join(ws, r.file)
    if (!fs.existsSync(p)) continue
    const text = fs.readFileSync(p, 'utf8')
    const count = text.split(r.find).length - 1
    if (count !== 1) throw new Error(`Redaction must match exactly once (matched ${count}) in ${r.file}: ${r.find.slice(0, 80)}…`)
    fs.writeFileSync(p, text.replace(r.find, () => r.replace))
    applied.push(r.file)
  }
  return applied
}

function linkEntries(fromDir, toDir, skip = new Set()) {
  fs.mkdirSync(toDir, { recursive: true })
  for (const entry of fs.readdirSync(fromDir)) {
    if (skip.has(entry)) continue
    fs.symlinkSync(path.join(fromDir, entry), path.join(toDir, entry))
  }
}

// Per-entry links into the main checkout's node_modules, except @upskill: the
// main checkout's workspace links point back into the real repo, where the
// deleted component still exists.
function linkNodeModules(ws) {
  linkEntries(path.join(ROOT, 'node_modules'), path.join(ws, 'node_modules'), new Set(['@upskill']))
  const scope = path.join(ws, 'node_modules/@upskill')
  fs.mkdirSync(scope)
  fs.symlinkSync('../../packages/components', path.join(scope, 'components'))
  fs.symlinkSync('../../packages/tokens', path.join(scope, 'tokens'))

  for (const pkg of ['components', 'tokens']) {
    const from = path.join(ROOT, 'packages', pkg, 'node_modules')
    if (fs.existsSync(from)) linkEntries(from, path.join(ws, 'packages', pkg, 'node_modules'))
  }
}

// Regenerate the frozen files from the stripped tree rather than editing them,
// so they read exactly as if the target had never shipped. The HEAD-derived
// snapshots are deleted before the first commit and rebuilt after it, so no
// object in the workspace's .git ever holds the pre-deletion copy.
const HEAD_DERIVED = ['.claude/component-patterns.json', '.claude/component-pipeline.json', '.claude/STATUS_QUO.md']

function regenerateBeforeCommit(ws) {
  run('node scripts/token-usage.js', ws)
  for (const rel of HEAD_DERIVED) rm(ws, rel)
}

function regenerateAfterCommit(ws, arm) {
  if (arm === '0') return
  run('node scripts/sense.js', ws)
  run('node scripts/generate-pattern-schema.js', ws)
}

function copyReference(ws, task, allowMissing) {
  const src = path.join(TASKS_DIR, task.referencePng)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(ws, 'reference.png'))
    return true
  }
  if (!allowMissing) usage(`Missing ${path.relative(ROOT, src)} (pass --allow-missing-reference for a smoke test)`)
  return false
}

const GIT_ID = '-c user.name=ablation -c user.email=ablation@localhost'

// generate-pattern-schema.js records HEAD, so the repo needs a commit before
// regeneration; the regenerated files are then amended into that one commit.
function initRepo(ws) {
  run('git init -q', ws)
  run('git add -A', ws)
  run(`git ${GIT_ID} commit -q -m baseline`, ws)
}

function commitBaseline(ws) {
  run('git add -A', ws)
  run(`git ${GIT_ID} commit -q --amend --no-edit`, ws)
  run('git reflog expire --expire=now --all', ws)
  run('git gc -q --prune=now', ws)
  fs.writeFileSync(path.join(ws, '.ablation-workspace'), '')
  fs.appendFileSync(path.join(ws, '.git/info/exclude'), '.ablation-workspace\n')
}

// Every remaining mention of the target, for the pilot's transcript review. An
// import of the target from code is a hard failure: the arm could read usage.
function leakReport(ws, target) {
  const grep = spawnSync('git', ['grep', '-n', '-w', target], { cwd: ws, encoding: 'utf8' })
  const lines = grep.stdout.split('\n').filter(Boolean)
  const importRe = new RegExp(`from\\s+['"][^'"]*/${target}['"]`)
  const codeImports = lines.filter((l) => /^[^:]+\.(tsx?|jsx?|css|mdx)$/.test(l.split(':')[0]) && importRe.test(l))
  if (codeImports.length) throw new Error(`Code still imports ${target}:\n${codeImports.join('\n')}`)
  const unreachable = run('git fsck --unreachable --no-reflogs', ws).trim()
  if (unreachable) throw new Error(`Workspace .git has unreachable objects (pre-amend history):\n${unreachable}`)
  return lines
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const [taskId, arm] = args.positional
  if (!taskId || !ARMS.includes(arm)) usage()
  const task = loadTask(taskId)
  if (arm !== '0' && task.redactionsReviewed !== true) {
    usage(`Task ${taskId} has redactionsReviewed !== true; review its ADR/rules redactions before running Arm ${arm}.`)
  }

  const ws = path.resolve(args.out ?? path.join(os.tmpdir(), 'upskill-ablation', `${taskId}-arm${arm}-${Date.now()}`))
  assertOutsideRepo(ws)

  archiveHead(ws)
  stripArm(ws, arm)
  deleteTarget(ws, task)
  if (arm !== '0') stripRelationships(ws, task.target)
  const redacted = applyRedactions(ws, task)
  prunePackageJson(ws)
  linkNodeModules(ws)
  const hasReference = copyReference(ws, task, args.allowMissingReference)
  regenerateBeforeCommit(ws)
  initRepo(ws)
  run('npm run tokens:build', ws)
  regenerateAfterCommit(ws, arm)
  commitBaseline(ws)
  const mentions = leakReport(ws, task.target)

  const reportPath = path.join(path.dirname(ws), `${path.basename(ws)}.leak-report.txt`)
  fs.writeFileSync(reportPath, mentions.join('\n') + '\n')

  console.log(JSON.stringify({
    workspace: ws,
    task: taskId,
    arm,
    target: task.target,
    reference: hasReference,
    redactedFiles: [...new Set(redacted)],
    remainingMentions: mentions.length,
    leakReport: reportPath,
  }, null, 2))
}

main()
