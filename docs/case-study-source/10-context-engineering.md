# Giving AI the right context at the right time

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar.*

## The split wasn't designed, it was noticed

CLAUDE.md hit 289 lines and ~35KB before anything got fixed. Anthropic's own guidance is under 200 lines, and the reason isn't tidiness — instructions in an over-long always-loaded file get lost in the noise and are silently ignored. The fix (ADR-017) split the file along a routing table: package-scoped detail moved to path-scoped rules that only load when a session touches matching files, procedure moved to command files, rationale moved to ADRs, and live state moved to committed snapshots regenerated on demand. None of that was planned as a memory architecture up front. It was four fixes to four separate complaints about where a fact should live, arrived at independently by watching one file bloat and pulling threads out of it one at a time.

## Naming it after the fact: CoALA's four memory types

Revisiting that split later against "Cognitive Architectures for Language Agents" (Sumers, Yao, Narasimhan & Griffiths, Princeton NLP, arXiv:2309.02427, 2023) — the standard taxonomy for agent memory — showed the four-way split already matched CoALA's four memory types, just under different names:

- **Intent layer** (CoALA: semantic memory — facts about the world) → component contracts (`<Name>.metadata.json`), the four token layers, docs, and the glossary. What exists and what it means, loaded contextually based on task relevance.
- **Procedure layer** (CoALA: procedural memory — how to act) → `CLAUDE.md` as the always-loaded core, `.claude/commands/*` and `.claude/skills/*` as the step-by-step sequence for a given task, loaded only when that task runs.
- **History layer** (CoALA: episodic memory — history of past decisions) → numbered ADRs and `.claude/handoff/*`. The one layer that answers "why," including reversed decisions — semantic and procedural memory can't answer that on their own.
- **State layer** (CoALA: working memory — what's actually paged into the current context window) → the frozen snapshots (`STATUS_QUO.md`, `airtable-governance.json`, `component-pipeline.json`, and the rest): token usage, pipeline and component progress, sign-off status, captured once and reused rather than queried live.

Naming it didn't change any file's location or the budget gate that enforces it (`npm run claudemd:check`, CI-wired, ADR-017) — no code moved because of the mapping. What it did was expose a gap worth stating plainly: before the mapping was explicit, nothing forced a reader to check episodic memory (why the token model is four layers, not three — that answer lives only in ADR-002) before trusting semantic memory at face value. The mapping doesn't close that gap by itself; it makes the gap visible enough to design around next time one shows up.

## What loads is earned, not assumed

The load-bearing principle underneath all four layers is the same: **what loads is earned, not assumed.** More context is not free — it competes with the model's attention on the specific rules a given task actually needs to satisfy, and that isn't a theoretical worry here, it's a measured result. When a cross-component pattern aggregate (`component-patterns.json`) got tested as an addition to every generation task's prompt, it measurably improved composition and layout generation and measurably worsened component scaffolds — the ~23K-character aggregate crowded out the narrower schema and file-contract rules a scaffold task needed to hit. The pattern file shipped into `/layout-generation` and nowhere near `/component-scaffold` (ADR-013) — a scope decision an evaluation harness produced, not a hunch. Full numbers in [The measured-impact chapter](08-measured-impact.md) and [Rejected alternatives §1](04-rejected-alternatives.md#1-feeding-cross-component-pattern-context-into-every-generation-task).

That harness is the general mechanism the phrase "earned, not assumed" describes: before a candidate piece of reference material gets added to a prompt as a matter of course, it's scored against the deterministic gates the system already runs, on pre-registered tasks, and shipped only where the evidence says it helps. The same discipline shows up at smaller scale everywhere in the routing table — a fact belongs in CLAUDE.md only if removing it would cause a mistake in *most* sessions; anything narrower routes to the layer that's visible exactly when it matters, not before.

## Infrastructure as the context layer

The practical consequence of treating this as a memory architecture rather than a pile of markdown is that the frozen snapshots — Airtable governance, Figma variables, token usage, component patterns — are themselves the state layer, not an implementation detail underneath it. They're centralized and discoverable on purpose: `.claude/STATUS_QUO.md` is the same governance, token, and Figma-drift data three other lenses already read (`status:board`, the Pipeline Health Dashboard, an agent mid-loop), reformatted per reader rather than recomputed per reader ([Maintainer observability](09-maintainer-observability.md)). An agent reading `STATUS_QUO.md` mid-loop is working from the same committed facts a human reads at 9am — which is what makes "reduce dependency on live API calls" a property of the architecture rather than a discipline someone has to remember to apply call by call. The cost side of that trade — token counts, cache-pricing math, the 62× and 98.7% reduction figures — is covered in full in [The numbers](08-measured-impact.md); this chapter is about the shape of the memory, not its price.

## Sources for this section

- `docs/decisions/017-claude-md-context-budget.md` (2026-09-08 amendment — the CoALA mapping, named in place)
- `docs/decisions/013-cross-component-pattern-schema.md` (+ amendment) — the "earned, not assumed" harness and its numbers
- `docs/case-study-source/02-benefits-by-audience.md` — "a context budget that's enforced, not just advised"
- `docs/case-study-source/08-measured-impact.md` — "Frozen snapshots: the context economics"
- `docs/case-study-source/09-maintainer-observability.md` — the three-lenses-over-one-file-set argument
- `docs/case-study-source/04-rejected-alternatives.md` §1
- Sumers, Yao, Narasimhan & Griffiths, "Cognitive Architectures for Language Agents," arXiv:2309.02427 (2023)
