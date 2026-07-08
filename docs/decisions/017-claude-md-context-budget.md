# ADR-017 — CLAUDE.md context budget and knowledge routing

**Date:** 2026-07-08
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
