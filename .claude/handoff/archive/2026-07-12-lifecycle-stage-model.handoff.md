---
status: done
created: 2026-07-12
completed: 2026-07-13
---

# Lifecycle stage model: 4 broad stages + review checklist (implements #64)

Implements the model settled in issue #64 (rewritten 2026-07-12, consolidates the research from #56). Read #64 first — this file holds the decisions, migration map, and file-by-file checklist so a fresh session can execute without re-deriving.

## Decided model

**Broad stages** (the only values ever in Airtable `Implementation`):

| Stage | Owner | Derivation |
| :--- | :--- | :--- |
| `todo` | human (Airtable) | Wins over everything; never overwritten. |
| `in progress` | derived | Code exists, review pipeline not begun. Sub-state `unreviewed` (no artifacts — replaces `established`) or scaffold-underway (`.run.json` open, no render checkpoint). |
| `in review` | derived | Generation complete + renderable → checklist begins. Stays here (committable WIP) until human sign-off. |
| `done` | human (Airtable) | Wins over everything; never overwritten. |

**Checklist under `in review`** (rendered in STATUS_QUO.md, data in component-pipeline.json):

1. Automated gate — lint · typecheck · build · metadata · a11y scripts (one pass/fail item)
2. Visual review — human y/n/other(comments)
3. Code review — label adapts: "Code and behavioural a11y review — adversarial subagent" (Tier-2 interactive, ADR-008) / "Code review — adversarial subagent" (Tier 1) / "Code review — in-session /code-review"
4. Learnings back-fill (/extract-learnings) — `n/a — not required on in-session path` when path is in-session

Non-required items render as explicit `n/a — reason` lines, never omitted.

**Path rename:** `full` → `adversarial`, `lighter` → `in-session`.

**Visual review record** (shape to finalize during implementation — see Open edges):
`visualReview: { status: "approved" | "changes-requested", comments, at }` per component in `component-review-state.json`.

## Migration map (current state → new)

Current live state (27 components, per `.claude/component-pipeline.json`):

| Current | Count / examples | New broad stage | New detail |
| :--- | :--- | :--- | :--- |
| `established` | 2 (Button, Select) | `in progress` | sub-state `unreviewed` |
| `in review` via `path: "lighter"` | 13 (e.g. AppHeader) | `in review` | `reviewPath: "in-session"`; item 4 = n/a; item 2 unchecked (no visual-review record yet) |
| `in review` via full + learnings | 12 (e.g. Accordion) | `in review` | `reviewPath: "adversarial"`; items 3–4 checked; item 2 unchecked |
| `in progress` (learnings pending) | 0 currently | `in review` | item 4 unchecked |
| `done` / `todo` | 0 currently (`component-signoff.json` is `{}`) | unchanged | human-owned |

Item 1 (automated gate) can be considered checked for all existing components — CI gates them on every PR. Item 2 starts unchecked everywhere: no retroactive visual reviews; back-fill only if the maintainer chooses to sweep.

## Implementation checklist (file by file)

Executed 2026-07-12 as a stacked PR series: **#65** (core, base `main`) ← **#66** (commands) ← **#67** (docs sweep). Merge in that order; #66/#67 auto-retarget as their base merges.

- [x] `scripts/sense.js` — done in #65. `deriveImplementation` returns `{stage, substate}` (`substate: "unreviewed" | "scaffold-underway" | null`); checklist derived at render time (open edge resolved: no stored checklist state); `promoteReviewState()` normalizes legacy path values on read and preserves `visualReview`.
- [x] `.claude/component-review-state.json` — migrated in #65 (sense normalization wrote it through).
- [x] Regenerated `.claude/component-pipeline.json` + `STATUS_QUO.md` in #65 — output matches the migration map (25 in review, Button/Select `in progress · unreviewed`).
- [x] `scripts/airtable-sync.js` / `airtable-pull.js` — comment vocab in #65; push logic untouched. Also swept `apps/showcase/src/pipeline/dashboardData.ts` (dropped the `established` bucket — not in the original list).
- [ ] Airtable `Implementation` single-select — pending; do after #65 merges (one-off interactive MCP schema change).
- [x] `add-component.md` + `layout-generation.md` — visual-review step added in #66 (Stage 2c / Final-step subsection).
- [x] `review-component.md`, `extract-learnings.md` — path vocabulary in #66; `.review.json` template carries `"path": "adversarial"`.
- [x] ADR-010 amendment + stale-prose fix — #65.
- [x] `docs/02-component-lifecycle.md` rewrite — #65.
- [x] Docs/ADR mention sweep — #67 (case-study 04 had no mentions; ADR-016 already used the new vocabulary; historical narration left as-is).
- [x] `CLAUDE.md` review-state row + path names — #67 (claudemd:check 198/200 lines).
- [x] `scripts/pattern-accuracy-harness/.runs/**/prompt.md` ignored as instructed.

## Invariants (must survive — from #56/#64)

- Derived purely from committed handoff artifacts; no live API calls in sensing.
- `done`/`todo` human-owned; derived push never overwrites them; `todo` placeholders survive `deleteOrphans`.
- CI never regresses a stage (`learningsBackfilled` latch; local `runs/` artifacts merge over committed baseline).
- `ready` never appears on the Implementation axis (Maturity collision, ADR-010).
- Per-component `metadata.json` and `component.schema.json` stay pipeline-free (ADR-010).

## Open edges (resolutions taken 2026-07-12 during implementation)

- **visualReview record shape**: shipped as proposed `{ status, comments, at }`. "changes-requested" renders inline on checklist item 2 with its comments; it does NOT yet get its own "Pending" section in STATUS_QUO.md — flag if wanted.
- **Sub-state field name**: shipped `substate: "unreviewed" | "scaffold-underway" | null` — scaffold-underway got its own named value (a `.run.json` with no review/visualReview record).
- **Checklist data representation**: derive-at-render in sense.js, as leaned; the derived items are also carried in `component-pipeline.json` (regenerated output, not stored state).
- **Retroactive visual reviews**: left unchecked as honest state; bulk-approve via a Storybook sweep remains the maintainer's call.
- **Deferred follow-up (no issue filed yet)**: Stop hook reminding about pending visual reviews.

## Provenance

Planning session 2026-07-12. Research: GOV.UK, IBM Carbon, Shopify Polaris, Atlassian, Storybook status addon, Nathan Curtis (EightShapes) — convergence on 3–4 broad stages, one automated gate, order automated → visual → code review. Prior friction: `.claude/handoff/archive/2026-07-09-component-review.handoff.md` (13 components stuck in `established` after lighter-path reviews).
