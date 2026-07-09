# ADR-018 — Docs-scribe critic stage in the docs-sync moment

**Date:** 2026-07-09
**Status:** `accepted`

## Context

The docs site serves three stakeholder audiences — product manager, product designer, software engineer — but only the glossary (`docs/08-glossary.md`) was written with the non-developer reader in mind. An audit against it showed the technical pages (01–06, 09) failing a consistent, fixable pattern: multi-clause sentences stacking three or more new concepts, terms the glossary already defines used without a link, and no signposting of which sections assume engineer vocabulary. The requirement is asymmetric: technical terms must be **preserved** for accuracy, yet the text must be understandable on first read by the other two audiences.

The trigger was an external "orchestrator-worker multi-agent" blueprint proposing a roster of specialized agents (orchestrator, quality-gate agent, CI-wired critic, weekly cron reviewer). Evaluated against this repo, everything except one idea was either already implemented leaner (gates are scripts; the critic is `adversarial-reviewer`; `/extract-learnings` covers meta-review on demand) or banned by ADR-007's lite-agentic charter. The surviving idea: a **Scribe** — a specialized documentation content-design role.

Options considered:
1. **Rewriting Scribe** — a subagent that rewrites doc sections directly. Rejected: its output would land in the PR without a second look, two writers on the same files invites churn, and it breaks the proven "agent reports, main session edits" separation.
2. **Standalone `/scribe` command** — invocable on any doc/README/ADR. Rejected for now: broader surface, fuzzier invariants, and it would be a tenth moment without a demonstrated need.
3. **Read-only critic inside `/docs-sync`** — chosen.

## Decision

Add `.claude/agents/docs-scribe.md`, a fresh-context, read-only critic mirroring the `adversarial-reviewer` pattern (ADR-007): tools are `Read, Grep, Glob` only — no Edit, no Write, no Bash — so "scribe reports, main session edits" is enforced by the tool boundary, not the prompt. `/docs-sync` spawns it once per real-drift run, after the rewrite and before the PR, scoped to the rewritten sections only; clock-only runs skip it.

The rubric is grounded in external content-design practice, adapted to this repo:
- **Define, don't delete** (Google developer style guide on jargon): a technical term is never flagged for removal — only for being neither defined on first use nor linked to its glossary entry. `docs/08-glossary.md` is the term canon.
- **First-read comprehension** (PLAIN): one idea per sentence, front-loaded points — surfaced as `buried-lead` and `sentence-density` findings.
- **Audience layering, not lowest-common-denominator** (Nathan Curtis, "Documenting Components"): "What it is" sections serve all three audiences; "How it works, concretely" may assume engineer vocabulary if glossary terms are linked.

Findings use a closed type set (`undefined-term`, `glossary-gap`, `buried-lead`, `sentence-density`, `missing-example`, `audience-mismatch`) returned as JSON; the main session applies accepted findings and lists `glossary-gap` items in the PR description as proposals.

## Consequences

- Second committed agent definition in `.claude/agents/`, establishing the read-only-critic pattern as the repo's template for agent specialization.
- Moment 9 now costs one subagent per real-drift run. The ADR-007 guardrail (sequential, ≤2 agents) still holds: main session + one scribe.
- Docs quality for non-engineer stakeholders becomes a reviewed property of every sync, not an aspiration — while the 5-section page template, claim-to-source citations, and Autodocs-owned content remain untouchable by rubric rule.
- The glossary gains a growth mechanism: recurring undefined terms surface as PR-level proposals instead of being noticed by accident.
- Deferred: a dedicated layout-reviewer agent (ADR-016 reuses the adversarial subagent opt-in) — revisit after the scribe proves its cost in 2–3 runs, judged the same way the adversarial reviewer is: empirically, via run telemetry.
