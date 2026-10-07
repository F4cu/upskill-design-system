#!/usr/bin/env node
// Renders results.md from whatever score.json files exist under .runs/. Kept
// separate from run.js so a partial run (--task) regenerates the report from
// all accumulated results, not just the tasks it touched.
//
// A cell (task × arm) is one run at .runs/<task>/<arm>/score.json, or several
// at .runs/<task>/<arm>/run-<n>/score.json. Cells report the median, so one
// lucky or unlucky run never decides a comparison.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TASKS_DIR = path.join(__dirname, 'tasks')
const RUNS_DIR = path.join(__dirname, '.runs')
const RESULTS = path.join(__dirname, 'results.md')
const ARMS = ['A', 'B', 'C']
const PRE_REGISTERED_RUNS = 3

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function readScores(task, arm) {
  const dir = path.join(RUNS_DIR, task, arm)
  if (!fs.existsSync(dir)) return []
  const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
  if (fs.existsSync(path.join(dir, 'score.json'))) return [read(path.join(dir, 'score.json'))]
  return fs.readdirSync(dir)
    .filter((d) => /^run-\d+$/.test(d) && fs.existsSync(path.join(dir, d, 'score.json')))
    .map((d) => read(path.join(dir, d, 'score.json')))
}

function summarise(task, arm, scores) {
  const totals = scores.map((s) => s.total)
  const spec = scores.map((s) => s.secondary?.['spec:conformance']?.violations).filter((v) => v !== undefined)
  const prompt = scores.map((s) => s.promptChars).filter((v) => v !== undefined)
  return {
    task,
    arm,
    kind: scores[0].kind,
    runs: scores.length,
    gate: median(scores.map((s) => s.gateViolations)),
    trap: median(scores.map((s) => s.trapViolations)),
    total: median(totals),
    min: Math.min(...totals),
    max: Math.max(...totals),
    spec: spec.length ? median(spec) : null,
    promptChars: prompt.length ? median(prompt) : null,
  }
}

export function writeReport() {
  const taskIds = fs.readdirSync(TASKS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort()

  const cells = []
  for (const id of taskIds) {
    for (const arm of ARMS) {
      const scores = readScores(id, arm)
      if (scores.length) cells.push(summarise(id, arm, scores))
    }
  }
  const cell = (task, arm) => cells.find((c) => c.task === task && c.arm === arm)

  const lines = [
    '# Pattern-accuracy harness results',
    '',
    `Generated: ${new Date().toISOString()} — ${new Set(cells.map((c) => c.task)).size} of ${taskIds.length} tasks scored.`,
    '',
    'Arm A = brief + per-component metadata (what /layout-generation and /component-scaffold inject today).',
    'Arm B = identical prompt + the full `.claude/component-patterns.json`.',
    "Arm C = Arm A + the target's approved `<Name>.spec.json` (ADR-027; tasks with `specTarget` only).",
    'Violations = pre-registered gate failures + deterministic trap-checklist hits (see score.js). Lower is better.',
    'With several runs per cell, gate/trap/total are medians and Range is min–max of the total. Spec conformance is secondary and never part of Total.',
    '',
    '> **Honest-outcome rule** (meta-schema handoff §5, verbatim): "if Arm B does not reduce violations meaningfully, report that plainly and recommend *not* shipping the schema. Do not massage tasks to manufacture a win."',
    '',
    '| Task | Kind | Arm | Runs | Gate violations | Trap violations | Total | Range | Spec conformance | Prompt chars |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|',
  ]
  for (const c of cells) {
    const range = c.runs > 1 ? `${c.min}–${c.max}` : '—'
    lines.push(`| ${c.task} | ${c.kind} | ${c.arm} | ${c.runs} | ${c.gate} | ${c.trap} | ${c.total} | ${range} | ${c.spec ?? '—'} | ${c.promptChars ?? '—'} |`)
  }

  const abTasks = taskIds.filter((t) => cell(t, 'A') && cell(t, 'B'))
  const totalA = abTasks.reduce((s, t) => s + cell(t, 'A').total, 0)
  const totalB = abTasks.reduce((s, t) => s + cell(t, 'B').total, 0)

  lines.push('', '## Delta (A vs B)', '')
  if (abTasks.length === 0) {
    lines.push('No task scored in both arms yet.')
  } else {
    const pct = totalA === 0 ? 0 : Math.round(((totalA - totalB) / totalA) * 100)
    lines.push(`Arm A total: **${totalA}** · Arm B total: **${totalB}** · delta: **${totalA - totalB}** (${pct}% reduction) across ${abTasks.length} task(s).`)
    lines.push('')
    if (totalB < totalA) {
      lines.push(`**Summary:** Arm B reduced violations by ${totalA - totalB} (${pct}%). Judge "meaningfully" against the full matrix before shipping — a partial run is not a go signal.`)
    } else {
      lines.push('**Summary:** Arm B did not reduce violations — per the honest-outcome rule, the recommendation is **do not ship** the pattern schema.')
    }
    const abTaskCount = taskIds.filter((t) => !loadSpecTarget(t)).length
    if (abTasks.length < abTaskCount) {
      lines.push('', `_Partial run: ${abTasks.length}/${abTaskCount} A/B tasks scored. Run \`npm run harness:run -- --all\` for the full matrix before drawing a ship/no-ship conclusion._`)
    }
  }

  const specTasks = taskIds.filter((t) => loadSpecTarget(t))
  lines.push('', '## Delta (A vs C, ADR-027 exit condition)', '')
  lines.push('> **Accept bar** (spec harness arm handoff, pre-registered): over N = 3 runs, Arm C\'s median headline total ≤ Arm A\'s on **each** task. If Arm C is worse on either task, report it and reject ADR-027. Don\'t tune briefs, traps or the spec after seeing results.')
  lines.push('')
  const acTasks = specTasks.filter((t) => cell(t, 'A') && cell(t, 'C'))
  if (acTasks.length === 0) {
    lines.push('No task scored in both arms yet.')
  } else {
    lines.push('| Task | A median | C median | C ≤ A | A spec conformance | C spec conformance | A prompt chars | C prompt chars | Runs (A/C) |')
    lines.push('|---|---:|---:|---|---:|---:|---:|---:|---|')
    for (const t of acTasks) {
      const a = cell(t, 'A')
      const c = cell(t, 'C')
      lines.push(`| ${t} | ${a.total} | ${c.total} | ${c.total <= a.total ? 'yes' : '**no**'} | ${a.spec ?? '—'} | ${c.spec ?? '—'} | ${a.promptChars ?? '—'} | ${c.promptChars ?? '—'} | ${a.runs}/${c.runs} |`)
    }
    lines.push('')
    const complete = acTasks.length === specTasks.length &&
      acTasks.every((t) => cell(t, 'A').runs >= PRE_REGISTERED_RUNS && cell(t, 'C').runs >= PRE_REGISTERED_RUNS)
    const worse = acTasks.filter((t) => cell(t, 'C').total > cell(t, 'A').total)
    if (!complete) {
      lines.push(`_Incomplete: the accept bar needs all ${specTasks.length} spec task(s) with ≥ ${PRE_REGISTERED_RUNS} runs in both arms. No verdict yet._`)
    } else if (worse.length) {
      lines.push(`**Verdict:** Arm C is worse on ${worse.join(', ')}. Per the honest-outcome rule, **reject ADR-027**.`)
    } else {
      lines.push('**Verdict:** Arm C is not worse on any task. ADR-027\'s accept bar is met.')
    }
  }

  fs.writeFileSync(RESULTS, lines.join('\n') + '\n')
}

function loadSpecTarget(taskId) {
  return JSON.parse(fs.readFileSync(path.join(TASKS_DIR, `${taskId}.json`), 'utf8')).specTarget ?? null
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeReport()
  console.log(`Wrote ${RESULTS}`)
}
