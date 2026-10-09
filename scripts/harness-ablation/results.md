# Harness-ablation results

Generated: 2026-10-09T12:25:18.984Z · 27 scored run(s) · model: claude-opus-5-5

Arm 0 = bare repo (no CLAUDE.md, .claude/, ADRs or metadata). Arm 1 = context only (no commands, agents or skills). Arm 2 = full harness (`/add-component <Name> --eval`). Scope, arms and scoring: `.claude/handoff/2026-10-07-harness-ablation-eval.handoff.md`.

A run is **clean** when it has zero product-quality violations: typecheck, lint, the axe sweep over every story, missing deliverables, the pattern-accuracy traps (on an arm's own stories file, `off-scale-inline-style` and `raw-visible-text` count as system compliance instead), `unknown-token`, `invented-import` and the brief checklist. **Cost per clean component** = an arm's total cost ÷ its clean runs.

> **Honest-outcome rule** (handoff, Pre-registration): if Arm 2 doesn't beat Arm 1 by a meaningful margin, report that and question whether the loop and the reviewer earn their cost. Don't tune briefs or traps after seeing results.

## Product quality (headline)

| Task | Arm | Runs | Clean rate | Mean violations (min–max) | Cost per clean component | Mean cost / run | Mean turns | Mean minutes |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| badge | 0 · Bare repo | 3 | 100% (3/3) | 0.0 | $0.33 | $0.33 | 11 | 0.9 |
| badge | 1 · Context only | 3 | 100% (3/3) | 0.0 | $0.72 | $0.72 | 23 | 2.0 |
| badge | 2 · Full harness | 3 | 100% (3/3) | 0.0 | $1.34 | $1.34 | 23 | 4.0 |
| cardvertical | 0 · Bare repo | 3 | 100% (3/3) | 0.0 | $0.46 | $0.46 | 12 | 1.4 |
| cardvertical | 1 · Context only | 3 | 100% (3/3) | 0.0 | $1.10 | $1.10 | 28 | 2.7 |
| cardvertical | 2 · Full harness | 3 | 100% (3/3) | 0.0 | $1.70 | $1.70 | 27 | 4.8 |
| checkbox | 0 · Bare repo | 3 | 0% (0/3) | 2.0 | — (0 clean, $2.02 spent) | $0.67 | 24 | 2.0 |
| checkbox | 1 · Context only | 3 | 100% (3/3) | 0.0 | $0.92 | $0.92 | 24 | 3.4 |
| checkbox | 2 · Full harness | 3 | 100% (3/3) | 0.0 | $1.58 | $1.58 | 27 | 4.6 |

## All tasks, per arm

Arm 1 vs Arm 2 separates what the agent knows from the loop that checks it.

| Arm | Runs | Clean rate | Mean violations | Cost per clean component | Total cost |
|---|---:|---:|---:|---:|---:|
| 0 · Bare repo | 9 | 67% (6/9) | 0.7 | $0.73 | $4.39 |
| 1 · Context only | 9 | 100% (9/9) | 0.0 | $0.91 | $8.21 |
| 2 · Full harness | 9 | 100% (9/9) | 0.0 | $1.54 | $13.85 |

## Where the product violations came from

Summed over each cell's runs.

| Task | Arm | callback-name-drift | raw-text-prop-render |
|---|---|---:|---:|
| badge | 0 | 0 | 0 |
| badge | 1 | 0 | 0 |
| badge | 2 | 0 | 0 |
| cardvertical | 0 | 0 | 0 |
| cardvertical | 1 | 0 | 0 |
| cardvertical | 2 | 0 | 0 |
| checkbox | 0 | 3 | 3 |
| checkbox | 1 | 0 | 0 |
| checkbox | 2 | 0 | 0 |

## System compliance and process (secondary, never in the headline)

Arm 0 was never shown the metadata schema or the prop vocabulary, so these columns describe what the system additionally demands, not product quality.

| Task | Arm | Metadata written | Prop-vocabulary issues (mean) | Story inline styles (mean) | Story raw text (mean) | Reviewer findings (mean, high+medium) | Budget cut-offs | Contamination flags |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| badge | 0 | 0/3 | 0.7 | 0.0 | 0.0 | — | 0 | 0 |
| badge | 1 | 3/3 | 0.0 | 0.0 | 0.0 | — | 0 | 0 |
| badge | 2 | 3/3 | 0.7 | 0.0 | 0.0 | 6.7 (2.0) | 0 | 0 |
| cardvertical | 0 | 0/3 | 0.0 | 1.3 | 0.0 | — | 0 | 1 |
| cardvertical | 1 | 3/3 | 0.0 | 1.3 | 0.0 | — | 0 | 0 |
| cardvertical | 2 | 3/3 | 0.0 | 1.3 | 0.0 | 4.7 (1.0) | 0 | 0 |
| checkbox | 0 | 0/3 | 1.0 | 3.7 | 3.0 | — | 0 | 0 |
| checkbox | 1 | 3/3 | 0.0 | 0.0 | 0.0 | — | 0 | 0 |
| checkbox | 2 | 3/3 | 0.0 | 0.0 | 0.0 | 7.7 (2.0) | 0 | 1 |

## Median runs

The case-study figure uses each cell's median run, never the best (sorted by violations, then cost; an even count takes the worse middle run).

- badge · arm 0: run-3 (0 violations, $0.33) → `results/badge/arm0/`
- badge · arm 1: run-2 (0 violations, $0.73) → `results/badge/arm1/`
- badge · arm 2: run-3 (0 violations, $1.35) → `results/badge/arm2/`
- cardvertical · arm 0: run-1 (0 violations, $0.46) → `results/cardvertical/arm0/`
- cardvertical · arm 1: run-1 (0 violations, $1.12) → `results/cardvertical/arm1/`
- cardvertical · arm 2: run-1 (0 violations, $1.72) → `results/cardvertical/arm2/`
- checkbox · arm 0: run-3 (2 violations, $0.69) → `results/checkbox/arm0/`
- checkbox · arm 1: run-3 (0 violations, $0.93) → `results/checkbox/arm1/`
- checkbox · arm 2: run-3 (0 violations, $1.53) → `results/checkbox/arm2/`
