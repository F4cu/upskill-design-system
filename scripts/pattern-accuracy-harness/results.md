# Pattern-accuracy harness results

Generated: 2026-07-06T10:09:35.405Z — 1 of 7 tasks scored.

Arm A = brief + per-component metadata (what /layout-generation and /component-scaffold inject today).
Arm B = identical prompt + the full `.claude/component-patterns.json`.
Violations = pre-registered gate failures + deterministic trap-checklist hits (see score.js). Lower is better.

> **Honest-outcome rule** (meta-schema handoff §5, verbatim): "if Arm B does not reduce violations meaningfully, report that plainly and recommend *not* shipping the schema. Do not massage tasks to manufacture a win."

| Task | Kind | Arm | Gate violations | Trap violations | Total |
|---|---|---|---:|---:|---:|
| composition-settings-form | composition | A | 3 | 2 | 5 |
| composition-settings-form | composition | B | 2 | 0 | 2 |

## Delta

Arm A total: **5** · Arm B total: **2** · delta: **3** (60% reduction) across 1 task(s).

**Summary:** Arm B reduced violations by 3 (60%). Judge "meaningfully" against the full matrix before shipping — a partial run is not a go signal.

_Partial run: 1/7 tasks scored. Run `npm run harness:run -- --all` for the full matrix before drawing a ship/no-ship conclusion._
