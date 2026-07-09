---
status: active
created: 2026-07-09
completed: null
---

# Handoff — Add the docs-scribe agent (read-only content-design critic for /docs-sync)

## Why

Evaluated an "orchestrator-worker multi-agent" blueprint against the repo (2026-07-09 session). Verdict: most of it is already implemented leaner (deterministic gates are scripts, the critic is `adversarial-reviewer`, `/extract-learnings` replaces the cron meta-reviewer) or explicitly banned by ADR-007. The one idea adopted: a **Scribe** — a specialized documentation content-design critic, shaped like `adversarial-reviewer` (fresh context, read-only by tool boundary, structured findings; the main session applies fixes).

Decisions made with the developer:
- **Read-only critic**, not a rewriting agent — it returns findings JSON to the main `/docs-sync` session (the writer), which applies accepted edits.
- Lives **inside `/docs-sync` only** — no standalone command.
- Requirement it enforces: **preserve technical terms for accuracy; make text understandable for PM / product designer / software engineer** — define or link terms, never delete them.

## Grounding (audit + research)

- `docs/08-glossary.md` is the local benchmark: plain-language definition first with the technical term as headword, a concrete repo example per abstraction, explicit contrasts, audience empathy markers. Technical pages (01–06, 09) fail it via dense multi-clause sentences, glossary-defined terms used without linking, and no audience signposting.
- External anchors: Google style guide on jargon (keep terms readers search for; define on first use), PLAIN first-read-comprehension test, Nathan Curtis "Documenting Components" (serve mixed audiences by layering — plain intros carry PMs; deep sections may stay technical if terms are defined/linked).

## Work plan

1. `.claude/agents/docs-scribe.md` (new) — tools `Read, Grep, Glob` (no Bash, no Edit/Write). Glossary = term canon. Closed finding set: `undefined-term`, `glossary-gap`, `buried-lead`, `sentence-density`, `missing-example`, `audience-mismatch`. Prime directive: never propose removing a technical term. Findings JSON + verdict `clean`/`revisions-suggested`.
2. `.claude/commands/docs-sync.md` — insert scribe stage between rewrite and PR (skipped on clock-only runs); add `Task` to `allowed-tools`; new invariant (at most one subagent; it reports, main session edits); output template gains a scribe block.
3. `docs/decisions/018-docs-scribe-critic-stage.md` (new ADR).
4. `CLAUDE.md` moment 9 invariant cell — append the scribe sentence; `npm run claudemd:check` must stay green.

## Follow-ups (not in this change)

- `npm run docs:check` will flag `docs/06-agentic-moments.md` and `docs/08-glossary.md` (sources include `.claude/commands/*.md` / `adversarial-reviewer.md`; glossary should add `docs-scribe.md` as a source). Resolved by the next `/docs-sync` run — which is also the scribe's first live test.
- Sanity expectation for that first run: pointed at `01-token-pipeline.md` "How it works", the scribe should yield at least one `undefined-term`/`sentence-density` finding (the `outputReferences` sentence) and zero term-removal suggestions.
- Deferred, revisit after 2–3 scribe runs: a dedicated layout-reviewer agent for /layout-generation full-route pages (ADR-016 currently reuses the opt-in adversarial subagent).
