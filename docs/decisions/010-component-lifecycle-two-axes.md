# ADR-010 — Component lifecycle: two axes (maturity vs implementation)

**Date:** 2026-06-25
**Amended:** 2026-07-13
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
     - `in review` — the loop is closed: on the full path `.review.json` **and** `.learnings.json` are both present; on the lighter path (added later — `/code-review` in-session, no subagent) a `.review.json` carrying `path: "lighter"` closes the loop alone, since that route has no separate learnings step. *(Corrected 2026-07-12: the original prose predated the lighter path and claimed both files were always required.)*
     - `in progress` — a full-path `.review.json` awaiting learnings back-fill, or a `.run.json` with no matching review.
     - `established` — no loop artifacts (a lone `.snapshot.json` is just a context cache): a component that predates the loop. Pushed explicitly so the column is never ambiguously blank.
     - *This derived-stage vocabulary is superseded by the 2026-07-12 amendment below; the ownership split and safety rules stand.*
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

## Amendment — 2026-07-12: four broad stages, review checklist, path rename

Implements issue #64 (consolidating the research from #56). The original derived labels said the opposite of what they meant — `established` named the review *backlog*, `in progress` meant "review closed, learnings pending", `in review` meant "review complete" — and none was inferable without reading `sense.js` source. A survey (GOV.UK, IBM Carbon, Shopify Polaris, Atlassian, Storybook status conventions, Nathan Curtis) converged on 3–4 broad stages plus a per-component quality checklist ordered automated gate → visual review → code review.

**Broad stages.** The Airtable `Implementation` column holds exactly four values: `todo` (human), `in progress` (derived — code exists, review pipeline not begun), `in review` (derived — generation complete and renderable; checklist open; committable WIP until sign-off), `done` (human). `established` is deprecated globally; its population becomes `in progress` with sub-state `unreviewed`. Sub-states (`unreviewed`, `scaffold-underway`) live only in `component-pipeline.json` / `STATUS_QUO.md`, never in Airtable. An earlier proposal to reuse `ready` here was rejected: `ready` belongs to the Maturity axis, and reusing it would collapse the two-axis separation this ADR exists to protect.

**Review checklist.** Under `in review`, four items rendered per component in `STATUS_QUO.md` and derived at render time in `sense.js` (no new stored state): (1) automated gate — one pass/fail item covering lint · typecheck · build · metadata · a11y scripts; (2) visual review — human y/n/other(comments), recorded as `visualReview: { status, comments, at }` in `component-review-state.json` by `/add-component` and `/layout-generation` right after the render checkpoint; (3) code review — label adapts: "Code and behavioural a11y review — adversarial subagent" for Tier-2/interactive components (ADR-008), plain "Code review" otherwise; (4) learnings back-fill. Items a path doesn't require render as explicit `n/a — reason` lines, never omitted.

**Path rename.** `full` → `adversarial`, `lighter` → `in-session`, in `component-review-state.json` `path` values, `reviewPath` in the pipeline JSON, and all prose. `sense.js` normalizes legacy values on read so old local `runs/` artifacts cannot reintroduce them.

Unchanged by design: the ownership split, both safety rules, the flow diagram direction, and the `HUMAN_OWNED_IMPL` guard in `airtable-sync.js`. CI still can never regress a stage (ADR-015 amendment latch).

## Amendment — 2026-07-13: path rename #2 (`full` / `standard`)

The 2026-07-12 names didn't survive first contact with the status board: `adversarial` describes the reviewer's posture (agent jargon) and `in-session` describes a mechanism — neither tells someone unfamiliar with the repo what they're choosing between. Renamed to plain review-tier words: `adversarial` → **`full`** (`/review-component` — fresh adversarial subagent + learnings loop) and `in-session` → **`standard`** (`/code-review` on the diff — no subagent, no learnings step). Note `full` thereby returns to its original pre-2026-07-12 meaning; it has always denoted the subagent path. "Adversarial subagent" survives everywhere as the *description* of what the full path spawns — only the stored path value and its prose references changed.

`sense.js`'s `LEGACY_PATHS` now normalizes `adversarial`, `in-session`, and the original `lighter` on read, so old local `runs/` artifacts cannot reintroduce any prior vocabulary. Everything else in the 2026-07-12 amendment stands.
