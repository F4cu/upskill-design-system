// Governance decision eval (.claude/handoff/archive/2026-10-08-governance-decision-eval.handoff.md).
// A `decision` task asks for a JSON decision record — reuse, compose, extend,
// parts, internal, new or escalate — instead of component files, and is scored
// against a locked reference answer. Single-shot, like the component tasks:
// it measures whether the context is enough to decide, not a loop.
//
// Arms: A = brief + CLAUDE.md component scope + ADR text; B = A + candidate
// metadata; C = B + candidate specs (ADR-027). Historical tasks read the
// decided component's metadata from git as it was before the decision
// (`metadataAsOf`), and never get that component's spec, which postdates it.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import { publicComponents } from '../lib.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
export const DECISION_TASKS_DIR = path.join(__dirname, 'tasks', 'decision')
const RUNS_DIR = path.join(__dirname, '.runs')
const RESULTS = path.join(__dirname, 'results-decision.md')
const ADR_DIR = path.join(ROOT, 'docs/decisions')
const COMPONENTS_REL = 'packages/components/src/components'
const PRE_REGISTERED_RUNS = 3

export const DECISIONS = ['reuse', 'compose', 'extend-prop', 'extend-variant', 'parts', 'internal', 'new', 'escalate']
const TARGET_REQUIRED = new Set(['reuse', 'extend-prop', 'extend-variant', 'parts', 'internal'])

export function decisionTaskIds() {
  if (!fs.existsSync(DECISION_TASKS_DIR)) return []
  return fs.readdirSync(DECISION_TASKS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort()
}

function scopeSection(task) {
  const claude = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8')
  let scope = claude.slice(claude.indexOf('### Component scope'), claude.indexOf('## Architectural decisions')).trim()
  for (const pattern of task.redact?.scope ?? []) scope = scope.replace(new RegExp(pattern, 'g'), '')
  for (const name of task.excludeComponents ?? []) scope = scope.replace(new RegExp(`\`${name}\`(, )?`, 'g'), '')
  return scope
}

function adrText(number, task) {
  const file = fs.readdirSync(ADR_DIR).find((f) => f.startsWith(`${number}-`))
  const patterns = (task.redact?.adr ?? []).map((p) => new RegExp(p))
  return fs.readFileSync(path.join(ADR_DIR, file), 'utf8')
    .split('\n')
    .filter((line) => !patterns.some((p) => p.test(line)))
    .join('\n')
    .trim()
}

function candidates(task) {
  return task.contextMetadata.filter((name) => !(task.excludeComponents ?? []).includes(name))
}

function metadataFor(name, task) {
  const rel = `${COMPONENTS_REL}/${name}/${name}.metadata.json`
  const commit = task.metadataAsOf?.[name]
  if (commit) return execFileSync('git', ['show', `${commit}:${rel}`], { cwd: ROOT, encoding: 'utf8' })
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

function specFor(name, task) {
  if (task.metadataAsOf?.[name]) return null
  const file = path.join(ROOT, COMPONENTS_REL, name, `${name}.spec.json`)
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
}

export function decisionArms(task) {
  return candidates(task).some((name) => specFor(name, task)) ? ['A', 'B', 'C'] : ['A', 'B']
}

export function buildDecisionPrompt(task, arm) {
  const sections = [
    'You are the governance reviewer for the UpSkill Design System (React + TypeScript, CSS Modules, design tokens). A new requirement has arrived. Decide how the design system should meet it. Do not write code.',
    '',
    'REQUIREMENT:',
    task.brief,
    '',
    'CONTEXT — component scope (from the project instructions):',
    scopeSection(task),
    '',
    'CONTEXT — architectural decision records:',
  ]
  for (const number of task.contextAdrs) sections.push('', `--- ADR-${number} ---`, adrText(number, task))

  if (arm === 'B' || arm === 'C') {
    sections.push('', 'CONTEXT — component metadata (JSON), one block per component:')
    for (const name of candidates(task)) sections.push('', `--- ${name}.metadata.json ---`, metadataFor(name, task).trim())
  }
  if (arm === 'C') {
    sections.push('', 'CONTEXT — component specs (JSON, ADR-027), for the components that have one:')
    for (const name of candidates(task)) {
      const spec = specFor(name, task)
      if (spec) sections.push('', `--- ${name}.spec.json ---`, spec.trim())
    }
  }

  sections.push(
    '',
    'DECISION LABELS — pick exactly one:',
    '- reuse: an existing library component already covers the requirement as it is. target = that component.',
    '- compose: build it in the page from existing library components (and hooks); no library change. target = the main component used, or null.',
    '- extend-prop: add a prop to an existing component. target = that component.',
    '- extend-variant: add a value to an existing variant axis of a component. target = that component.',
    '- parts: give an existing component named parts (Parent.Part). target = that component.',
    '- internal: a styled element inside one parent component\'s own CSS Module, not a library component. target = the parent.',
    '- new: a new library component within the approved scope. target = null.',
    '- escalate: the requirement needs a scope or interaction-model decision by the developer before anything is built. target = null.',
    '',
    'OUTPUT FORMAT — emit ONLY one fenced ```json block, no prose before or after, matching:',
    '{',
    '  "decision": "<one label>",',
    '  "target": "<component name or null>",',
    '  "candidates": [{ "name": "<existing component you considered>", "verdict": "use | extend | reject", "reason": "<one sentence>" }],',
    '  "proposedApi": "<prop, variant value, part, hook or component names you would add; empty string if none>",',
    '  "citations": ["<ADR-NNN or <Name>.metadata.json#path that decided it>"]',
    '}',
  )
  return sections.join('\n')
}

function parseRecord(response) {
  const fenced = response.match(/```(?:json)?\s*\n([\s\S]*?)\n```/)
  const raw = fenced ? fenced[1] : response.slice(response.indexOf('{'), response.lastIndexOf('}') + 1)
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function citationMatches(accepted, cited) {
  const adr = accepted.match(/^ADR-0*(\d+)$/)
  if (adr) return cited.some((c) => new RegExp(`ADR[- ]?0*${adr[1]}\\b`, 'i').test(c))
  if (accepted.startsWith('CLAUDE.md')) return cited.some((c) => /CLAUDE\.md|component scope/i.test(c))
  return cited.some((c) => c.includes(accepted))
}

// Secondary checks never change `correct`; they are reported beside it.
export function scoreDecision(scratchDir, task) {
  const response = fs.readFileSync(path.join(scratchDir, 'response.md'), 'utf8')
  const record = parseRecord(response)
  if (!record) {
    return { kind: 'decision', task: task.id, parsed: false, correct: false, decision: null, target: null, secondary: { unparseable: 1 } }
  }
  fs.writeFileSync(path.join(scratchDir, 'decision.json'), JSON.stringify(record, null, 2) + '\n')

  const decision = record.decision ?? null
  const target = record.target ?? null
  const labelOk = decision === task.referenceDecision
  const targetOk = !TARGET_REQUIRED.has(task.referenceDecision) || target === task.referenceTarget
  const considered = new Set((record.candidates ?? []).map((c) => c.name))
  const cited = (record.citations ?? []).map(String)
  const known = publicComponents()
  const named = [target, ...considered].filter(Boolean)
  const hallucinated = named.filter((n) => !known.has(n) && !(decision === 'new' || decision === 'escalate'))
  const patternMisses = (task.recordPatterns ?? [])
    .filter((p) => !new RegExp(p.pattern).test(String(record[p.path] ?? '')))
    .map((p) => p.reason)

  return {
    kind: 'decision',
    task: task.id,
    parsed: true,
    correct: labelOk && targetOk,
    decision,
    target,
    labelOk,
    targetOk,
    secondary: {
      missingCandidates: task.requiredCandidates.filter((n) => !considered.has(n)),
      citationHit: task.acceptedCitations.some((a) => citationMatches(a, cited)),
      hallucinatedNames: hallucinated,
      recordPatternMisses: patternMisses,
    },
  }
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

const mode = (values) => {
  const counts = new Map()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v ?? 'unparsed'} ×${n}`).join(', ')
}

export function writeDecisionReport() {
  const ids = decisionTaskIds()
  const tasks = Object.fromEntries(ids.map((id) => [id, JSON.parse(fs.readFileSync(path.join(DECISION_TASKS_DIR, `${id}.json`), 'utf8'))]))
  const rows = []
  for (const id of ids) {
    for (const arm of ['A', 'B', 'C']) {
      const scores = readScores(id, arm)
      if (!scores.length) continue
      const correct = scores.filter((s) => s.correct).length
      rows.push({
        id,
        arm,
        runs: scores.length,
        correct,
        majority: correct * 2 > scores.length,
        decisions: mode(scores.map((s) => (s.decision ? `${s.decision}${s.target ? `(${s.target})` : ''}` : null))),
        citations: scores.filter((s) => s.secondary?.citationHit).length,
        missing: scores.reduce((n, s) => n + (s.secondary?.missingCandidates?.length ?? 0), 0),
        hallucinated: scores.reduce((n, s) => n + (s.secondary?.hallucinatedNames?.length ?? 0), 0),
        patternMisses: scores.reduce((n, s) => n + (s.secondary?.recordPatternMisses?.length ?? 0), 0),
        promptChars: scores[0].promptChars ?? null,
      })
    }
  }
  const row = (id, arm) => rows.find((r) => r.id === id && r.arm === arm)

  const lines = [
    '# Governance decision eval results',
    '',
    `Generated: ${new Date().toISOString()} — ${new Set(rows.map((r) => r.id)).size} of ${ids.length} tasks scored.`,
    '',
    'Arm A = brief + CLAUDE.md component scope + ADR text (redacted per task). Arm B = A + candidate metadata (pre-decision from git for historical tasks). Arm C = B + candidate specs (ADR-027).',
    'Headline: the decision label (and target, where the reference names one) matches the locked reference. A task passes in an arm when most of its runs are correct.',
    'Secondary, never in the headline: citation hits, required candidates missed, hallucinated component names, recordPattern misses.',
    '',
    '> **Honest-outcome rule** (handoff, pre-registered): don\'t tune briefs, reference answers or the scorer after seeing results.',
    '',
    '| Task | Reference | Arm | Runs | Correct | Decisions | Cited | Missed candidates | Hallucinated | Pattern misses | Prompt chars |',
    '|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|',
  ]
  for (const r of rows) {
    const t = tasks[r.id]
    const ref = `${t.referenceDecision}${t.referenceTarget ? `(${t.referenceTarget})` : ''}`
    lines.push(`| ${r.id} | ${ref} | ${r.arm} | ${r.runs} | ${r.correct}/${r.runs} | ${r.decisions} | ${r.citations}/${r.runs} | ${r.missing} | ${r.hallucinated} | ${r.patternMisses} | ${r.promptChars ?? '—'} |`)
  }

  lines.push('', '## Pass rate per arm', '')
  for (const arm of ['A', 'B', 'C']) {
    const armRows = rows.filter((r) => r.arm === arm)
    if (!armRows.length) continue
    lines.push(`- Arm ${arm}: **${armRows.filter((r) => r.majority).length}/${armRows.length}** tasks pass (${armRows.reduce((n, r) => n + r.correct, 0)}/${armRows.reduce((n, r) => n + r.runs, 0)} runs correct).`)
  }

  const both = ids.filter((id) => row(id, 'A') && row(id, 'B'))
  lines.push('', '## What the result decides (A vs B)', '')
  if (!both.length) {
    lines.push('No task scored in both arms yet.')
  } else {
    const failsBoth = both.filter((id) => !row(id, 'A').majority && !row(id, 'B').majority)
    const fixedByB = both.filter((id) => !row(id, 'A').majority && row(id, 'B').majority)
    const brokenByB = both.filter((id) => row(id, 'A').majority && !row(id, 'B').majority)
    lines.push(`- **Thin semantics** (fails in A and B; the missing field is in the failing runs' records): ${failsBoth.join(', ') || 'none'}`)
    lines.push(`- **Metadata earns it** (fails in A, passes in B): ${fixedByB.join(', ') || 'none'}`)
    lines.push(`- **Metadata hurts** (passes in A, fails in B): ${brokenByB.join(', ') || 'none'}`)
    const complete = both.length === ids.length &&
      both.every((id) => row(id, 'A').runs >= PRE_REGISTERED_RUNS && row(id, 'B').runs >= PRE_REGISTERED_RUNS)
    if (!complete) lines.push('', `_Incomplete: the pre-registration needs all ${ids.length} tasks with ≥ ${PRE_REGISTERED_RUNS} runs in arms A and B. Read nothing into a partial table._`)
  }

  fs.writeFileSync(RESULTS, lines.join('\n') + '\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeDecisionReport()
  console.log(`Wrote ${RESULTS}`)
}
