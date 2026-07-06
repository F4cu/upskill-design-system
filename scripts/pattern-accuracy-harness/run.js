#!/usr/bin/env node
// Orchestrator for the pattern-accuracy harness (§5 of the meta-schema
// handoff). For each task × arm it invokes `claude -p` headlessly with a fresh
// context — Arm A gets the brief + per-component metadata (mirroring what
// /layout-generation and /component-scaffold inject today), Arm B gets the
// identical prompt + .claude/component-patterns.json — extracts the emitted
// files into an isolated scratch dir, and scores them with score.js.
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

function runArm(task, arm) {
  const scratchDir = path.join(RUNS_DIR, task.id, arm)
  fs.rmSync(scratchDir, { recursive: true, force: true })
  fs.mkdirSync(scratchDir, { recursive: true })

  const prompt = buildPrompt(task, arm)
  fs.writeFileSync(path.join(scratchDir, 'prompt.md'), prompt)

  console.log(`[${task.id}] arm ${arm}: invoking claude -p (${prompt.length} chars of prompt)…`)
  const response = invokeClaude(prompt)
  fs.writeFileSync(path.join(scratchDir, 'response.md'), response)

  const written = extractFiles(response, scratchDir, task.outputHint)
  console.log(`[${task.id}] arm ${arm}: extracted ${written.length} file(s): ${written.join(', ') || '(none)'}`)

  const score = scoreScratch(scratchDir, task)
  console.log(`[${task.id}] arm ${arm}: ${score.gateViolations} gate + ${score.trapViolations} trap = ${score.total} violations`)
  return score
}

const args = process.argv.slice(2)
const taskIds = []
let all = false
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--all') all = true
  else if (args[i] === '--task') taskIds.push(args[++i])
  else {
    console.error(`Unknown argument: ${args[i]}`)
    process.exit(1)
  }
}
if (!all && taskIds.length === 0) {
  console.error('Usage: npm run harness:run -- --task <id> [--task <id>…] | --all')
  console.error(`Available tasks: ${fs.readdirSync(TASKS_DIR).map((f) => f.replace('.json', '')).join(', ')}`)
  process.exit(1)
}

const selected = all
  ? fs.readdirSync(TASKS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort()
  : taskIds

for (const id of selected) {
  const task = loadTask(id)
  for (const arm of ['A', 'B']) runArm(task, arm)
}

writeReport()
console.log(`\nReport written to ${path.relative(process.cwd(), path.join(__dirname, 'results.md'))}`)
