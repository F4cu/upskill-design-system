# ADR-007 — Verified component loop: sequential, ≤2 agents, frozen-file handoffs

**Date:** 2026-06-22
**Amended:** 2026-07-23
**Status:** `accepted`

> Staked out ahead of Phase 9 implementation as `proposed`, with promotion gated on the loop running once on a real component (the Phase 9 exit condition). Promoted 2026-07-23 — see the amendment below.

## Context

The system is pivoting to introduce ad-hoc agentic loops — starting with component generation — as a learning ground for agent orchestration, while staying inside the lite-agentic charter. The constraints that shape the decision:

- **Runtime is Claude Pro, not the API.** The scarce resource is a rolling usage window with weekly caps, *not* per-token dollars. Anything that runs N agents at once drains the window N× simultaneously and trips rate limits.
- **Figma is non-Enterprise.** The Variables REST API is Enterprise-org-only (same wall as Code Connect, ADR-002 amendment). Variables are readable only via the Plugin API (MCP), interactively.
- **The charter forbids continuous/always-on agents.** Automation that recurs is a script or a GitHub Action; agents are bounded, developer-triggered moments.

A blueprint was evaluated ("In-Demand, API-Driven Agentic Loop Architecture") proposing: a hub-and-spoke router spawning 2–3 **parallel** worker agents, an asymmetric Sonnet-router / Haiku-worker model split billed per token, Figma **variables pulled over REST** into a frozen `STATUS_QUO.md`, and an adversarial verifier gating the output.

Three of its load-bearing assumptions are false for this setup:

1. **Parallel worker swarm** — written for API billing where parallel runs cost "pennies." On Pro it is the *opposite* of cheap: it burns the shared usage window fastest and is the quickest path to rate limits.
2. **Figma variables over REST** — impossible on this plan; the endpoint is Enterprise-gated.
3. **Per-token cost tiering** (`--model=haiku` worker sessions via API) — assumes API credits the developer does not have; it sits on top of, not inside, the Pro subscription.

Its three *good* ideas are plan-independent and worth keeping: frozen state-file handoffs, an adversarial verification stage, and on-demand command-triggered execution.

Options considered for how to run the loop:

1. **Parallel multi-agent (blueprint as written)** — 2–3 concurrent workers + verifier, API-billed.
2. **Sequential ≤2-agent loop in Claude Code** — orchestrate in the main session, spawn exactly one fresh subagent for adversarial review; deterministic work stays `npm` scripts; context handed off via frozen files.
3. **No loop** — keep the single-shot `/component-scaffold` prompt; add no verification stage.

## Decision

**Option 2 — a sequential, at-most-two-agent verified loop, run on Claude Code subagents (no API billing), with frozen-file handoffs.**

`/component-loop <Name>` runs bounded stages:

1. **Sense** (script, no AI) — `npm run sense:component <Name>` writes `.claude/handoff/runs/<Name>.snapshot.json` from the committed frozen-memory files (`airtable-governance.json`, `token-usage.json`, `figma-variables.json`). No live API call.
2. **Scaffold** (main session) — reuses the `/component-scaffold` moment, fed only the snapshot + schema + a template component.
3. **Gate** (script) — `npm run metadata:validate && npm run typecheck && npm run build`; fail-fast bounces back to stage 2 with the error.
4. **Adversarial review** (one spawned subagent) — fresh, independent context running `/code-review` + lint + a11y; findings written to `.claude/handoff/runs/<Name>.review.json`. (This stage is what became the `adversarial` review path, as distinct from the subagent-free `in-session` path — ADR-010 amendment 2026-07-12.)
5. **Fix + PR** (main session) — apply findings, re-run the gate, open the PR. No agent-written code reaches `main` unreviewed.

Binding rules:

- **Sequential, ≤2 agents.** Main session + at most one reviewer subagent. The reviewer is spawned *because* a fresh context is what makes the review independent — that is the only justification for a second agent. No parallel workers.
- **Frozen-file handoffs only.** Stages communicate through committed/cached snapshots, never streamed raw data or per-stage live API calls.
- **Deterministic work stays a script.** Sensing, validation, typecheck, build are `npm` scripts; agents do only what a script cannot.
- **Figma frozen memory is an MCP snapshot**, not a REST pull (forced by the Enterprise gate); code remains the source of truth and the snapshot is a drift mirror.

Option 1 was rejected because its cost model inverts on Pro. Option 3 was rejected because an unverified single-shot scaffold pushes half-broken code to human review — the adversarial stage is the point of the pivot.

## Consequences

- **Predictable, bounded agent spend.** A run touches one usage window sequentially, not a fan-out. The loop is interruptible and re-runnable per stage.
- **The frozen-memory layer (Phase 8) is a prerequisite**, not optional — without committed snapshots the stages would make live calls and the isolation guarantee collapses. ADR scope therefore couples to the `sense` scripts.
- **Lint and a11y debt lands inside stage 4** as CLI checks, rather than as separate manual passes — the pivot pays down that debt as a side effect.
- **Lite-agentic charter preserved.** Loop ≠ continuous loop: it runs once on a trigger and stops. The "no always-on watcher" rule (CLAUDE.md, Agentic moments) still holds.
- **Trade-off accepted:** sequential is slower in wall-clock time than a parallel swarm. On Pro that is the correct trade — wall-clock is cheap, usage-window headroom is not.
- **Trade-off accepted:** Figma drift detection depends on a human remembering to refresh `figma-variables.json` via the MCP. There is no scheduled pull to lean on; this is inherent to the non-Enterprise plan, not a gap to fix later.
- Revisit if the plan changes (Figma Enterprise would unlock REST sensing) or if a single reviewer subagent proves insufficient for stateful components like `Accordion` — at which point a *second sequential* review pass is preferred over going parallel.

## Amendment (2026-06-22) — Behavioral a11y tier in the gate and the review

ADR-008 adds a Tier-2 behavioral a11y check (Vitest + Testing Library + `vitest-axe`, jsdom), gated to
interactive components. It folds into this loop at two points:

- **Stage 2 (gate)** gains `npm run a11y:coverage && npm run a11y:test` after the build. `a11y:coverage`
  fails fast if an interactive component lacks its `<Name>.a11y.test.tsx`; `a11y:test` runs the
  behavioral assertions. Non-interactive components (e.g. Badge) are a no-op — the gate is
  complexity-scoped, so the Badge pilot path is unchanged.
- **Stage 3 (adversarial review)** now judges, for interactive components, whether the a11y test
  *covers the contract* — every metadata `keyboardInteraction`, the toggling state attribute, focus
  movement, APG semantics. The deterministic gate proves the test passes; the reviewer judges whether
  it tests the right things. This makes "lint and a11y debt lands inside the loop" (a consequence
  above) concrete and gives the second agent a job the script can't do.

The Phase 9 exit condition is unchanged but now has teeth: `Accordion` ships through the loop only when
its behavioral a11y test asserts the full Accordion/Disclosure contract and passes.

## Amendment (2026-07-23) — Promoted to `accepted`: exit condition satisfied

The promotion condition was met and then some: `Accordion` shipped through the loop on 2026-07-09
with its behavioral a11y contract asserted, and the committed run ledger
(`.claude/handoff/run-ledger.json`) now records 12 completed runs across the component set.
Downstream docs (`docs/06-agentic-moments.md`, `docs/11-self-improving-loops.md`) have treated the
loop as settled fact since; this amendment closes the loop on the ADR's own status so the citation
trail no longer dead-ends on `proposed`. No change to the decision or its binding rules.
