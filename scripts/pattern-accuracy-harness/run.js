#!/usr/bin/env node
// Orchestrator for the pattern-accuracy harness (§5 of the meta-schema
// handoff). For each task × arm it invokes `claude -p` headlessly with a fresh
// context — Arm A gets the brief + per-component metadata (mirroring what
// /layout-generation and /component-scaffold inject today), Arm B gets the
// identical prompt + .claude/component-patterns.json, Arm C gets Arm A + the
// target's approved <Name>.spec.json (ADR-027; tasks with `specTarget` only) —
// extracts the emitted files into an isolated scratch dir, and scores them
// with score.js.
// Sequential, never parallel (CLAUDE.md on-demand loop guardrails).
//
// `claude` runs with cwd in an empty tmp dir so the repo's CLAUDE.md is NOT
// loaded — otherwise both arms would inherit the trap rules it documents and
// the measurement would be of CLAUDE.md, not of the injected context.

import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { scoreScratch, loadTask } from './score.js'
import { writeReport } from './report.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const TASKS_DIR = path.join(__dirname, 'tasks')
const RUNS_DIR = path.join(__dirname, '.runs')
const COMPONENTS_DIR = path.join(ROOT, 'packages/components/src/components')
const DRY_RUN_DIR = path.join(RUNS_DIR, '.dry-run')
const PATTERNS_FILE = path.join(ROOT, '.claude/component-patterns.json')
const SCHEMA_FILE = path.join(ROOT, 'packages/components/component.schema.json')

const FIXED_SET = [
  'Box', 'Stack', 'Inline', 'Text', 'Heading', 'Icon', 'Button', 'TextField',
  'Select', 'Checkbox', 'Card', 'Avatar', 'AppHeader', 'Breadcrumb', 'Divider',
  'ProgressBar', 'CardHorizontal', 'CardVertical', 'Chip', 'VideoFrame',
  'ButtonArrow', 'ScrollArea', 'Accordion', 'AccordionItem', 'Badge',
]

function buildPrompt(task, arm) {
  const sections = []
  sections.push(
    'You are generating code for the UpSkill Design System: React + TypeScript, CSS Modules, design tokens exposed as CSS custom properties consumed via var(--...).',
    `Library components are imported from '@upskill/components'. Available: ${FIXED_SET.join(', ')}. Hooks: useSlider, useCarousel. Do not invent other library components.`,
    '',
    'TASK:',
    task.brief,
  )

  sections.push('', 'CONTEXT — component metadata (JSON), one block per component:')
  for (const name of task.contextMetadata) {
    const metadata = fs.readFileSync(path.join(COMPONENTS_DIR, name, `${name}.metadata.json`), 'utf8')
    sections.push('', `--- ${name}.metadata.json ---`, metadata.trim())
  }

  if (task.includeSchema) {
    sections.push(
      '',
      'CONTEXT — component.schema.json that any *.metadata.json you emit must validate against:',
      fs.readFileSync(SCHEMA_FILE, 'utf8').trim(),
    )
  }

  if (arm === 'C') {
    sections.push(
      '',
      `CONTEXT — approved component spec (${task.specTarget}.spec.json):`,
      fs.readFileSync(path.join(COMPONENTS_DIR, task.specTarget, `${task.specTarget}.spec.json`), 'utf8').trim(),
    )
  }

  if (arm === 'B') {
    sections.push(
      '',
      'CONTEXT — cross-component pattern aggregate for this design system (.claude/component-patterns.json):',
      fs.readFileSync(PATTERNS_FILE, 'utf8').trim(),
    )
  }

  sections.push(
    '',
    'OUTPUT FORMAT — emit ONLY files, no prose before, between, or after. For each file, print a line `FILE: <relative-path>` followed by one fenced code block containing that file\'s complete contents.',
    `Expected files: ${task.outputHint.join(', ')}`,
  )
  return sections.join('\n')
}

function extractFiles(response, scratchDir, outputHint) {
  const written = []
  const fileBlocks = [...response.matchAll(/FILE:\s*(\S+)\s*\n+```[\w.-]*\n([\s\S]*?)\n```/g)]
  if (fileBlocks.length > 0) {
    for (const [, rawPath, content] of fileBlocks) {
      const rel = path.normalize(rawPath)
      if (rel.startsWith('..') || path.isAbsolute(rel)) continue
      const dest = path.join(scratchDir, rel)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.writeFileSync(dest, content + '\n')
      written.push(rel)
    }
    return written
  }
  const fences = [...response.matchAll(/```[\w.-]*\n([\s\S]*?)\n```/g)]
  if (fences.length === 1) {
    const dest = path.join(scratchDir, outputHint[0])
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, fences[0][1] + '\n')
    written.push(outputHint[0])
  }
  return written
}

function invokeClaude(prompt) {
  const cleanCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pattern-harness-'))
  const result = spawnSync('claude', ['-p', '--allowedTools', '', '--strict-mcp-config', '--max-turns', '4'], {
    input: prompt,
    cwd: cleanCwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
  })
  fs.rmSync(cleanCwd, { recursive: true, force: true })
  if (result.status !== 0) {
    throw new Error(`claude -p exited ${result.status}: ${(result.stderr || '').slice(0, 500)}`)
  }
  return result.stdout
}

function armsFor(task) {
  const arms = task.specTarget ? ['A', 'B', 'C'] : ['A', 'B']
  return armFilter.length > 0 ? arms.filter((a) => armFilter.includes(a)) : arms
}

function dryRunArm(task, arm) {
  const dir = path.join(DRY_RUN_DIR, task.id, arm)
  fs.mkdirSync(dir, { recursive: true })
  const prompt = buildPrompt(task, arm)
  fs.writeFileSync(path.join(dir, 'prompt.md'), prompt)
  console.log(`[${task.id}] arm ${arm}: ${prompt.length} chars → ${path.relative(process.cwd(), path.join(dir, 'prompt.md'))}`)
}

// One run keeps the original .runs/<task>/<arm>/ layout so the July cells stay
// readable; several runs go to .runs/<task>/<arm>/run-<n>/.
function runArm(task, arm, run) {
  const scratchDir = runs === 1 ? path.join(RUNS_DIR, task.id, arm) : path.join(RUNS_DIR, task.id, arm, `run-${run}`)
  const label = runs === 1 ? `[${task.id}] arm ${arm}` : `[${task.id}] arm ${arm} run ${run}`
  fs.rmSync(scratchDir, { recursive: true, force: true })
  fs.mkdirSync(scratchDir, { recursive: true })

  const prompt = buildPrompt(task, arm)
  fs.writeFileSync(path.join(scratchDir, 'prompt.md'), prompt)

  console.log(`${label}: invoking claude -p (${prompt.length} chars of prompt)…`)
  const response = invokeClaude(prompt)
  fs.writeFileSync(path.join(scratchDir, 'response.md'), response)

  const written = extractFiles(response, scratchDir, task.outputHint)
  console.log(`${label}: extracted ${written.length} file(s): ${written.join(', ') || '(none)'}`)

  const score = { ...scoreScratch(scratchDir, task), promptChars: prompt.length }
  fs.writeFileSync(path.join(scratchDir, 'score.json'), JSON.stringify(score, null, 2) + '\n')
  console.log(`${label}: ${score.gateViolations} gate + ${score.trapViolations} trap = ${score.total} violations`)
  return score
}

const args = process.argv.slice(2)
const taskIds = []
const armFilter = []
let all = false
let dryRun = false
let runs = 1
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--all') all = true
  else if (args[i] === '--task') taskIds.push(args[++i])
  else if (args[i] === '--arm') armFilter.push(args[++i])
  else if (args[i] === '--dry-run') dryRun = true
  else if (args[i] === '--runs') runs = Number(args[++i])
  else {
    console.error(`Unknown argument: ${args[i]}`)
    process.exit(1)
  }
}
if (!all && taskIds.length === 0) {
  console.error('Usage: npm run harness:run -- --task <id> [--task <id>…] | --all  [--arm <A|B|C>…] [--runs <n>] [--dry-run]')
  console.error(`Available tasks: ${fs.readdirSync(TASKS_DIR).map((f) => f.replace('.json', '')).join(', ')}`)
  process.exit(1)
}

const badArm = armFilter.find((a) => !['A', 'B', 'C'].includes(a))
if (badArm) {
  console.error(`Unknown arm: ${badArm} (expected A, B or C)`)
  process.exit(1)
}
if (!Number.isInteger(runs) || runs < 1) {
  console.error('--runs must be a positive integer')
  process.exit(1)
}

const selected = all
  ? fs.readdirSync(TASKS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort()
  : taskIds

for (const id of selected) {
  const task = loadTask(id)
  const arms = armsFor(task)
  if (arms.length === 0) console.log(`[${id}] no matching arm (arm C needs specTarget), skipped`)
  for (const arm of arms) {
    if (dryRun) dryRunArm(task, arm)
    else for (let run = 1; run <= runs; run++) runArm(task, arm, run)
  }
}

if (dryRun) process.exit(0)
writeReport()
console.log(`\nReport written to ${path.relative(process.cwd(), path.join(__dirname, 'results.md'))}`)
