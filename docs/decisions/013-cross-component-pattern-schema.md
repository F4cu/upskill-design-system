# ADR-013 — Cross-component pattern schema: layout/composition consumer only

**Date:** 2026-07-06
**Amended:** 2026-07-06
**Status:** `accepted`

## Context

Per-component `*.metadata.json` captures each component's contract, but no artifact captured the *cross-component* view: which components implement the same interaction pattern, the canonical shape of that pattern, and where implementations drift (e.g. Accordion `onOpenChange` vs DropdownMenu `onSelect` vs Select `onValueChange` — three names for the same change-callback axis).

A deterministic scanner (`scripts/generate-pattern-schema.js`) was built to emit this aggregate as `.claude/component-patterns.json`, following the frozen-snapshot convention (committed file, read whole in-context — no retrieval, no embeddings, no service). Structural facts (composition, ARIA contracts, drift) come from an AST + metadata scan only; `ariaContract` is derived from attributes actually present in the JSX, never from free-text metadata strings, and metadata notes are quoted verbatim into `systemSpecificNotes`.

Whether the file *helps* generation was measured, not asserted: a before/after harness (`scripts/pattern-accuracy-harness/`) ran 7 pre-registered tasks × 2 arms through identical headless prompts — Arm A with per-component metadata only, Arm B with the pattern file added — scored purely by the repo's deterministic gates plus a grep/AST trap checklist. Full-matrix results (committed in `scripts/pattern-accuracy-harness/results.md`, 2026-07-06):

| Task kind | Arm A violations | Arm B violations |
|---|---:|---:|
| component scaffold (3 tasks) | 21 | 24 |
| composition (2 tasks) | 7 | 2 |
| layout (2 tasks) | 9 | 5 |

The aggregate delta (37 → 31, 16%) hides a clean split: the file consistently improved composition/layout generation (16 → 7, with one layout task reaching zero violations) and consistently *worsened* component scaffolds — trap violations fell (10 → 7) but gate violations rose (11 → 17), suggesting the ~23K-character aggregate crowds out attention on the metadata-schema and file contracts scaffolding gates check.

## Decision

Ship `component-patterns.json` as a consumer input for **`/layout-generation` only** (covering both layout and composition briefs). Do **not** inject it into `/component-scaffold` — the harness showed a measured regression there, and the honest-outcome rule the harness was built under forbids shipping past that evidence.

Supporting decisions:

- `.claude/component-patterns.json` is the single canonical artifact; downstream consumers read it, never re-scan. Regenerate with `npm run patterns:generate`.
- `components-check.yml` gains a staleness check: regenerate in CI and `git diff --exit-code` on the emitted file (ignoring the `generatedFrom` commit-sha line, which legitimately differs). Check-and-fail, matching the repo's CI convention.
- The scanner stays deterministic. An LLM pass is permitted only for naming a structurally-detected bucket, never for structural facts.
- The `drift` array is a maintained side benefit — it is the system's only automated inconsistency report for prop naming and composition/metadata mismatches. Fixing a listed drift item is routine work, not an ADR event.

## Consequences

- Layout/composition generation gets the cross-component view (pattern membership, canonical state props, drift warnings) that per-component metadata cannot express; the harness puts the improvement at roughly half the violations on those task kinds.
- Component scaffolding deliberately stays on per-component context. If the scaffold arm is ever revisited (e.g. with a slimmed per-pattern excerpt instead of the whole file), rerun the harness first — the go/no-go rule is a measured delta, not intuition.
- The pattern file becomes CI-enforced state: any PR changing components without regenerating it fails `components-check.yml`. The regeneration cost is one `npm run patterns:generate`.
- The accuracy harness remains in-repo as the measurement instrument for any future change to what context generation consumes.
- Related: ADR-001 (metadata schema, the scanner's declared-contract input), ADR-007 (verified component loop whose scaffold stage this file is excluded from), ADR-011 (layout grammar `/layout-generation` applies alongside this file).

## Amendment (2026-07-06) — corrected harness numbers after a scorer fix

A post-run learnings pass found a false positive in the harness trap checker: `raw-text-prop-render` fired on text props passed **to** library components in attribute position (`title={course.title}` on `CardVertical`), which is correct usage — the component renders the prop through `<Heading>`/`<Text>` internally. The check now exempts attribute position (an `@attr` sentinel in the JSX walk) and only flags render-position expressions. All 14 cells were rescored from the retained scratch outputs — no regeneration, so the arms' outputs are unchanged.

Corrected table (replaces the one above):

| Task kind | Arm A violations | Arm B violations |
|---|---:|---:|
| component scaffold (3 tasks) | 19 | 24 |
| composition (2 tasks) | 6 | 1 |
| layout (2 tasks) | 7 | 3 |

Overall 32 → 28. The false positives were nearly symmetric across arms, so removing them sharpens the split rather than changing it: composition/layout improvement is now 13 → 4 violations, and the component-scaffold regression is slightly larger (+5). **The decision is unchanged** — layout/composition consumer only.

The same pass surfaced a real library finding the false positive had been masquerading as: `Accordion` (`title`), `Select`/`TextField` (`label`), and `Checkbox` (`label`) render text props as raw `<span>`/`<label>` rather than through `<Text>`, contradicting CLAUDE.md's typography rule. Tracked as a separate issue, not fixed here — whether form labels via `utilities.module.css` are an accepted exception or drift is its own decision.
