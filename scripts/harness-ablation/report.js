#!/usr/bin/env node
// Renders results.md from every score.json under .runs/<task>/arm<N>/run-<k>/,
// and copies each cell's median run into results/<task>/arm<N>/ for the
// case-study figure. Kept separate from run.js so a partial run regenerates the
// report from everything accumulated. Metrics and rules:
// .claude/handoff/2026-10-07-harness-ablation-eval.handoff.md → "Scoring",
// "Pre-registration".
//
//   node scripts/harness-ablation/report.js [--smoke]
//
// --smoke reports .runs/_smoke/ into results-smoke.md and never touches
// results.md or results/.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TASKS_DIR = path.join(__dirname, 'tasks')
const ARMS = ['0', '1', '2']
const ARM_NAMES = { 0: 'Bare repo', 1: 'Context only', 2: 'Full harness' }
const PRE_REGISTERED_RUNS = 3

const smoke = process.argv.includes('--smoke')
const RUNS_DIR = path.join(__dirname, '.runs', smoke ? '_smoke' : '')
const RESULTS_MD = path.join(__dirname, smoke ? 'results-smoke.md' : 'results.md')
const MEDIAN_DIR = path.join(__dirname, 'results')

const sum = (xs) => xs.reduce((a, b) => a + b, 0)
const mean = (xs) => (xs.length ? sum(xs) / xs.length : null)
const fmt = (n, digits = 1) => (n === null || n === undefined ? '—' : Number(n).toFixed(digits))
const usd = (n) => (n === null || n === undefined ? '—' : `$${n.toFixed(2)}`)
const pct = (n) => (n === null ? '—' : `${Math.round(n * 100)}%`)

function taskIds() {
  return fs.readdirSync(TASKS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort()
}

function readRuns(task, arm) {
  const dir = path.join(RUNS_DIR, task, `arm${arm}`)
  if (!fs.existsSync(dir)) return { scored: [], pending: [] }
  const runs = fs.readdirSync(dir).filter((d) => /^run-\d+$/.test(d)).sort()
  const scored = []
  const pending = []
  for (const run of runs) {
    const file = path.join(dir, run, 'score.json')
    if (fs.existsSync(file)) scored.push({ run, dir: path.join(dir, run), score: JSON.parse(fs.readFileSync(file, 'utf8')) })
    else pending.push(run)
  }
  return { scored, pending }
}

// The showcase rule: the case study uses the median run, never the best. Runs
// sort by product violations, then cost; with an even count the upper-middle
// (worse) run is taken, so a tie never resolves toward the best one.
function medianRun(scored) {
  const sorted = [...scored].sort((a, b) =>
    a.score.product.violations - b.score.product.violations ||
    (a.score.process.totalCostUsd ?? 0) - (b.score.process.totalCostUsd ?? 0))
  return sorted[Math.ceil((sorted.length - 1) / 2)]
}

function summarise(task, arm, { scored, pending }) {
  const scores = scored.map((r) => r.score)
  const violations = scores.map((s) => s.product.violations)
  const costs = scores.map((s) => s.process.totalCostUsd ?? 0)
  const clean = scores.filter((s) => s.product.clean).length
  const vocab = scores.map((s) => s.system.propVocabulary).filter((v) => v.ran)
  const reviewers = scores.map((s) => s.process.reviewer).filter(Boolean)
  return {
    task,
    arm,
    runs: scores.length,
    pending: pending.length,
    clean,
    cleanRate: scores.length ? clean / scores.length : null,
    meanViolations: mean(violations),
    minViolations: violations.length ? Math.min(...violations) : null,
    maxViolations: violations.length ? Math.max(...violations) : null,
    totalCost: sum(costs),
    meanCost: mean(costs),
    costPerClean: clean ? sum(costs) / clean : null,
    meanTurns: mean(scores.map((s) => s.process.numTurns ?? 0)),
    meanMinutes: mean(scores.map((s) => (s.process.durationMs ?? 0) / 60000)),
    budgetCutoffs: scores.filter((s) => s.process.outcome === 'error_max_budget_usd').length,
    contamination: sum(scores.map((s) => s.process.contaminationFlags)),
    metadataPresent: scores.filter((s) => s.system.metadataPresent).length,
    vocabularyIssues: vocab.length ? mean(vocab.map((v) => v.detail.length)) : null,
    storyInlineStyle: mean(scores.map((s) => s.system.storyInlineStyle.violations)),
    storyVisibleText: mean(scores.map((s) => s.system.storyVisibleText.violations)),
    reviewerFindings: reviewers.length ? mean(reviewers.map((r) => r.total)) : null,
    reviewerHighMedium: reviewers.length ? mean(reviewers.map((r) => (r.bySeverity.high ?? 0) + (r.bySeverity.medium ?? 0))) : null,
    breakdown: breakdown(scores),
    median: scored.length ? medianRun(scored) : null,
  }
}

// Where the product violations came from, summed over a cell's runs.
function breakdown(scores) {
  const counts = {}
  for (const s of scores) {
    for (const [gate, g] of Object.entries(s.product.gates)) if (g.violations) counts[gate] = (counts[gate] ?? 0) + g.violations
    for (const [trap, n] of Object.entries(s.product.trapCounts)) counts[trap] = (counts[trap] ?? 0) + n
  }
  return counts
}

function cleanCell(c) {
  return c.runs ? `${pct(c.cleanRate)} (${c.clean}/${c.runs})` : '—'
}

function violationsCell(c) {
  if (!c.runs) return '—'
  return c.minViolations === c.maxViolations ? fmt(c.meanViolations) : `${fmt(c.meanViolations)} (${c.minViolations}–${c.maxViolations})`
}

function costPerCleanCell(c) {
  if (!c.runs) return '—'
  return c.clean ? usd(c.costPerClean) : `— (0 clean, ${usd(c.totalCost)} spent)`
}

function headlineTable(cells) {
  const rows = [
    '| Task | Arm | Runs | Clean rate | Mean violations (min–max) | Cost per clean component | Mean cost / run | Mean turns | Mean minutes |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|',
  ]
  for (const c of cells) {
    const runs = c.pending ? `${c.runs} (+${c.pending} pending)` : `${c.runs}`
    rows.push(`| ${c.task} | ${c.arm} · ${ARM_NAMES[c.arm]} | ${runs} | ${cleanCell(c)} | ${violationsCell(c)} | ${costPerCleanCell(c)} | ${usd(c.meanCost)} | ${fmt(c.meanTurns, 0)} | ${fmt(c.meanMinutes)} |`)
  }
  return rows.join('\n')
}

// All tasks pooled per arm. Arm 1 vs Arm 2 is the loop-vs-context split: what the
// agent knows against the loop that checks it.
function pooledTable(cells) {
  const rows = [
    '| Arm | Runs | Clean rate | Mean violations | Cost per clean component | Total cost |',
    '|---|---:|---:|---:|---:|---:|',
  ]
  for (const arm of ARMS) {
    const armCells = cells.filter((c) => c.arm === arm && c.runs)
    const runs = sum(armCells.map((c) => c.runs))
    if (!runs) {
      rows.push(`| ${arm} · ${ARM_NAMES[arm]} | 0 | — | — | — | — |`)
      continue
    }
    const clean = sum(armCells.map((c) => c.clean))
    const total = sum(armCells.map((c) => c.totalCost))
    const meanViolations = sum(armCells.map((c) => c.meanViolations * c.runs)) / runs
    rows.push(`| ${arm} · ${ARM_NAMES[arm]} | ${runs} | ${pct(clean / runs)} (${clean}/${runs}) | ${fmt(meanViolations)} | ${clean ? usd(total / clean) : `— (0 clean)`} | ${usd(total)} |`)
  }
  return rows.join('\n')
}

function breakdownTable(cells) {
  const keys = [...new Set(cells.flatMap((c) => Object.keys(c.breakdown)))].sort()
  if (!keys.length) return '_No product violations in any scored run._'
  const rows = [`| Task | Arm | ${keys.join(' | ')} |`, `|---|---|${keys.map(() => '---:').join('|')}|`]
  for (const c of cells.filter((c) => c.runs)) rows.push(`| ${c.task} | ${c.arm} | ${keys.map((k) => c.breakdown[k] ?? 0).join(' | ')} |`)
  return rows.join('\n')
}

function systemTable(cells) {
  const rows = [
    '| Task | Arm | Metadata written | Prop-vocabulary issues (mean) | Story inline styles (mean) | Story raw text (mean) | Reviewer findings (mean, high+medium) | Budget cut-offs | Contamination flags |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|',
  ]
  for (const c of cells.filter((c) => c.runs)) {
    const reviewer = c.reviewerFindings === null ? '—' : `${fmt(c.reviewerFindings)} (${fmt(c.reviewerHighMedium)})`
    rows.push(`| ${c.task} | ${c.arm} | ${c.metadataPresent}/${c.runs} | ${fmt(c.vocabularyIssues)} | ${fmt(c.storyInlineStyle)} | ${fmt(c.storyVisibleText)} | ${reviewer} | ${c.budgetCutoffs} | ${c.contamination} |`)
  }
  return rows.join('\n')
}

function medianList(cells) {
  return cells
    .filter((c) => c.median)
    .map((c) => `- ${c.task} · arm ${c.arm}: ${c.median.run} (${c.median.score.product.violations} violations, ${usd(c.median.score.process.totalCostUsd)})${smoke ? '' : ` → \`results/${c.task}/arm${c.arm}/\``}`)
    .join('\n')
}

const RATING_LABELS = { matches: 'matches', minor: 'minor drift', wrong: 'wrong' }

function visualSection() {
  const file = path.join(MEDIAN_DIR, 'visual-rating.json')
  if (smoke || !fs.existsSync(file)) return ''
  const v = JSON.parse(fs.readFileSync(file, 'utf8'))
  const tasks = Object.keys(v.tasks).sort()
  const rows = [`| Arm | ${tasks.join(' | ')} |`, `|---|${tasks.map(() => '---').join('|')}|`]
  for (const arm of ARMS) {
    rows.push(`| ${arm} · ${ARM_NAMES[arm]} | ${tasks.map((t) => {
      const r = v.tasks[t][arm]
      return r ? `${RATING_LABELS[r.rating]}${r.note ? `: ${r.note}` : ''}` : '—'
    }).join(' | ')} |`)
  }
  return `
## Visual match (human calibration, never in the headline)

${v.method} Rated by the ${v.rater} on ${v.ratedAt}. Source: \`results/visual-rating.json\`.

${rows.join('\n')}
`
}

function copyMedians(cells) {
  for (const c of cells.filter((c) => c.median)) {
    const dest = path.join(MEDIAN_DIR, c.task, `arm${c.arm}`)
    fs.rmSync(dest, { recursive: true, force: true })
    fs.mkdirSync(dest, { recursive: true })
    const output = path.join(c.median.dir, 'output')
    if (fs.existsSync(output)) fs.cpSync(output, dest, { recursive: true })
    fs.copyFileSync(path.join(c.median.dir, 'score.json'), path.join(dest, 'score.json'))
    fs.writeFileSync(path.join(dest, 'MEDIAN.txt'), `${c.median.run} of ${c.runs} scored runs\n`)
  }
}

function main() {
  const cells = taskIds().flatMap((task) => ARMS.map((arm) => summarise(task, arm, readRuns(task, arm))))
  const scored = cells.filter((c) => c.runs)
  const models = [...new Set(scored.flatMap((c) => readRuns(c.task, c.arm).scored.map((r) => r.score.model)))]
  const underRun = scored.filter((c) => c.runs < PRE_REGISTERED_RUNS)

  const md = `# Harness-ablation results${smoke ? ' (SMOKE — plumbing check, not a result)' : ''}

Generated: ${new Date().toISOString()} · ${sum(scored.map((c) => c.runs))} scored run(s) · model${models.length === 1 ? '' : 's'}: ${models.join(', ') || '—'}

Arm 0 = bare repo (no CLAUDE.md, .claude/, ADRs or metadata). Arm 1 = context only (no commands, agents or skills). Arm 2 = full harness (\`/add-component <Name> --eval\`). Scope, arms and scoring: \`.claude/handoff/2026-10-07-harness-ablation-eval.handoff.md\`.

A run is **clean** when it has zero product-quality violations: typecheck, lint, the axe sweep over every story, missing deliverables, the pattern-accuracy traps (on an arm's own stories file, \`off-scale-inline-style\` and \`raw-visible-text\` count as system compliance instead), \`unknown-token\`, \`invented-import\` and the brief checklist. **Cost per clean component** = an arm's total cost ÷ its clean runs.
${models.length > 1 ? '\n> ⚠ More than one model across scored runs. Arms are comparable only on one model.\n' : ''}${underRun.length ? `\n> N = ${PRE_REGISTERED_RUNS} runs per task × arm is pre-registered; ${underRun.length} cell(s) have fewer. A cell with N = 1 is a pilot, not a result.\n` : ''}
> **Honest-outcome rule** (handoff, Pre-registration): if Arm 2 doesn't beat Arm 1 by a meaningful margin, report that and question whether the loop and the reviewer earn their cost. Don't tune briefs or traps after seeing results.

## Product quality (headline)

${headlineTable(cells)}

## All tasks, per arm

Arm 1 vs Arm 2 separates what the agent knows from the loop that checks it.

${pooledTable(cells)}

## Where the product violations came from

Summed over each cell's runs.

${breakdownTable(cells)}

## System compliance and process (secondary, never in the headline)

Arm 0 was never shown the metadata schema or the prop vocabulary, so these columns describe what the system additionally demands, not product quality.

${systemTable(cells)}

## Median runs

The case-study figure uses each cell's median run, never the best (sorted by violations, then cost; an even count takes the worse middle run).

${medianList(cells) || '_None yet._'}
${visualSection()}`
  fs.writeFileSync(RESULTS_MD, md)
  if (!smoke) copyMedians(cells)
  console.log(`Wrote ${path.relative(process.cwd(), RESULTS_MD)} (${scored.length} cell(s) with scored runs)`)
}

main()
