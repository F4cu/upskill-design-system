# Pattern-accuracy harness results

Generated: 2026-07-06T18:24:27.855Z — 7 of 7 tasks scored.

Arm A = brief + per-component metadata (what /layout-generation and /component-scaffold inject today).
Arm B = identical prompt + the full `.claude/component-patterns.json`.
Violations = pre-registered gate failures + deterministic trap-checklist hits (see score.js). Lower is better.

> **Honest-outcome rule** (meta-schema handoff §5, verbatim): "if Arm B does not reduce violations meaningfully, report that plainly and recommend *not* shipping the schema. Do not massage tasks to manufacture a win."

| Task | Kind | Arm | Gate violations | Trap violations | Total |
|---|---|---|---:|---:|---:|
| component-accordion | component | A | 6 | 4 | 10 |
| component-accordion | component | B | 8 | 3 | 11 |
| component-cardvertical | component | A | 3 | 2 | 5 |
| component-cardvertical | component | B | 4 | 1 | 5 |
| component-select | component | A | 2 | 2 | 4 |
| component-select | component | B | 5 | 3 | 8 |
| composition-card-disclosure | composition | A | 1 | 0 | 1 |
| composition-card-disclosure | composition | B | 0 | 0 | 0 |
| composition-settings-form | composition | A | 3 | 2 | 5 |
| composition-settings-form | composition | B | 1 | 0 | 1 |
| layout-course-overview | layout | A | 2 | 1 | 3 |
| layout-course-overview | layout | B | 2 | 1 | 3 |
| layout-settings-page | layout | A | 2 | 2 | 4 |
| layout-settings-page | layout | B | 0 | 0 | 0 |

## Delta

Arm A total: **32** · Arm B total: **28** · delta: **4** (13% reduction) across 7 task(s).

**Summary:** Arm B reduced violations by 4 (13%). Judge "meaningfully" against the full matrix before shipping — a partial run is not a go signal.
