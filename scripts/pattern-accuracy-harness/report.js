#!/usr/bin/env node
// Renders results.md from whatever score.json files exist under .runs/. Kept
// separate from run.js so a partial run (--task) regenerates the report from
// all accumulated results, not just the tasks it touched.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TASKS_DIR = path.join(__dirname, 'tasks')
const RUNS_DIR = path.join(__dirname, '.runs')
const RESULTS = path.join(__dirname, 'results.md')

export function writeReport() {
  const taskIds = fs.readdirSync(TASKS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort()

  const rows = []
  for (const id of taskIds) {
    for (const arm of ['A', 'B']) {
      const scoreFile = path.join(RUNS_DIR, id, arm, 'score.json')
      if (fs.existsSync(scoreFile)) rows.push({ arm, ...JSON.parse(fs.readFileSync(scoreFile, 'utf8')) })
    }
  }

  const lines = [
    '# Pattern-accuracy harness results',
    '',
    `Generated: ${new Date().toISOString()} — ${new Set(rows.map((r) => r.task)).size} of ${taskIds.length} tasks scored.`,
    '',
    'Arm A = brief + per-component metadata (what /layout-generation and /component-scaffold inject today).',
    'Arm B = identical prompt + the full `.claude/component-patterns.json`.',
    'Violations = pre-registered gate failures + deterministic trap-checklist hits (see score.js). Lower is better.',
    '',
    '> **Honest-outcome rule** (meta-schema handoff §5, verbatim): "if Arm B does not reduce violations meaningfully, report that plainly and recommend *not* shipping the schema. Do not massage tasks to manufacture a win."',
    '',
    '| Task | Kind | Arm | Gate violations | Trap violations | Total |',
    '|---|---|---|---:|---:|---:|',
  ]
  for (const r of rows) {
    lines.push(`| ${r.task} | ${r.kind} | ${r.arm} | ${r.gateViolations} | ${r.trapViolations} | ${r.total} |`)
  }

  const totalA = rows.filter((r) => r.arm === 'A').reduce((s, r) => s + r.total, 0)
  const totalB = rows.filter((r) => r.arm === 'B').reduce((s, r) => s + r.total, 0)
  const scoredTasks = new Set(rows.map((r) => r.task)).size

  lines.push('', '## Delta', '')
  if (rows.length === 0) {
    lines.push('No scored runs yet.')
  } else {
    const pct = totalA === 0 ? 0 : Math.round(((totalA - totalB) / totalA) * 100)
    lines.push(`Arm A total: **${totalA}** · Arm B total: **${totalB}** · delta: **${totalA - totalB}** (${pct}% reduction) across ${scoredTasks} task(s).`)
    lines.push('')
    if (totalB < totalA) {
      lines.push(`**Summary:** Arm B reduced violations by ${totalA - totalB} (${pct}%). Judge "meaningfully" against the full matrix before shipping — a partial run is not a go signal.`)
    } else {
      lines.push('**Summary:** Arm B did not reduce violations — per the honest-outcome rule, the recommendation is **do not ship** the pattern schema.')
    }
    if (scoredTasks < taskIds.length) {
      lines.push('', `_Partial run: ${scoredTasks}/${taskIds.length} tasks scored. Run \`npm run harness:run -- --all\` for the full matrix before drawing a ship/no-ship conclusion._`)
    }
  }

  fs.writeFileSync(RESULTS, lines.join('\n') + '\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeReport()
  console.log(`Wrote ${RESULTS}`)
}
