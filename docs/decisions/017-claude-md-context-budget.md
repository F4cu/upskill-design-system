# ADR-017 — CLAUDE.md context budget and knowledge routing

**Date:** 2026-07-08
**Amended:** 2026-09-08
**Status:** `accepted`

## Context

CLAUDE.md had grown to 289 lines / ~35KB (~8–9k tokens), loaded into every session. Anthropic's official guidance targets under 200 lines and explicitly warns that over-long files reduce adherence — instructions get lost in the noise and are silently ignored. An audit found the growth was structural, not accidental: the ADR convention said "reflect the rule in the relevant CLAUDE.md section too", making CLAUDE.md the dumping ground for every *what to do* because it was the only always-visible surface. Roughly a third of the file was package-scoped detail (component implementation rules, metadata model, a11y tiers, token conventions, SD build mechanics) that only matters when touching `packages/components/` or `packages/tokens/`, and another chunk restated ADRs 008/010/015 or duplicated command files (the fixed component set appeared in both CLAUDE.md and `/component-scaffold`).

Options considered: (a) prune once and rely on discipline — treats the symptom, the growth engine remains; (b) `@imports` — organize only, imported files still load in full at launch, zero context saved; (c) path-scoped rules plus a deterministic budget gate — matches the repo's existing philosophy (never enforce by prose what a script can gate; cf. the a11y backlog and contrast-waiver shrinking ledgers).

## Decision

Option (c):

1. **Path-scoped rules.** Package-scoped knowledge moved to `.claude/rules/components.md` (`paths: packages/components/**`) and `.claude/rules/tokens.md` (`paths: packages/tokens/**`) — loaded only when a session touches matching files.
2. **Routing table in CLAUDE.md** ("Where knowledge lives"): every candidate addition routes to the narrowest surface visible when it matters — path-scoped rule, command, ADR, docs, or a script/CI gate. CLAUDE.md keeps only cross-cutting invariants, indexes, and always-relevant policy. Litmus test per line: would removing it cause a mistake in *most* sessions?
3. **Deterministic budget gate.** `npm run claudemd:check` (`scripts/claude-md-check.js`, wired into `docs-check.yml`) fails CI when CLAUDE.md exceeds 200 lines or 20KB, and when any `.claude/rules/*.md` lacks `paths:` frontmatter (an unscoped rule loads unconditionally, silently defeating the split).
4. **ADR convention amended in place** (see CLAUDE.md → ADRs): the ADR holds the *why*; the *what to do* goes to the narrowest visible surface — a path-scoped rule or command by default, CLAUDE.md only when cross-cutting.
5. **Single-source lists.** The fixed component set lives only in CLAUDE.md "Component scope"; `/component-scaffold` points to it instead of copying it.

## Consequences

- CLAUDE.md drops to within the adherence budget; per-session context cost falls by roughly half, and package-scoped rules now load exactly when relevant.
- Future bloat is caught by CI, not by noticing degraded agent behavior months later.
- Trade-off: knowledge is now split across three instruction surfaces; the routing table is the map, and the gate prevents the failure mode of rules files quietly becoming unscoped.
- Section references in script comments were updated where content moved (`token-contrast-check.js`, `generate-pattern-schema.js`); "Component scope" and "Handoff artifacts" kept their CLAUDE.md section names because scripts and docs reference them.

## Amendment (2026-09-08) — Named against CoALA: this is a memory architecture, not an ad-hoc split

The four-way split above (CLAUDE.md, path-scoped rules/commands/skills, frozen snapshots, handoff files) was derived independently, from watching CLAUDE.md bloat and fixing it. Revisiting it against CoALA ("Cognitive Architectures for Language Agents," Sumers, Yao, Narasimhan & Griffiths, Princeton NLP, arXiv:2309.02427, 2023) — the standard taxonomy for agent memory — shows it already maps onto CoALA's four memory types:

- **Semantic memory** (facts about the world) → CLAUDE.md, `.claude/rules/*.md`, and component `metadata.json` files. What components exist, how tokens resolve, what a component's contract is.
- **Procedural memory** (how to act) → `.claude/commands/*` and `.claude/skills/*`. The step-by-step sequence for a given task, loaded only when that task runs.
- **Episodic memory** (history of past decisions and interactions) → `docs/decisions/*.md` (this file included) and `.claude/handoff/*`. ADRs record *why* a choice was made and what was tried instead — the one layer semantic and procedural memory can't answer on their own. Handoff files are the same idea at session grain: what a prior run concluded, so the next one doesn't re-derive it.
- **Working memory** (what's actually paged into the current context window) → the frozen snapshots (`STATUS_QUO.md`, `airtable-governance.json`, `component-pipeline.json`, etc.) and whatever rules/commands a given session's task pulled in. This is the layer the 200-line/20KB budget gate (Decision, point 3) protects.

Two things follow from naming this explicitly:

1. **The gap CoALA exposes.** Before this amendment, "why is the token model four layers and not three" lived only in ADR-002 — accessible, but nothing forced an agent or a future maintainer to consult episodic memory before trusting semantic memory at face value. No process change follows from this (ADRs were already being read before touching governed surfaces per "Read the relevant ADR before changing the thing it governs" in CLAUDE.md); this amendment just makes the memory-type boundary explicit so gaps are easier to spot going forward.
2. **This ADR is itself the episodic record of this observation.** Rather than opening a new ADR to say "we noticed our architecture matches a published taxonomy," the observation is amended here, next to the decision it explains — consistent with the amendment-in-place convention this repo already uses.

No structural change to the routing table, the budget gate, or any file's location follows from this amendment — it is a naming/grounding exercise, not a new decision.
