---
description: Add a new component from the fixed set with built-in verification (sense → scaffold → deterministic gate → review → fix → PR). The adversarial reviewer subagent runs only for interactive components; display components get in-session /code-review. Sequential, at most two agents (ADR-007, ADR-029).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, Agent, SlashCommand, Skill, AskUserQuestion
---

# Add component

**Trigger:** Developer, when building any component from the fixed set that will go to `main`. This is the production path — use it instead of `/component-scaffold` directly. Scaffold alone skips the gate and adversarial review, meaning agent-written code reaches human review unverified.

**Invocation:** `/add-component <Name>` (e.g. `/add-component Accordion`). `--review` forces the adversarial reviewer for a display component; `--no-review` skips it for an interactive one (Stage 3). `/add-component <Name> --eval` runs the unattended harness-ablation variant — see "Eval mode" below; it is valid only inside an ablation workspace.

This is the ad-hoc agentic loop of ADR-007 / ROADMAP Phase 9. It wraps `/component-scaffold` (Stage 1) in a deterministic gate and a review pass, then opens the PR. It is **sequential and uses at most two agents**: the main session orchestrates every stage; for **interactive** components, exactly one fresh subagent runs the adversarial review (Stage 3), because independent context is the whole point of that stage. Display components get the in-session `/code-review` path instead: the harness ablation measured the always-on reviewer at +69% cost per clean component with no change in outcome, and its real catches clustered in interactive components (ADR-029, ADR-007 amendment). **Never** spawn parallel workers — on Claude Pro the scarce resource is the rolling usage window, and a fan-out drains it N× and trips rate limits.

## Binding rules (from ADR-007 — do not violate)

- **Sequential, ≤2 agents.** Main session + at most one reviewer subagent, spawned only on the `full` path (interactive, or `--review`). No parallel agents, ever.
- **Frozen-file handoffs only.** Each stage reads a committed/cached snapshot — `.claude/STATUS_QUO.md`, `.claude/handoff/runs/<Name>.snapshot.json`, `.claude/handoff/runs/<Name>.review.json`. No stage makes its own live API call; no streaming raw data between stages.
- **Deterministic work stays a script.** Sensing, validation, typecheck, build, lint are `npm`/CLI commands, not agent steps. The agent only does what a script can't (scaffold, judge, fix).
- **Fail-fast.** If the gate fails, bounce back to the scaffold stage with the exact error — do not push forward.
- **No agent code reaches `main` unreviewed.** Generated code must clear the gate *and* a review (adversarial subagent or in-session `/code-review`, per Stage 3) before the human PR opens.
- **Fixed set only.** Scaffold nothing outside the component scope declared in CLAUDE.md. Compose existing components instead.

## Stages

### Stage 0 · Sense (script — no AI)
Run `npm run sense:component <Name>`. This writes `.claude/handoff/runs/<Name>.snapshot.json` from the committed frozen-memory files (`airtable-governance.json`, `token-usage.json`, `figma-variables.json`) — the frozen context every later stage reads. No live API call.

If the Figma snapshot is reported absent or stale (`figma.snapshot.stale: true`) and the component has a Figma node, tell the developer and offer to refresh via `/figma-variable-audit` before continuing. Do not silently rely on stale drift state.

### Stage 1 · Scaffold (main session)
Read **only** the snapshot from stage 0 plus the metadata schema (`packages/components/component.schema.json`) and the closest existing component as a structural template. Then follow `/component-scaffold`: first its API proposal checkpoint (props table checked against the "Prop vocabulary" in `packages/components/AGENTS.md`, approved by the developer before any file is written, ADR-026), then the four files at `packages/components/src/components/<Name>/`:
- `index.tsx`, `<Name>.module.css`, `<Name>.stories.tsx`, `<Name>.metadata.json`

Match the conventions in CLAUDE.md (CSS Modules referencing only `var(--ds-*)`, noun-first naming, story title rule). Pick active tokens — never one listed under `tokens.deprecatedAvoid` in the snapshot. Add the component to `packages/components/src/index.ts`. Fill `tokens` with `npm run metadata:derive-tokens -- <Name>`, never by hand.

### Stage 2 · Gate (script — fail-fast)
Run, in order:
```
npm run metadata:validate && npm run typecheck && npm run build && npm run a11y:coverage && npm run a11y:test && npm run patterns:generate
```
If any step fails, go back to Stage 1, fix the cause the error names, and re-run the gate. Do not proceed until all pass.

`patterns:generate` refreshes `.claude/component-patterns.json` (the cross-component pattern aggregate, ADR-013). The regenerated file **must be committed alongside the component** — `components-check.yml` regenerates and diffs it on every PR, so a stale committed copy fails CI. If the new component introduces a `drift` entry (e.g. a prop name that differs from the pattern's canonical `state.props`), treat that as a Stage 1 fix: rename the prop to match the pattern rather than shipping new drift.

`a11y:coverage` (ADR-008) enforces the **Tier-2 behavioral a11y** rule: if the component is *interactive* — `component.type ∈ {interactive, input}`, an interactive ARIA `role`, or a non-trivial keyboard contract (anything beyond plain Tab / native browser behaviour) — it **must** ship a co-located `<Name>.a11y.test.tsx` asserting the dynamic contract (state attributes toggling, focus, keyboard) plus an axe scan. Non-interactive components (display/landmark, e.g. Badge) need none — the gate is a no-op for them. Do **not** add a new interactive component to `scripts/a11y-backlog.json`; that ledger only waives pre-existing components pending backfill. Write the test in Stage 1 alongside the component, model it on `Button/Button.a11y.test.tsx`, and disable axe's `color-contrast` rule (jsdom can't judge it).

### Stage 2b · Visual checkpoint (human go/no-go)
Gate passed. Before the review stage, surface the component for a quick human visual check:

> "Gate passed. Start Storybook with `npm run storybook` if it isn't already running (http://localhost:6006). Open the **<Name>** Default story and toggle both light and dark themes. Reply **`go`** to proceed to review, or describe any issues to fix first."

Wait for the developer's reply. Three cases:

- **`go`** (no changes made) — continue to Stage 3.
- **`go`** (developer made manual edits) — re-run the Stage 2 gate first; if it passes, continue to Stage 3; if it fails, bounce back to fix the failure, then resurface this checkpoint.
- **Any issue description** (Claude should fix) — apply the described changes, re-run the Stage 2 gate, then resurface this checkpoint.

### Stage 2c · Record visual review (human answer → review-state)

Once the developer has replied at the Stage 2b checkpoint and the gate is green, ask the visual-review question with the AskUserQuestion tool: **"Is the component correctly rendered?"** — options **yes** / **no**, with free-text comments available via "Other".

Write the answer into `.claude/component-review-state.json` under the component's entry:
```json
"visualReview": { "status": "approved", "comments": null, "at": "<iso>" }
```
`yes` → `"approved"`; `no` or an "Other" reply → `"changes-requested"` with the reply text as `comments` (otherwise `null`). Then run `npm run sense` so `STATUS_QUO.md` and `component-pipeline.json` pick up the checklist item.

A `changes-requested` answer records the state but does **not** block committing — `in review` is committable WIP (issue #64). Apply what the comments describe (re-running the Stage 2 gate, as in 2b), but proceed to Stage 3 either way with the recorded state intact.

### Stage 3+ · Review + PR

Run `npm run component:risk -- <Name>`. It prints `interactive` or `display` from the component's metadata, using the same derivation as the `a11y:coverage` gate (`component.type ∈ {interactive, input}`, an interactive ARIA `role`, or a keyboard contract beyond plain Tab). A component that owes a Tier-2 a11y test also gets the reviewer. Flags override the tier: `--review` → full path, `--no-review` → standard path.

**`interactive` (or `--review`): full path.** Delegate to `/review-component <Name>` (`path: "full"` in review-state). That command owns the adversarial review, fix, branch creation, PR, and per-run log. Pass context: the snapshot path, the risk tier, and the fact that this is a new component (so it will create branch `component/<kebab-name>` before committing).

**`display` (or `--no-review`): standard path.** No subagent. In the main session:
1. Run `/code-review` on the component diff (`git add -N packages/components/src/components/<Name>` first so the new files show up). Apply every high/medium finding; for low ones, apply or note why not.
2. Re-run the Stage 2 gate. Fail-fast as before.
3. Record the review in `.claude/component-review-state.json` under the component's entry: set `reviewedAt` (ISO) and `path: "standard"`, keep `visualReview`, leave `learningsBackfilled: false`. Then run `npm run sense`.
4. Write `.claude/handoff/runs/<Name>.run.json` in the `/review-component` Stage 3 shape, plus `"path": "standard"` and `"risk": "display"`. `reviewerCaughtBeyondGate` lists the `/code-review` findings the gate could not have caught, so `run-ledger.json` can compare the two paths per risk tier. No `.review.json`.
5. Create branch `component/<kebab-name>`, commit the component files (plus `component-patterns.json` and the snapshots `sense` refreshed), and open the PR against `main` with `gh`. The body names the path (`standard`, display tier), the gate result, and the findings applied.

`/review-component` is also the standalone entry point for reviewing existing components — the same command works in both contexts.

## Eval mode (`--eval`)

Arm 2 of the harness-ablation eval (`.claude/handoff/archive/2026-10-07-harness-ablation-eval.handoff.md`) runs this loop under `claude -p` with no human present. `--eval` keeps every stage that measures the harness — sense, the API proposal, the gate, the adversarial reviewer, the fix pass — and replaces only the human checkpoints and the outward-facing steps. Everything not listed here runs exactly as above.

**Guard.** Before Stage 0, check that `.ablation-workspace` exists at the repo root (written by `scripts/harness-ablation/prepare.js`; never committed). If it is absent, stop and say `--eval` only runs in an ablation workspace. This keeps the review-skipping path off the real repo.

**Never block on a human.** No AskUserQuestion, no "reply go", no waiting. Each place this loop would ask, take the eval default below and keep going.

| Stage | Eval behaviour |
|---|---|
| 0 · Sense | Run as normal. Skip the stale-Figma offer; note it in `.run.json` `notes` instead. |
| 1 · Scaffold | No Figma MCP. The design input is the brief plus the `reference.png` it names — read the image instead of a Figma node. **API proposal checkpoint is auto-approved:** write the full proposal (anatomy, props table, divergences) to `api-proposal.md` at the repo root, then proceed with it exactly as written — no second pass. Omit `figmaNodeId` from the metadata. |
| 2 · Gate | Run as normal, fail-fast. **Cap: 5 gate runs.** If the 5th still fails, stop: write `.run.json` with the failures and `"outcome": "gate-failed"`, skip Stage 3. |
| 2b · Visual checkpoint | Skipped. |
| 2c · Record visual review | Skipped. Don't write `visualReview` to `component-review-state.json`; record `"visualReview": "skipped-eval"` in `.run.json`. |
| 3+ · Review | Always the full path, whatever `component:risk` says, so Arm 2 stays re-runnable; `--no-review` is ignored. Run `/review-component <Name> --eval` (see that command's eval section): same single reviewer subagent, same fix pass and gate, but no branch, commit or PR. |

**Outputs, all in the workspace:** the component files, `api-proposal.md`, `.claude/handoff/runs/<Name>.review.json` and `<Name>.run.json`. Don't run `npm run handoff:tidy`: eval runs never enter the committed `run-ledger.json`. End with a one-paragraph summary of the outcome; the harness reads cost and turns from `--output-format json`, not from the summary.

## Success signal
The component ships *through* the loop — meeting its roadmap success signal with no manual restructuring, the human reviewing only clean code. Stages 0–2c complete cleanly, then the Stage 3 review (adversarial for interactive, in-session for display) clears and the PR opens. A display component finishes with no subagent spawned; an interactive one spawns exactly one. Update this prompt with anything learned from each run.
