---
description: Add a new component from the fixed set with built-in verification (sense → scaffold → deterministic gate → one adversarial reviewer → fix → PR). Sequential, at most two agents (ADR-007).
---

# Add component

**Trigger:** Developer, when building any component from the fixed set that will go to `main`. This is the production path — use it instead of `/component-scaffold` directly. Scaffold alone skips the gate and adversarial review, meaning agent-written code reaches human review unverified.

**Invocation:** `/add-component <Name>` (e.g. `/add-component Accordion`).

This is the ad-hoc agentic loop of ADR-007 / ROADMAP Phase 9. It wraps `/component-scaffold` (Stage 1) in a deterministic gate and one adversarial review pass, then opens the PR. It is **sequential and uses at most two agents**: the main session orchestrates every stage; exactly one fresh subagent runs the adversarial review (Stage 3), because independent context is the whole point of that stage. **Never** spawn parallel workers — on Claude Pro the scarce resource is the rolling usage window, and a fan-out drains it N× and trips rate limits.

## Binding rules (from ADR-007 — do not violate)

- **Sequential, ≤2 agents.** Main session + one reviewer subagent. No parallel agents, ever.
- **Frozen-file handoffs only.** Each stage reads a committed/cached snapshot — `.claude/STATUS_QUO.md`, `.claude/handoff/<Name>.snapshot.json`, `.claude/handoff/<Name>.review.json`. No stage makes its own live API call; no streaming raw data between stages.
- **Deterministic work stays a script.** Sensing, validation, typecheck, build, lint are `npm`/CLI commands, not agent steps. The agent only does what a script can't (scaffold, judge, fix).
- **Fail-fast.** If the gate fails, bounce back to the scaffold stage with the exact error — do not push forward.
- **No agent code reaches `main` unreviewed.** Generated code must clear the gate *and* the adversarial review before the human PR opens.
- **Fixed set only.** Scaffold nothing outside the component scope declared in CLAUDE.md. Compose existing components instead.

## Stages

### Stage 0 · Sense (script — no AI)
Run `npm run sense:component <Name>`. This writes `.claude/handoff/<Name>.snapshot.json` from the committed frozen-memory files (`governance.json`, `token-usage.json`, `figma-variables.json`) — the frozen context every later stage reads. No live API call.

If the Figma snapshot is reported absent or stale (`figma.snapshot.stale: true`) and the component has a Figma node, tell the developer and offer to refresh via `/figma-variable-audit` before continuing. Do not silently rely on stale drift state.

### Stage 1 · Scaffold (main session)
Read **only** the snapshot from stage 0 plus the metadata schema (`packages/components/component.schema.json`) and the closest existing component as a structural template. Then follow `/component-scaffold` to produce the four files at `packages/components/src/components/<Name>/`:
- `index.tsx`, `<Name>.module.css`, `<Name>.stories.tsx`, `<Name>.metadata.json`

Match the conventions in CLAUDE.md (CSS Modules referencing only `var(--ds-*)`, noun-first naming, story title rule). Pick active tokens — never one listed under `tokens.deprecatedAvoid` in the snapshot. Add the component to `packages/components/src/index.ts`.

### Stage 2 · Gate (script — fail-fast)
Run, in order:
```
npm run validate:metadata && npm run typecheck && npm run build && npm run a11y:coverage && npm run test:a11y
```
If any step fails, go back to Stage 1, fix the cause the error names, and re-run the gate. Do not proceed until all pass.

`a11y:coverage` (ADR-008) enforces the **Tier-2 behavioral a11y** rule: if the component is *interactive* — `component.type ∈ {interactive, input}`, an interactive ARIA `role`, or a non-trivial keyboard contract (anything beyond plain Tab / native browser behaviour) — it **must** ship a co-located `<Name>.a11y.test.tsx` asserting the dynamic contract (state attributes toggling, focus, keyboard) plus an axe scan. Non-interactive components (display/landmark, e.g. Badge) need none — the gate is a no-op for them. Do **not** add a new interactive component to `scripts/a11y-backlog.json`; that ledger only waives pre-existing components pending backfill. Write the test in Stage 1 alongside the component, model it on `Button/Button.a11y.test.tsx`, and disable axe's `color-contrast` rule (jsdom can't judge it).

### Stage 2b · Visual checkpoint (human go/no-go)
Gate passed. Before spawning the adversarial reviewer, surface the component for a quick human visual check:

> "Gate passed. Start Storybook with `npm run storybook` if it isn't already running (http://localhost:6006). Open the **<Name>** Default story and toggle both light and dark themes. Reply **`go`** to proceed to adversarial review, or describe any issues to fix first."

Wait for the developer's reply. Three cases:

- **`go`** (no changes made) — continue to Stage 3.
- **`go`** (developer made manual edits) — re-run the Stage 2 gate first; if it passes, continue to Stage 3; if it fails, bounce back to fix the failure, then resurface this checkpoint.
- **Any issue description** (Claude should fix) — apply the described changes, re-run the Stage 2 gate, then resurface this checkpoint.

### Stage 3+ · Review + PR

Delegate to `/review-component <Name>`. That command owns the adversarial review, fix, branch creation, PR, and per-run log. Pass context: the snapshot path and the fact that this is a new component (so it will create branch `component/<kebab-name>` before committing).

`/review-component` is also the standalone entry point for reviewing existing components — the same command works in both contexts.

## Success signal
The component ships *through* the loop — meeting its roadmap success signal with no manual restructuring, the human reviewing only clean code. Stages 0–2b complete cleanly, then `/review-component` clears the adversarial review and opens the PR. Update this prompt with anything learned from each run.
