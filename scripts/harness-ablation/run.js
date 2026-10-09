#!/usr/bin/env node
// Runs the harness-ablation eval: for each task × arm × run, prepare.js builds a
// fresh workspace, `claude -p` runs in it agentically, the outputs are collected
// into .runs/, and score.js scores them (once it exists). Sequential, never
// parallel (CLAUDE.md on-demand loop guardrails). Scope and arms:
// .claude/handoff/archive/2026-10-07-harness-ablation-eval.handoff.md.
//
//   node scripts/harness-ablation/run.js --model <id> --max-budget-usd <n>
//     [--task badge,checkbox] [--arm 0,1,1b,2] [--runs 3] [--effort <level>] [--dry-run] [--smoke]
//
// --smoke is for checking the plumbing on a cheap model: it allows a missing
// reference.png and writes under .runs/_smoke/, never next to real results.
//
// Resumable at two points: a run with result.json skips the agent, and one with
// score.json is skipped entirely, so the full run can be spread across usage
// windows. A run that ends on a usage/rate limit is not a result: it is recorded
// as incomplete.json and the loop stops, to resume in the next window.

import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TASKS_DIR = path.join(__dirname, 'tasks')
const RUNS_DIR = path.join(__dirname, '.runs')
const SCORE_SCRIPT = path.join(__dirname, 'score.js')
const WORKSPACES_DIR = path.join(os.tmpdir(), 'upskill-ablation')
const ARMS = ['0', '1', '1b', '2']

// Same for every arm, so the only difference between arms is the workspace and
// (Arm 2) the slash command. No MCP (Figma comes from reference.png), no user
// settings or plugins, no web access (the repo is on GitHub).
const ISOLATION_FLAGS = [
  '--output-format', 'stream-json',
  '--verbose',
  '--setting-sources', 'project',
  '--strict-mcp-config',
  '--mcp-config', '{"mcpServers":{}}',
  '--permission-mode', 'bypassPermissions',
  '--disallowedTools', 'WebFetch', 'WebSearch',
  '--no-session-persistence',
]

// Env vars that would silently move the main or subagent model off --model.
const MODEL_ENV = ['ANTHROPIC_MODEL', 'CLAUDE_CODE_SUBAGENT_MODEL', 'ANTHROPIC_SMALL_FAST_MODEL']

// Launched from inside a Claude Code session, the parent's CLAUDE* vars (effort,
// session id, nested-session flags) would leak into every run. Only auth and the
// config dir survive, so a run behaves the same wherever run.js is started.
const KEEP_CLAUDE_ENV = new Set(['CLAUDE_CODE_OAUTH_TOKEN', 'CLAUDE_CONFIG_DIR'])

const LIMIT_RE = /usage limit|rate limit|rate_limit|overloaded|quota/i
const NETWORK_RE = /\b(curl|wget|gh\s|git\s+(clone|fetch|pull|remote))|github\.com/i
// Arms poll their own local Storybook (curl localhost:<port>) to look at their
// work; that stays on the machine, so it isn't a network attempt.
const LOCAL_FETCH_RE = /\b(curl|wget)\b[^|;&\n]*?(localhost|127\.0\.0\.1)[^\s|;&]*/g

export function isNetworkShaped(input) {
  return NETWORK_RE.test(JSON.stringify(input).replace(LOCAL_FETCH_RE, ''))
}

function usage(msg) {
  if (msg) console.error(msg)
  console.error('Usage: node scripts/harness-ablation/run.js --model <id> --max-budget-usd <n> [--task a,b] [--arm 0,1,1b,2] [--runs N] [--effort <level>] [--dry-run] [--smoke]')
  process.exit(1)
}

function parseArgs(argv) {
  const args = { task: null, arm: ARMS, runs: 1, model: null, maxBudgetUsd: null, effort: null, dryRun: false, smoke: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--task') args.task = argv[++i].split(',')
    else if (a === '--arm') args.arm = argv[++i].split(',')
    else if (a === '--runs') args.runs = Number(argv[++i])
    else if (a === '--model') args.model = argv[++i]
    else if (a === '--max-budget-usd') args.maxBudgetUsd = argv[++i]
    else if (a === '--effort') args.effort = argv[++i]
    else if (a === '--dry-run') args.dryRun = true
    else if (a === '--smoke') args.smoke = true
    else usage(`Unknown argument: ${a}`)
  }
  if (!args.model) usage('--model is required: every run in the eval must use the same, explicit model.')
  if (!args.maxBudgetUsd) usage('--max-budget-usd is required.')
  if (!Number.isInteger(args.runs) || args.runs < 1) usage('--runs must be a positive integer.')
  for (const arm of args.arm) if (!ARMS.includes(arm)) usage(`Unknown arm: ${arm}`)
  return args
}

function taskIds(requested) {
  const all = fs.readdirSync(TASKS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
  for (const id of requested ?? []) if (!all.includes(id)) usage(`Unknown task: ${id}`)
  return requested ?? all
}

function loadTask(id) {
  const task = JSON.parse(fs.readFileSync(path.join(TASKS_DIR, `${id}.json`), 'utf8'))
  const briefPath = path.join(TASKS_DIR, `${id}.brief.md`)
  if (!fs.existsSync(briefPath)) usage(`Missing ${path.relative(process.cwd(), briefPath)}: the brief is pre-registered and shared by every arm.`)
  return { ...task, brief: fs.readFileSync(briefPath, 'utf8') }
}

function promptFor(task, arm) {
  return arm === '2' ? `/add-component ${task.target} --eval\n\n${task.brief}` : task.brief
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n')
}

function prepare(task, arm, ws, runDir, smoke) {
  const flags = smoke ? ['--allow-missing-reference'] : []
  const res = spawnSync('node', [path.join(__dirname, 'prepare.js'), task.id, arm, '--out', ws, ...flags], { encoding: 'utf8' })
  if (res.status !== 0) throw new Error(`prepare.js failed for ${task.id} arm ${arm}:\n${res.stderr}`)
  const info = JSON.parse(res.stdout)
  writeJson(path.join(runDir, 'prepare.json'), info)
  fs.copyFileSync(info.leakReport, path.join(runDir, 'leak-report.txt'))
  return info
}

function runAgent(prompt, ws, runDir, args) {
  const flags = ['-p', prompt, '--model', args.model, '--max-budget-usd', args.maxBudgetUsd, ...ISOLATION_FLAGS]
  if (args.effort) flags.push('--effort', args.effort)
  const env = { ...process.env }
  for (const key of MODEL_ENV) delete env[key]
  for (const key of Object.keys(env)) if (/^CLAUDE/.test(key) && !KEEP_CLAUDE_ENV.has(key)) delete env[key]

  const transcriptPath = path.join(runDir, 'transcript.jsonl')
  const out = fs.openSync(transcriptPath, 'w')
  const err = fs.openSync(path.join(runDir, 'stderr.txt'), 'w')
  const res = spawnSync('claude', flags, { cwd: ws, env, stdio: ['ignore', out, err] })
  fs.closeSync(out)
  fs.closeSync(err)
  return { exitCode: res.status, events: readEvents(transcriptPath) }
}

export function readEvents(p) {
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)] } catch { return [] }
  })
}

export function toolUses(events) {
  return events
    .filter((e) => e.type === 'assistant')
    .flatMap((e) => e.message?.content ?? [])
    .filter((c) => c.type === 'tool_use')
}

// Tier 1 files the session read itself. Arm 1 also gets them loaded by path, which
// no tool call shows; Arm 1b only ever has them through a read like this.
export function tier1Reads(uses) {
  const TIER1_RE = /packages\/(components|tokens)\/AGENTS\.md/
  return [...new Set(uses
    .filter((u) => TIER1_RE.test(u.name === 'Bash' ? u.input?.command ?? '' : u.input?.file_path ?? ''))
    .map((u) => (u.name === 'Bash' ? u.input.command : u.input.file_path).match(TIER1_RE)[0]))]
}

// What the pilot's transcript review checks first: did anything outside the arm's
// workspace reach the session, and did the session try to reach out.
export function contamination(init, result, uses, model) {
  const flags = []
  if (init?.mcp_servers?.length) flags.push(`mcp servers loaded: ${init.mcp_servers.map((s) => s.name).join(', ')}`)
  const plugins = (init?.plugins ?? []).filter((p) => p.path !== 'builtin')
  if (plugins.length) flags.push(`non-builtin plugins loaded: ${plugins.map((p) => p.name).join(', ')}`)
  if (init && init.model !== model && !init.model.includes(model)) flags.push(`main model ${init.model} ≠ requested ${model}`)
  const models = Object.keys(result?.modelUsage ?? {})
  const others = models.filter((m) => m !== init?.model)
  if (others.length) flags.push(`other models used: ${others.join(', ')}`)
  const network = uses.filter((u) => isNetworkShaped(u.input))
  for (const u of network) flags.push(`network-shaped ${u.name}: ${JSON.stringify(u.input).slice(0, 200)}`)
  const gitArchaeology = uses.filter((u) => u.name === 'Bash' && /git\s+(log|show|reflog|fsck|cat-file|rev-list)/.test(u.input?.command ?? ''))
  for (const u of gitArchaeology) flags.push(`git archaeology: ${u.input.command.slice(0, 200)}`)
  return flags
}

function summarize(task, arm, runIndex, args, ws, agent) {
  const init = agent.events.find((e) => e.type === 'system' && e.subtype === 'init')
  const result = agent.events.find((e) => e.type === 'result')
  const uses = toolUses(agent.events)
  return {
    task: task.id,
    target: task.target,
    arm,
    run: runIndex,
    workspace: ws,
    requestedModel: args.model,
    effort: args.effort,
    maxBudgetUsd: Number(args.maxBudgetUsd),
    smoke: args.smoke,
    exitCode: agent.exitCode,
    model: init?.model ?? null,
    claudeCodeVersion: init?.claude_code_version ?? null,
    modelUsage: result?.modelUsage ?? null,
    outcome: result?.subtype ?? null,
    isError: result?.is_error ?? null,
    terminalReason: result?.terminal_reason ?? null,
    totalCostUsd: result?.total_cost_usd ?? null,
    numTurns: result?.num_turns ?? null,
    durationMs: result?.duration_ms ?? null,
    usage: result?.usage ?? null,
    subagents: result?.subagent_stats ?? null,
    toolCalls: uses.length,
    tier1Reads: tier1Reads(uses),
    init: init && {
      tools: init.tools,
      agents: init.agents,
      skills: init.skills,
      plugins: init.plugins,
      mcpServers: init.mcp_servers,
      memoryPaths: init.memory_paths,
    },
    contamination: contamination(init, result, uses, args.model),
    finalMessage: result?.result ?? null,
  }
}

// A run that hit a usage/rate limit (or died before a result event) measured the
// window, not the arm, so it is retried rather than scored.
function hitLimit(agent, runDir) {
  const result = agent.events.find((e) => e.type === 'result')
  if (!result) return 'no result event'
  if (result.api_error_status) return `api error ${result.api_error_status}`
  const stderr = fs.readFileSync(path.join(runDir, 'stderr.txt'), 'utf8')
  if (result.is_error && LIMIT_RE.test(`${result.result ?? ''} ${stderr}`)) return 'usage or rate limit'
  return null
}

function collectOutputs(task, ws, runDir) {
  const out = path.join(runDir, 'output')
  fs.rmSync(out, { recursive: true, force: true })
  fs.mkdirSync(out, { recursive: true })
  for (const rel of task.tokenFiles ?? []) fs.copyFileSync(path.join(ws, rel), path.join(out, path.basename(rel)))
  const componentDir = path.join(ws, 'packages/components/src/components', task.target)
  if (task.kind !== 'tokens' && fs.existsSync(componentDir)) fs.cpSync(componentDir, path.join(out, task.target), { recursive: true })
  const extras = ['api-proposal.md', `.claude/handoff/runs/${task.target}.review.json`, `.claude/handoff/runs/${task.target}.run.json`]
  for (const rel of extras) {
    const src = path.join(ws, rel)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, path.basename(rel)))
  }
  spawnSync('git', ['add', '-A', '--intent-to-add'], { cwd: ws })
  const diff = spawnSync('git', ['diff', 'HEAD'], { cwd: ws, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  fs.writeFileSync(path.join(out, 'diff.patch'), diff.stdout)
}

function score(runDir) {
  if (!fs.existsSync(SCORE_SCRIPT)) {
    console.log('    score.js not built yet; workspace kept for scoring later')
    return
  }
  const res = spawnSync('node', [SCORE_SCRIPT, runDir], { stdio: 'inherit' })
  if (res.status !== 0) throw new Error(`score.js failed for ${runDir}`)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const tasks = taskIds(args.task).map(loadTask)
  fs.mkdirSync(WORKSPACES_DIR, { recursive: true })

  for (const task of tasks) {
    for (const arm of args.arm) {
      for (let k = 1; k <= args.runs; k++) {
        const label = `${task.id} arm ${arm} run ${k}`
        const runDir = path.join(RUNS_DIR, args.smoke ? '_smoke' : '', task.id, `arm${arm}`, `run-${k}`)
        if (fs.existsSync(path.join(runDir, 'score.json'))) {
          console.log(`skip  ${label} (scored)`)
          continue
        }
        fs.mkdirSync(runDir, { recursive: true })

        if (!fs.existsSync(path.join(runDir, 'result.json'))) {
          // A fresh path per attempt: auto-memory is keyed by project path, so a
          // reused path could load memory written by an interrupted attempt.
          const ws = path.join(WORKSPACES_DIR, `${task.id}-arm${arm}-run${k}-${Date.now()}`)
          console.log(`prep  ${label} → ${ws}`)
          prepare(task, arm, ws, runDir, args.smoke)
          if (args.dryRun) {
            console.log(`dry   claude -p ${JSON.stringify(promptFor(task, arm).slice(0, 60))}… --model ${args.model} --max-budget-usd ${args.maxBudgetUsd} ${ISOLATION_FLAGS.join(' ')}`)
            continue
          }

          console.log(`run   ${label}`)
          const agent = runAgent(promptFor(task, arm), ws, runDir, args)
          const limit = hitLimit(agent, runDir)
          if (limit) {
            writeJson(path.join(runDir, 'incomplete.json'), { reason: limit, workspace: ws, at: new Date().toISOString() })
            console.log(`stop  ${label}: ${limit}. Re-run the same command to resume from here.`)
            process.exit(2)
          }
          fs.rmSync(path.join(runDir, 'incomplete.json'), { force: true })
          collectOutputs(task, ws, runDir)
          const summary = summarize(task, arm, k, args, ws, agent)
          writeJson(path.join(runDir, 'result.json'), summary)
          const flags = summary.contamination.length ? ` ⚠ ${summary.contamination.length} contamination flag(s)` : ''
          console.log(`done  ${label}: ${summary.outcome}, $${summary.totalCostUsd?.toFixed(2)}, ${summary.numTurns} turns${flags}`)
        }

        score(runDir)
      }
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
