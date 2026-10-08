# Pattern-accuracy harness results

Generated: 2026-10-08T07:08:36.549Z — 9 of 9 tasks scored.

Arm A = brief + per-component metadata (what /layout-generation and /component-scaffold inject today).
Arm B = identical prompt + the full `.claude/component-patterns.json`.
Arm C = Arm A + the target's approved `<Name>.spec.json` (ADR-027; tasks with `specTarget` only).
Violations = pre-registered gate failures + deterministic trap-checklist hits (see score.js). Lower is better.
With several runs per cell, gate/trap/total are medians and Range is min–max of the total. Spec conformance is secondary and never part of Total.

> **Honest-outcome rule** (meta-schema handoff §5, verbatim): "if Arm B does not reduce violations meaningfully, report that plainly and recommend *not* shipping the schema. Do not massage tasks to manufacture a win."

| Task | Kind | Arm | Runs | Gate violations | Trap violations | Total | Range | Spec conformance | Prompt chars |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| component-accordion | component | A | 1 | 6 | 4 | 10 | — | — | — |
| component-accordion | component | B | 1 | 8 | 3 | 11 | — | — | — |
| component-button | component | A | 3 | 34 | 1 | 35 | 33–35 | 38 | 16302 |
| component-button | component | C | 3 | 0 | 0 | 0 | 0–2 | 26 | 25209 |
| component-cardvertical | component | A | 1 | 3 | 2 | 5 | — | — | — |
| component-cardvertical | component | B | 1 | 4 | 1 | 5 | — | — | — |
| component-cardvertical-parts | component | A | 3 | 5 | 4 | 9 | 7–12 | 46 | 57276 |
| component-cardvertical-parts | component | C | 3 | 2 | 2 | 4 | 4–6 | 39 | 75152 |
| component-select | component | A | 1 | 2 | 2 | 4 | — | — | — |
| component-select | component | B | 1 | 5 | 3 | 8 | — | — | — |
| composition-card-disclosure | composition | A | 1 | 1 | 0 | 1 | — | — | — |
| composition-card-disclosure | composition | B | 1 | 0 | 0 | 0 | — | — | — |
| composition-settings-form | composition | A | 1 | 3 | 2 | 5 | — | — | — |
| composition-settings-form | composition | B | 1 | 1 | 0 | 1 | — | — | — |
| layout-course-overview | layout | A | 1 | 2 | 1 | 3 | — | — | — |
| layout-course-overview | layout | B | 1 | 2 | 1 | 3 | — | — | — |
| layout-settings-page | layout | A | 1 | 2 | 2 | 4 | — | — | — |
| layout-settings-page | layout | B | 1 | 0 | 0 | 0 | — | — | — |

## Delta (A vs B)

Arm A total: **32** · Arm B total: **28** · delta: **4** (13% reduction) across 7 task(s).

**Summary:** Arm B reduced violations by 4 (13%). Judge "meaningfully" against the full matrix before shipping — a partial run is not a go signal.

## Delta (A vs C, ADR-027 exit condition)

> **Accept bar** (spec harness arm handoff, pre-registered): over N = 3 runs, Arm C's median headline total ≤ Arm A's on **each** task. If Arm C is worse on either task, report it and reject ADR-027. Don't tune briefs, traps or the spec after seeing results.

| Task | A median | C median | C ≤ A | A spec conformance | C spec conformance | A prompt chars | C prompt chars | Runs (A/C) |
|---|---:|---:|---|---:|---:|---:|---:|---|
| component-button | 35 | 0 | yes | 38 | 26 | 16302 | 25209 | 3/3 |
| component-cardvertical-parts | 9 | 4 | yes | 46 | 39 | 57276 | 75152 | 3/3 |

**Verdict:** Arm C is not worse on any task. ADR-027's accept bar is met.
