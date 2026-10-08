---
status: active
created: 2026-10-07
completed:
---

# Spec harness arm — ADR-027 exit condition

**Question:** does giving the scaffold the approved `<Name>.spec.json` keep component scaffolding from getting worse? This is the remaining condition for accepting [ADR-027](../../docs/decisions/027-component-spec-file.md). The other condition (CardVertical's parts fit the schema) was met on 2026-10-07 (`69c2a7e`).

**Why this is its own handoff:** [the harness-ablation eval](2026-10-07-harness-ablation-eval.handoff.md) measures the *harness* (tools, gates, loop, reviewer) agentically in a real workspace. This measures *context*, single-shot, in the existing `scripts/pattern-accuracy-harness/`. The two have different questions and different tools, and this one closes when ADR-027 is accepted or rejected, long before the ablation eval finishes. Shared dependencies are listed under "Before running".

## Arms

| Arm | Prompt | Runs on |
|---|---|---|
| A | brief + dependency metadata + schema (unchanged) | every task |
| B | A + `component-patterns.json` (unchanged, ADR-013) | every task; skippable with `--arm` |
| **C** | A + the target's `<Name>.spec.json` | only tasks with `specTarget` |

Arm C follows the ADR-027 flow: the spec is the approved API proposal, written before any code, so the scaffold reads it. Dependency specs are not injected; ADR-027 doesn't give them to the scaffold.

## Tasks

The old `component-cardvertical` task describes a pre-ADR-023 card (category chip, description, arrow) that no spec matches. Keep it untouched so the July A/B results stay comparable, and add two tasks:

| Task | `specTarget` | Context metadata | Output |
|---|---|---|---|
| `component-button` | Button | Icon | `index.tsx`, `.module.css`, `.metadata.json`, `.a11y.test.tsx` |
| `component-cardvertical-parts` | CardVertical | Image, Heading, Text, Icon, ProgressBar, Button, DropdownMenu, Stack, Inline | same four files |

**Brief rule: Arm A must not be starved.** Today the scaffold has the approved API proposal table in the chat (ADR-026) when it writes code. So each brief carries that table in prose: every prop with its type and default, and for CardVertical every part and its props. Arm C's extra context is everything else in the spec: anatomy roles, constraints, states with their kinds, and the token for each part and state. That is the information the arm is testing.

CardVertical is preset **+ parts**, because the spec covers the parts. (The ablation eval recommends preset-only for its own fairness reasons; that's fine, as it asks a different question.)

## Scoring

Same two-bucket idea as the ablation eval, so Arm C isn't credited for repeating the spec back:

- **Headline (decides ADR-027):** the existing gates (`typecheck`, `lint`, `metadata:validate`, `a11y:coverage`) plus the existing traps. These are the numbers the July A/B used.
- **Secondary:** a new `spec:conformance` gate. It runs `validate-spec.js` against the run folder, with the committed spec copied in after generation, and applies to **every** arm. It shows whether the code matches the agreed contract. Arm C saw the contract, so a win here is expected and proves little on its own; reported separately, never added into the headline.
- **Cost:** prompt characters per arm in `score.json` and in the report. The ADR-027 amendment found that the spec roughly doubles per-component context until the migration, so the report puts the price next to the accuracy.

## Changes needed

1. `run.js`
   - Arm C prompt section: `CONTEXT — approved component spec (<Name>.spec.json)`.
   - Arms per task: A, B, plus C when `specTarget` is set. `--arm <A|B|C>` (repeatable) to pick.
   - `--dry-run`: write `prompt.md` and print prompt sizes without invoking `claude`.
   - Record `promptChars` in `score.json`.
   - **Done 2026-10-07.** Also added `--runs <n>` (the pre-registration needs N = 3): several runs go to `.runs/<task>/<arm>/run-<n>/`, one run keeps the old layout. Dry-run prompts go to `.runs/.dry-run/`, so a dry run never wipes scored runs. `report.js` doesn't read `run-<n>/` yet; that's item 4.
2. `scripts/validate-spec.js`: a `--components-dir <dir>` option, so it can check a run folder. Treat repo components plus that dir as known component names (the run folder has only the target). Keep the default behaviour unchanged for CI.
   **Done 2026-10-07.** Imports the run folder can't resolve (`../Icon`) resolve from the repo tree, and `@upskill/components` maps to the package source. A missing `index.tsx` or `metadata.json` counts as a mismatch instead of crashing.
3. `score.js`: a `spec:conformance` gate that copies the committed spec into the run folder and calls the validator. Violations = reported mismatch lines.
   **Done 2026-10-07.** It's reported under `score.secondary` and kept out of `total`. It runs only for tasks with `specTarget`. Calibration: the shipped Button and CardVertical score 0 traps and 0 `spec:conformance`. A renamed Button prop (`trailingIcon` → `endIcon`) scores 1.
4. `report.js`: arm C rows, an A-vs-C delta over tasks that have C, a prompt-size column, and arm descriptions for C.
   **Done 2026-10-07.** Each cell reads one run or `run-<n>/` folders and reports medians with a min–max range. The table adds Runs, Range, Spec conformance and Prompt chars columns. The A-vs-B delta covers only tasks scored in both arms; the July numbers regenerate identically (32 vs 28). The A-vs-C section applies the pre-registered bar per task and prints a verdict only when every spec task has ≥ 3 runs in both arms.
5. `tasks/component-button.json`, `tasks/component-cardvertical-parts.json` with `specTarget`, briefs per the brief rule, and `requiredPatterns`/`forbiddenPatterns` written **before** the first run.
   **Reviewed and locked 2026-10-07.** Developer decisions: keep the part descriptions ("a heart toggle button" etc.) even though they hint at what each part is built on; keep `Completed`'s `progress >= 100` trigger out of the brief, since it's lifecycle-state detail, Arm C's to know; Button's `type` pattern requires an actual default; CardVertical's forbidden pattern drops `status`/`isCompleted` (extra props, not renames, and they match object literals). Both references still score 0. No further edits after the first run. Each brief has the anatomy (part names and nesting) and a props table (concept, kind, type, default), matching the `/component-scaffold` API proposal minus the Figma columns. They leave out what Arm C tests: what each part is built on, the constraints (e.g. Button's icon-only rule), the state list and the per-part tokens. Patterns check only what the brief states.
   - `run.js` now adds each task's context components to the prompt's "Available" list. FIXED_SET predates `Image` and `DropdownMenu`, so the CardVertical task would otherwise forbid what it supplies. Of the July prompts, only `component-select`'s list changes (it gains DropdownMenu, whose metadata it already received).
6. Docs: `docs/07-cli-reference.md` and `docs/11-self-improving-loops.md` mention the harness, so check their `sources:` and touch them in the same commit if needed (docs-check coupling).

## Before running

1. **Reference calibration. Done 2026-10-07:** the shipped Button and CardVertical, imports pointed at `@upskill/components`, score 0 headline and 0 `spec:conformance` against the real task files. That needed one more scorer fix: the metadata gate didn't load brand token files, so `font.family.body` counted as unknown. It now merges them, as `validate-metadata.js` does. Original item: Copy the shipped Button and CardVertical files into a run folder and score them. They should get 0 headline violations and 0 on `spec:conformance`. They don't yet:
   - CardVertical's `min-width: 220px / 160px` trips `px-literal`. Fix the component through #120, not by loosening the scorer.
   - `raw-text-prop-render` flags `title` rendered through `CardVertical.Title`. This is the scorer fix listed in the ablation eval's Stage 0 (treat a part that renders Text/Heading as a typography wrapper). Do it once, for both evals.
   - A real violation in a reference is fixed in the component on its own PR, never by loosening the scorer.
2. `--dry-run` both tasks and check the prompts: Arm A has the API table, Arm C adds only the spec.
   **Done 2026-10-08.** Arm C = Arm A plus one `CONTEXT — approved component spec` block before OUTPUT FORMAT (diff: 0 lines removed). Arm A's TASK carries the anatomy and props table. Prompt chars: Button A 16,302 / C 25,209 (+55%); CardVertical A 57,276 / C 75,152 (+31%).

## Pre-registration (write before the first real run)

- **"Not worse"** (ADR-027's accept bar): over N = 3 runs, Arm C's median headline total ≤ Arm A's on **each** of the two tasks.
- **Prediction (developer, 2026-10-07, before any run):** "Arm C will perform better than A, especially in prop and accessibility compliance."
  - How it's read against the scores: **better** = Arm C's median headline total < Arm A's on both tasks (a strict win, beyond the ≤ accept bar). **Prop compliance** = the `spec:conformance` median (secondary) plus the required/forbidden pattern hits. **Accessibility compliance** = `lint` (jsx-a11y) violations and the `a11y:coverage` gate.
  - Limit: this harness never executes the generated a11y test or runs axe. It only lints and checks that the test file exists. Behavioural a11y needs the ablation eval's composeStories/axe scoring.
- **Honest-outcome rule:** if Arm C is worse on either task, report it and reject ADR-027 as the ADR says: delete the spec files and the validator. Don't tune briefs, traps or the spec after seeing results.
- **Budget:** 2 tasks × 2 arms (A, C) × 3 runs = 12 `claude -p` runs, sequential. Arm B isn't needed for this question; skip it with `--arm`.

## When done

- Record the result in an ADR-027 amendment: accept (status `accepted`, then the migration steps listed in the ADR) or reject.
- Tell the ablation eval: if accepted, its Arm 1 context includes specs (`prepare.js` must keep and strip them like metadata, including leakage redaction of the target's spec).
- Mark this handoff `done` and run `npm run handoff:tidy`.
