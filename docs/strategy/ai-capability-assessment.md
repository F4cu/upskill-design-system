# AI Capability Assessment

**Purpose:** the canonical strategy document for how this repo works with AI. Whenever a new AI-workflow technique is considered, it enters here first with an adopt / trial / defer verdict, then (if pursued) becomes a GitHub enhancement issue, then a focused handoff for a Claude Code session. This keeps strategy, planning, execution, and decision records as separate single-responsibility artifacts.

**Assessed:** 2026-07-09 · **Next reassessment:** when a deferred item's precondition triggers, or a major Claude Code capability shift lands.

---

## Current maturity

The repo has moved past "learning Claude Code" into designing a development system around it. The operating model is **lite agentic**: minimum autonomy required, deterministic scripts over agents, agent involvement limited to nine defined moments, everything through PRs.

### Strengths (established, keep investing only marginally)

| Capability | Evidence |
|---|---|
| Context engineering | CLAUDE.md budget enforced in CI (ADR-017), path-scoped rules, "Where knowledge lives" routing table |
| Agent boundaries | Deterministic work is scripts/CI; agents only at the nine moments; MCP restricted to interactive one-offs |
| Verification over trust | Deterministic gate before every PR; adversarial review before agent code reaches `main` |
| ADR-driven AI development | Prompt, workflow, context, and governance decisions all recorded as ADRs |
| Frozen-file handoffs | Snapshots (`STATUS_QUO.md`, per-component snapshots) instead of live API calls mid-loop |

These match what Anthropic's own engineering guidance recommends for this project's shape; further effort here has diminishing returns.

---

## Verdicts on candidate techniques

Grounded in web research (2026-07-09): Anthropic engineering posts first, practitioner sources second. Replaces the earlier unsourced ROI scoring.

### Adopt now

**Nothing.** The sequential batch workflow + run-ledger telemetry already match Anthropic's recommendations for this task shape. The gap found during this assessment was execution discipline (missing `/extract-learnings` and `handoff:tidy` steps in the review-backlog handoff), not missing technique.

### Trial — measured, on real work

| Technique | Trial design | Success signal |
|---|---|---|
| Eval-lite via ledger | Mid-batch checkpoints in the 2026-07-09 component-review handoff: read `run-ledger.json` at components 5 and 12; downgrade remaining display components to `/code-review` if `reviewerCaughtBeyondGate` stays empty | A recorded, evidence-backed decision about whether adversarial review earns its cost on display components |
| Git worktrees | Only when two **genuinely independent** tracks exist with no shared files — e.g. showcase pages vs docs rewrite. Never for the component-review batch (all reviews touch `component-patterns.json`) | Two tracks progress in one day without a merge conflict or context pollution |

### Defer — with reasoning

| Technique | Why deferred | Reconsider when |
|---|---|---|
| Parallel session orchestration | Anthropic flags shared-mutable-state tasks as a poor multi-agent fit; ~4× token cost on a solo Pro/Max budget; this repo's batches are sequential by design ([multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)) | A breadth-first task appears with truly independent subtasks and no shared files |
| Task-graph decomposition | No current task is large enough; handoff files + checklists already decompose multi-session work | A feature spans >3 sessions and the flat checklist stops working |
| Prompt-eval / regression harness | Anthropic's evals guidance: build when value compounds ([demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)); at solo scale, the run-ledger (`reviewerCaughtBeyondGate`, `manualRescues`) *is* the lightweight version | A command's output quality regresses and the ledger can't explain why |
| Second critic / critic-before-author | Research favors tool-grounded critique over stacked self-critique; the deterministic gate → one adversarial reviewer pipeline already is that pattern | The single reviewer systematically misses a finding class the gate can't catch |
| Broader MCP / tool ecosystems | Contradicts lite-agentic economics; MCP policy in CLAUDE.md already covers the interactive one-off cases that pay off | A recurring manual step appears that a script genuinely cannot do |
| Multi-repo orchestration | One repo | A second repo exists |

---

## Decision principle: learn vs need

The standing answer to "should I add a technique just to learn it, or only what the repo needs":

1. **Default is defer.** A technique enters the repo only with a problem it solves here, or as a bounded trial.
2. **Learning experiments ride on real work.** They must have a measurement plan (what telemetry decides success) and cost nothing extra to abandon — like the eval-lite checkpoint riding on the review batch.
3. **Restraint is the case study.** This repo's value as a portfolio artifact comes from documented reasoning about *not* adopting techniques as much as from adopting them. A defer verdict with sources is a deliverable, not a gap.
4. **Route through the pipeline.** Assessment verdict → GitHub enhancement issue (linking back here) → focused handoff → Claude session. Never bolt experimental machinery directly onto a work handoff.

---

## Learning backlog

Seeded from the defer list; promote to a GitHub issue when the "reconsider when" condition triggers.

- [ ] Git worktrees for independent tracks (trial-ready; waiting on a real two-track situation)
- [ ] Ledger-driven review-cost analysis write-up after Batch 1 + Batch 2 complete (case-study material)
- [ ] Task-graph decomposition patterns (read-only study; no adoption planned)
- [ ] `docs/project/` split (contribution-model, review-process, documentation-lifecycle) if `docs/strategy/` grows past two documents

---

## Reassessment history

| Date | Trigger | Outcome |
|---|---|---|
| 2026-07-09 | External assessment (ChatGPT, docs-only view) proposed worktrees, parallel sessions, task graphs, eval harnesses, extra critic stages | Researched against Anthropic + practitioner sources; all proposals deferred or scoped to trials; eval-lite checkpoint added to the component-review handoff; this document restructured from raw assessment into verdict form |
