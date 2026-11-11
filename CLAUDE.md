# UpSkill Design System

@AGENTS.md

`AGENTS.md` (imported above) holds the tool-agnostic invariants: tokens, Figma vocabulary, component scope, layout grammar, code conventions. This file holds only what Claude sessions need on top: knowledge routing, frozen snapshots, MCP policy, git workflow, commands, agentic moments.

## Project purpose

**Lite agentic** means economic maintenance: recurring automation is scripts + GitHub Actions with direct REST calls; MCP servers are for one-off interactive tasks only; agent involvement is limited to nine defined moments (see "Agentic moments"). See `ROADMAP.md` for phase and integration status.

## Where knowledge lives (read before adding to this file)

This file loads into every session, and so does `AGENTS.md`. Budgets, enforced by `npm run claudemd:check` in CI (ADR-017): this file **≤200 lines and ≤20KB**, `AGENTS.md` **≤8KB**, both together **≤24KB**, and no line duplicated across the two. Before adding anything to either, route it to the narrowest surface that is visible when it matters:

| Knowledge | Home |
|---|---|
| Tool-agnostic invariant any coding agent needs | `AGENTS.md` |
| Only matters when touching component code | `packages/components/AGENTS.md` (Tier 1; loaded via sibling `CLAUDE.md` when a file under the package is read) |
| Only matters when touching token source/build | `packages/tokens/AGENTS.md` (Tier 1, same mechanism) |
| A procedure or multi-step workflow | The relevant command in `.claude/commands/` |
| Rationale, history, dated amendments, alternatives | The ADR |
| Human-facing reference or tutorial | `docs/` |
| Something that must happen every single time | A script or CI gate, never prose |

The root files keep only cross-cutting invariants, indexes that point elsewhere, and policies that apply to any session. Litmus test per line: would removing it cause a mistake in *most* sessions? If not, it lives elsewhere. If it would: needed by any coding tool → `AGENTS.md`; needed by Claude sessions only → this file. The same test applies to each rules file against its path scope.

## Figma moments

Token authoring: `/tokens-author`. Before pulling Figma changes into committed tokens, run `/figma-variable-audit` as a drift check. The variable moments (`/figma-variable-audit`, `/figma-variable-push`) exclude representational divergences (running list: the drift memory note `figma-file-variable-drift.md`) and operate on the single default brand (ADR-012, Deferred). Code-first is forced by plan limits: the Variables REST API and Code Connect are Enterprise/Org-only, so the only automatable sync direction is code → Figma, interactive via figma-cli or Figma MCP (ADR-002).

## Frozen-memory snapshots

Moments and loops read the system's status quo from **committed files, never live APIs** — this shields agents from rate limits and keeps each agent's context small. Read-not-call artifacts:

| File | Source | Captured by |
|---|---|---|
| `airtable-governance.json` | Airtable (`status`/`owner`/`successor`/`notes`) | `scripts/airtable-pull.js` (REST) |
| `token-usage.json` | Repo scan (`var(--ds-*)` CSS refs + `{alias}` refs) | `scripts/token-usage.js` |
| `figma-variables.json` | Figma variables (REST API is Enterprise-gated, so captured interactively, not by script) | `/figma-variable-audit` via figma-cli |
| `packages/components/figma-pattern-frames.json` | Figma pattern example frames (ADR-023) | `node scripts/capture-pattern-frames.js` via figma-cli |
| `.claude/component-signoff.json` | Airtable (`Implementation` = human `done`/`todo`) | `scripts/airtable-pull.js` (REST) |
| `.claude/component-review-state.json` | Per-component review completion + `visualReview` records (local `runs/` artifacts merged over the committed baseline — never regressed by CI, ADR-015 amendment) | `scripts/sense.js` (`npm run sense`) |
| `.claude/component-pipeline.json` | Component usage + review state + sign-off | `scripts/sense.js` (`npm run sense`) |
| `.claude/component-patterns.json` | Cross-component pattern aggregate (deterministic AST + usage.json scan) | `scripts/generate-pattern-schema.js` |
| `.claude/STATUS_QUO.md` | Aggregate of the above | `scripts/sense.js` (`npm run sense`) |
| `.claude/pipeline-status.json` | GitHub (CI workflow conclusions on `main` + open issues) | `scripts/pipeline-status.js` (`npm run pipeline:status`, `gh` REST) |

Regenerate `STATUS_QUO.md` with `npm run sense` before a loop run; per-component context is narrowed to `.claude/handoff/runs/<Name>.snapshot.json` by `npm run sense:component <Name>`.

**Component lifecycle has two axes** (ADR-010): **Maturity** (`component.status`, pushed code → Airtable) and **Implementation** (pipeline stage; `done`/`todo` are human-set in Airtable and win over the derived stage; the push never overwrites an Airtable `done`). The two live in separate Airtable columns so a pushed value and a human value never collide.

`component-patterns.json` is consumed by `/layout-generation` **only** — measured improvement there, measured regression in `/component-scaffold`, so never inject it into scaffolds (ADR-013). `components-check.yml` enforces staleness on every PR touching components.

**Handoff artifacts** (ADR-015). Markdown handoffs in `.claude/handoff/` are committed, named `YYYY-MM-DD-slug.handoff.md`, with 3-line frontmatter (`status: active|done|superseded`, `created:`, `completed:`). Per-run component-loop JSON (`<Name>.{snapshot,review,run,learnings}.json`) lives under the gitignored `.claude/handoff/runs/`, regenerable via `npm run sense:component <Name>`. `npm run handoff:tidy` archives `done`/`superseded` handoffs, regenerates `handoff/index.json` (read that index, never glob the directory), and promotes each `<Name>.run.json` into the committed append-only ledger `.claude/handoff/run-ledger.json` — the only place per-run review telemetry survives; read it to judge empirically whether the adversarial-review stage earns its cost.

## MCP tools — when to use vs when to avoid

General rule: MCP calls are for **interactive, one-off tasks with the developer present**. Anything recurring, scheduled, or CI-bound uses a script with direct REST calls. Never put an MCP call inside a GitHub Action or a loop over many records.

| MCP | Use it for | Do NOT use it for |
|---|---|---|
| **Figma** | Design context when scaffolding; fallback for the variable moments when figma-cli can't connect (`/figma-cli`). | Treating Figma as the token source (ADR-002). Bulk-reading many nodes. |
| **Airtable** | One-off schema changes; ad-hoc inspection of a few records when debugging sync. | Token sync (use `scripts/airtable-sync.js`). Reading governance state — read the committed `airtable-governance.json`. Bulk record operations. |
| **GitHub** | Rarely — cross-repo searches the `gh` CLI handles awkwardly. | Everything else; prefer `gh` CLI. |
| **Google Drive / Notion** | Fetching a spec or planning note the user explicitly links. | Anything recurring; a docs target — docs live in Storybook (components) and Airtable (tokens). |

If a task could be done with a committed file, a script, or the `gh` CLI, do it that way even when an MCP tool is available.

## Git workflow

Commit directly to the current branch — do not create new branches unless explicitly asked. This is a solo project. Exceptions (agent-generated output always goes through a PR, never straight to `main`):

- `/review-component` (also inside `/add-component`): branch `component/<kebab-name>`, PR against `main`.
- `/docs-sync`: branch `docs-sync/<YYYY-MM-DD>`, PR.
- `/layout-generation`: branch `layout/<kebab-name>`, PR, reviewed in-session with `/code-review` by default (adversarial subagent opt-in for complete route pages) — ADR-016.

## Commands and skills

`.claude/commands/` — prompt-only slash commands; all agentic moments live here. `.claude/skills/` — slash commands with companion code; only `run-storybook` (ships `driver.mjs`). Note: Claude Code's naming is the inverse of intuition — "skills" are the ones with code, "commands" are the prompts.

## Agentic moments

The only scenarios where invoking Claude with MCP context is worth the cost, all developer-triggered: (1) `/figma-variable-audit`, (2) `/token-deprecation-pass`, (3) `/component-scaffold`, (4) `/layout-generation`, (5) `/figma-variable-push`, (6) `/add-component`, (7) `/review-component`, (8) `/extract-learnings`, (9) `/docs-sync`. Each command file opens with the invariant that must survive, then its inputs, steps and success signal. Everything else is a script or a GitHub Action.

**For existing component reviews:** `/review-component <Name>` for the `full` path (fresh adversarial subagent + learnings loop); `/code-review` on the diff for the `standard` path — no subagent, no handoff file, no learnings step.

**Ad-hoc loops vs continuous loops.** A developer-triggered loop that runs a bounded sequence once and stops (moment 6) is allowed. A *continuous* loop, scheduled agent run, or always-on watcher is not: push back and propose a script, a GitHub Action, or one of these moments instead.

**On-demand loop guardrails** (moment 6 and any future loop):
- **Sequential, ≤2 agents.** Spawn at most one fresh subagent (the adversarial reviewer, risk-triggered). No parallel swarm: on Claude Pro the scarce resource is the rolling usage window; parallel agents drain it N× and trip rate limits.
- **Frozen-file handoffs only.** Each stage reads a committed/cached snapshot — never stream raw data between stages or make live API calls mid-loop.
- **Deterministic work stays a script.** Sensing, validation, typecheck, build are `npm` scripts. Agents only do what a script can't.
- **Fail-fast.** If the gate fails, bounce back to the scaffold stage with the error.
- **No agent code reaches `main` unreviewed.** Deterministic gate + adversarial review before a human PR opens.

## Layout and component scope

Layout invariants live in `AGENTS.md`; the full grammar table lives in `/layout-generation`. The fixed component set in `AGENTS.md` is canonical; `/component-scaffold` and `/layout-generation` defer to it. CSS Modules, implementation rules, state model, prop vocabulary, parts, and the story/metadata/a11y rules: `packages/components/AGENTS.md`. Token JSON conventions: `packages/tokens/AGENTS.md`.

## Architectural decisions (ADRs)

Durable decisions live in `docs/decisions/NNN-kebab-title.md` (template: `000-template.md`). Read the relevant ADR before changing the thing it governs.

**Record one** (as part of the change, not later) for: a change to a contract other code or tooling depends on; a new convention agents must follow to generate or reuse correctly; a reversal or material refinement of an earlier decision; a choice between real alternatives where the reasoning won't be obvious later. **Not** for routine work that follows an existing pattern. Keep the set small.

**How:** new decision → copy the template to the next number, fill Context / Decision / Consequences, `Status: accepted`. Refinement → amend the existing ADR in place (bump `Amended:`, append a dated `## Amendment` section — see ADR-001); reserve a new `superseded by` ADR for a full reversal. The ADR holds the *why*; the *what to do* goes to the narrowest visible surface per "Where knowledge lives" — usually a package `AGENTS.md` or command, CLAUDE.md only when cross-cutting.

## Common tasks

Recurring work is a command or skill: invoke it rather than reproducing its steps, and let its description route you (they are in context every session). This table holds only tasks without one.

| Task | How |
|---|---|
| Add a brand | Checklist in `packages/tokens/AGENTS.md` (ADR-012) |
| Draft a spec for an existing component (backfill, ADR-027) | `npm run spec:generate -- <Name>`, fill every `TODO`, then `npm run tokens:build && npm run spec:validate` |
| In-session review path, no subagent | `/code-review` on the diff + the `AGENTS.md` gates |
| Regenerate the frozen status-quo snapshot | `npm run sense` (or `npm run sense:component <Name>`) |
| Quick terminal read on where things stand | `npm run status`, `npm run status:board`, `npm run status:component -- <Name>` |
| Archive done/superseded handoffs, regenerate index | `npm run handoff:tidy` |
| Run a11y checks | `npm run lint` (Tier 1) · `npm run a11y:coverage && npm run a11y:test` (Tier 2, ADR-008) |
| Add a GitHub Action | Workflow YAML in `.github/workflows/`. Actions call scripts and REST directly — never MCP, never Claude. |
