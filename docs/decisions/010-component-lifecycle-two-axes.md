# ADR-010 — Component lifecycle: two axes (maturity vs implementation)

**Date:** 2026-06-25
**Status:** `accepted`

Related: ADR-001 (component metadata schema), ADR-002 (three-layer token model — Airtable governance direction), ADR-007 (verified component loop), ADR-008 (behavioral a11y tier).

## Context

The Airtable Components table (`tblT79kVwnCZJdlQE`) had a single `Status` field whose options mixed two unrelated concepts: production-readiness (`beta`/`ready`/`deprecated`) and pipeline progress (`todo`/`in progress`/`in review`). The component metadata schema only models the first three (`component.status`), so the pipeline values had no home in code and `sense.js` had no way to compute them.

Symptoms:
- A component that had completed a full adversarial review (e.g. `Select`: `.review.json` + gate green + `.learnings.json`) showed only `ready` in `STATUS_QUO.md`. The review was invisible.
- `Accordion` is `beta` (maturity) yet the maintainer considers its implementation finished. One field cannot express both facts.
- There was no defined, machine-checkable meaning for "in review" or "in progress", and no human sign-off gate for "done".

Constraints carried in from existing decisions:
- **Airtable is a downstream mirror for component metadata** (`airtable-sync.js push:components` is code → Airtable, partial-upsert, deletes orphan records). A value a human edits in a *pushed* field is overwritten on the next sync.
- **Governance flows the other way** (ADR-002): token `status`/`owner`/`successor`/`notes` are authored in Airtable and pulled into code (`airtable-pull.js` → `airtable-governance.json`). A human lifecycle decision on a component is the same kind of signal.
- **`sense.js` is a pure aggregator with no live API calls** (frozen-memory principle). It cannot itself call Airtable.

## Decision

Model the component lifecycle as **two independent axes**, each owned by the right process and flowing in the right direction.

| Value | Axis | Owner | Set where |
|---|---|---|---|
| `beta` / `ready` / `deprecated` | Maturity | **Code** | `component.status` in metadata (PR) → pushed to the `Maturity` column |
| `in progress` / `in review` / *established* | Implementation | **Code (derived)** | `sense.js` from handoff artifacts → pushed to the `Implementation` column |
| `done` | Implementation | **Human** | Airtable `Implementation` column — the visual-check sign-off |
| `todo` | Implementation | **Human** | Airtable `Implementation` column — planned/backlog flag |

Maturity and the derived stages flow **code → Airtable** (pushed, overwritten each sync). `done`/`todo` flow **Airtable → code** (pulled, never overwritten). Detail:

1. **Maturity** — `beta` / `ready` / `deprecated`. Production-readiness, a design judgment. Source of truth is `component.status` in the metadata (schema unchanged — ADR-001 not amended). Pushed code → Airtable into a renamed **`Maturity`** field.

2. **Implementation** — `in progress` / `in review` / `established` / `done` / `todo`. Where the component sits in the add-component → review-component → extract-learnings loop. Stored in a new Airtable **`Implementation`** field. Split by ownership:
   - `in progress` / `in review` / `established` are **derived by `sense.js`** from committed handoff artifacts and pushed code → Airtable:
     - `in review` — `.review.json` **and** `.learnings.json` both present (everything an agent/script can verify is green; awaiting the human visual check + sign-off).
     - `in progress` — `.review.json` or `.run.json` present but the loop is not closed.
     - `established` — no loop artifacts (a lone `.snapshot.json` is just a context cache): a component that predates the loop. Pushed explicitly so the column is never ambiguously blank.
   - `done` and `todo` are the **human-owned values**, authored in Airtable and pulled back into code (`airtable-pull.js` → `.claude/component-signoff.json`). `sense.js` layers them over the derived stage; they win. `done` is the "set by a human, not an agent" sign-off (the visual check code cannot know); `todo` flags a planned/backlog component the maintainer is queuing (possibly before any code exists).

Maturity and the implementation *stage* are both code-owned; the only human-governed bits are the `done`/`todo` values. The two axes never share a column, so a pushed value and a human value can never collide. `Accordion` reads `Maturity: beta` + `Implementation: done` simultaneously.

**Safety rules.** (1) *Never overwrite a human value:* `push:components` reads the current `Implementation` before writing and skips the cell if Airtable already holds `done` or `todo`; combined with partial-upsert semantics (omitted fields are never cleared), human values are immune to sync. (2) *Never orphan a human value:* `done`/`todo` rows are exempt from `deleteOrphans`, so a `todo` placeholder with no code yet survives the sync that would otherwise prune unmatched records.

**Flow:** human sets `done` in Airtable → `airtable-pull.js` → `.claude/component-signoff.json` → `npm run sense` resolves it into `.claude/component-pipeline.json` + `STATUS_QUO.md` → `push:components` mirrors the resolved Implementation back (guarded). CI (`sync-tokens.yml`) runs `sense` before `push:components` on merge.

## Consequences

- `STATUS_QUO.md` now surfaces both axes and an actionable "In review — awaiting human sign-off" queue. `Select`'s completed review is visible; `Accordion`'s beta-but-done state is expressible.
- The metadata schema is untouched — maturity stays the single source for production-readiness, so ADR-001 needs no amendment. Only the Airtable schema and three scripts changed.
- Two new committed frozen-memory files: `.claude/component-pipeline.json` (sense output, resolved truth) and `.claude/component-signoff.json` (pulled human sign-off). `sense.js` degrades gracefully when the latter is absent.
- The Airtable schema change (rename `Status` → `Maturity` with options trimmed to the three maturity values; add `Implementation`) is a one-off, applied manually or via a token with `schema.bases:write` scope — the data-plane sync key cannot mutate schema.
- Trade-off: `done` accuracy depends on the human keeping Airtable current; `sense.js` can later flag drift (Airtable `done` while the derived stage regressed) but does not today.
