---
title: "ADR-029 — Tiered context architecture and a risk-triggered reviewer"
---
# ADR-029 — Tiered context architecture and a risk-triggered reviewer

**Date:** 2026-10-09
**Status:** `accepted`

## Context

The harness ablation (`scripts/harness-ablation/`, `results.md`, handoff `archive/2026-10-07-harness-ablation-eval.handoff.md`) took the component harness apart to see which pieces make a component shippable. It answered two questions this system had been running on assumption: does written-down context earn its cost, and does the always-on gate + adversarial-reviewer loop (ADR-007) earn its cost on top of it?

That raises a third question this ADR answers: which context architecture should the system commit to as it grows past 27 components, and what does the loop look like afterwards?

### Candidate architectures

- **A. Monolithic always-loaded index.** One `AGENTS.md` at the root holding every convention, loaded into every session (the shape of Vercel's AGENTS.md eval).
- **B. Path-scoped on-demand rules.** Conventions load only when a session touches matching paths (the shape of Atlassian's context-delivery eval). This is what runs today: `.claude/rules/components.md` and `.claude/rules/tokens.md` (ADR-017), with a 20KB always-loaded `CLAUDE.md` on top.
- **C. Tiered hybrid.** A small tool-agnostic root index, package-scoped conventions loaded by path, per-component knowledge in machine-readable metadata/spec JSON, and deterministic gates as scripts and CI.

Four pillars judge them: **scalability** (does it hold at 100+ components?), **portability** (does a non-Claude coding agent get the conventions?), **cost per clean component**, and **deterministic QC** (is enforcement a gate, not prose?).

### Evidence (measured, 27 runs, `claude-opus-5-5`, N = 3 per cell)

| Arm | Clean | $/clean | Context tokens / run (badge · cardvertical · checkbox) |
|---|---:|---:|---|
| 0 · Bare repo | 6/9 | $0.73 | 246K · 345K · 668K |
| 1 · Context only | 9/9 | $0.91 | 871K · 1,284K · 1,060K |
| 2 · Full harness | 9/9 | $1.54 (+69% vs Arm 1) | 1,199K · 1,641K · 1,474K (main session only) |

Token counts are summed from `scripts/harness-ablation/.runs/*/arm*/run-*/result.json` (input + cache write + cache read). They are not in `results.md`.

- **Context earns its cost.** The only change in the headline is Arm 0 → Arm 1 (Checkbox 0/3 → 3/3). The six Arm 0 product violations (`callback-name-drift`, `raw-text-prop-render`) are conventions written in ADRs and metadata.
- **The loop doesn't.** Arm 2 never beats Arm 1 on any task. All 12 gate retries were `metadata:validate` (self-inflicted compliance churn, zero product defects repaired). Arm 2 regressed Badge prop-vocabulary (0.7 vs Arm 1's 0.0).
- **The reviewer finds real things above the headline:** forced-colors handling, APG keyboard test gaps, type narrowing. Those are concentrated in **interactive** components. On Badge (display-only), its main fix repaired a contrast miss Arm 2 created itself.
- **Static vs pulled context.** In Arm 1, CLAUDE.md (~5K tokens) + `components.md` (~3.6K) × 23 turns ≈ 200K, about 23% of Badge's 871K. The rest is the agent reading ADRs, metadata and specs on demand.
- **The monolith ceiling is already measured.** CLAUDE.md is at 19,993 / 20,000 bytes with 27 components.

### What the data does NOT support

- **Option A vs Option B is unmeasured.** Arm 1b never ran and `AGENTS.md` doesn't exist. All 27 tasks touched `packages/components/**`, so path-scoping never saved anything in this task set. Option C is chosen on structure and low regret, not on a measured A/B difference.
- **Portability is unmeasured.** Every run used Claude Code.
- **Confidence is limited.** N = 3, and only 1 of 3 tasks separated the arms. The scorer has a contrast blind spot (jsdom axe has `color-contrast` off).

## Decision

**Option C, the tiered hybrid.** Per-component knowledge is carried by schema-validated JSON, conventions load by path, a small root index is shared across tools, and gates enforce. The adversarial reviewer becomes **risk-triggered**: it runs for interactive components, not by default.

1. **Tier 0, root index: `AGENTS.md`.** ≤ 8KB, tool-agnostic. It holds invariants and pointers, never procedures:
   - the fixed component set
   - the token layer order and the `var(--ds-*)`-only rule
   - the layout grammar invariants
   - the ADR-009 extend/new/internal test
   - pointers to metadata, specs, the schema and the frozen snapshots
2. **Tier 0b, Claude-specific root: `CLAUDE.md`.** It imports `@AGENTS.md` and keeps only Claude-specific content: agentic moments, commands/skills, MCP policy, git workflow, knowledge routing. Content moves out of CLAUDE.md into `AGENTS.md`; it is not copied.
3. **Tier 1, package-scoped conventions.** Loaded by path, never globally. The delivery mechanism is decided separately and recorded here as an amendment:
   - **(a)** keep `.claude/rules/` and give other tools a pointer from `AGENTS.md`, or
   - **(b)** make nested `packages/*/AGENTS.md` canonical, with Claude delivery through a nested `CLAUDE.md` → `@AGENTS.md`. Codex and Cursor load nested `AGENTS.md` natively. (b) is preferred, provided Claude Code loads a nested `CLAUDE.md` lazily (only when it reads files under that directory) and resolves its import. If it loads at launch, (b) breaks the path-scoping ADR-017 depends on, and (a) is chosen.
4. **Tier 2, per-component knowledge** lives in `metadata.json` / `*.spec.json` only (schema-validated, tool-neutral). **Never add a per-component rules file.** That rule is what keeps Option B's fragmentation risk from materialising at 100+ components.
5. **Tier 3, enforcement** is deterministic scripts and CI (`components-check.yml` already runs the full gate on every PR). Prose never enforces what a gate can.
6. **Loop change (amends ADR-007).** `/add-component` spawns the adversarial reviewer **only for interactive components**, using the same derivation `scripts/a11y-coverage.js` uses for Tier 2 a11y (ADR-008): `component.type ∈ {interactive, input}`, an interactive ARIA role, or a widget keyboard contract. Every other component gets the in-session `/code-review` path (ADR-010's two-path model). `--review` forces the subagent and `--no-review` skips it. `--eval` keeps current behaviour (reviewer always), so the ablation's Arm 2 stays re-runnable.

### Alternatives rejected

- **Option A alone.** CLAUDE.md is already at its cap with 27 components, and Atlassian measured ~92% token inflation when conventions are dumped into context instead of indexed.
- **Option B alone.** `.claude/rules/` is Claude-only, which locks the system to one tool.
- **Keeping the reviewer always-on.** +69% $/clean with no change to the headline across 9 runs.

## Consequences

- **Two always-loaded files to keep in sync**, each with a budget gate. `scripts/claude-md-check.js` gains an `AGENTS.md` cap and an effective-size cap on CLAUDE.md that counts its resolved imports (ADR-017 amendment).
- **Non-Claude tools don't get automatic path-scoped loading** unless the Tier 1 decision picks nested `AGENTS.md`.
- **Display-only components lose the reviewer's above-headline catches.** Accepted. The contrast blind spot that let Badge's miss go unscored is tracked separately; the token contrast gate (`token-contrast-check.js`) still runs on every token PR.
- **Gate churn becomes the next cost to cut.** With the reviewer conditional, the 12 `metadata:validate` retries are the largest remaining waste in the loop. Deriving `tokens` from the CSS module and making validation errors name the expected value attack it at the source.
- **The ≤2-agent rule still holds** (ADR-007). The second agent is now conditional, not removed.

### Implementation order

Each lands in its own PR: ship `AGENTS.md` and extend `claudemd:check` → decide and wire Tier 1 delivery → risk-triggered reviewer in `/add-component` (`npm run component:risk -- <Name>` shares `a11y-coverage.js`'s derivation) → optionally, cut gate churn → close the evidence gaps (Arm 1b with the shipped `AGENTS.md`, one task outside `packages/components/**`). The plan lives in `.claude/handoff/2026-10-09-tiered-context-architecture.handoff.md`. Until the reviewer change ships, `/add-component` runs as ADR-007 describes.

### Revisit triggers

- Arm 1b (shipped `AGENTS.md` only, no path-scoped rules) differs from Arm 1 on violations or tokens.
- The out-of-path task shows path-scoping matters, in either direction.
- The pre-registered Accordion stretch task shows the reviewer earning its cost on display components too, or failing to earn it on interactive ones.

A tie on any of these is a reportable result and is recorded here as an amendment.
