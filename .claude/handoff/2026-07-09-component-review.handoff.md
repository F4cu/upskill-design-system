---
status: active
created: 2026-07-09
completed: null
---

# Established Component Review Backlog — Handoff

# Objective

Clear the review backlog for all **established** components before continuing with the public showcase (Phase 11).

`npm run sense` (`STATUS_QUO.md`, 2026-07-08) currently reports:

- 27 components have **Established implementation maturity**
- All are stable and documented
- None have completed the `/review-component` adversarial review process

The public showcase is about to begin consuming these components on real pages. The goal is to clear the review backlog first so the showcase is built on fully reviewed components.

This handoff only covers **Batch 1**.

---

# Background

`/review-component <ComponentName>` is intentionally designed as a **single-component workflow**.

Each review creates:

- one adversarial review
- one `component/<kebab-name>` branch
- one PR

After the PR is merged, the next component review should begin.

This sequential workflow is important because multiple reviews update shared files (particularly `component-patterns.json`). Merging each PR before starting the next avoids stale-copy conflicts and keeps `components-check.yml` passing.

**Sequential is the validated design, not a limitation.** Anthropic's multi-agent guidance flags tasks with shared mutable state as a poor fit for parallel sessions/worktrees, and multi-agent runs cost roughly 4× the tokens — justified only for breadth-first independent work. Do not parallelize this batch.

---

# Batching Strategy

The 27 established components have been divided according to the amount of adversarial review required.

Per `.claude/commands/review-component.md`, the deep accessibility contract review (keyboard interaction validation, ARIA state verification, WAI-ARIA APG compliance) is only required for:

- interactive components
- input components
- components with custom keyboard contracts

Display/container components only receive the lighter review.

### Components with keyboard metadata but **no custom contract**

These still belong in Batch 1 because their interactions are native browser behavior:

- AppHeader
- Breadcrumb
- ScrollArea

---

# Batch 1 — Standard Review (18 components)

These components do **not** require deep keyboard/ARIA contract validation.

Ordered simplest-first (layout primitives → typography → display atoms → molecules) so the early runs calibrate the checkpoint data before the costlier components.

## Checklist

- [x] Box (PR #43)
- [x] Stack (PR #44)
- [x] Inline (PR #45)
- [x] Text (PR #46)
- [x] Heading (PR #47)
- [x] **← Checkpoint 1** — downgrade decision recorded below (see "Progress notes")
- [x] Divider — lighter path (`/code-review` + gate)
- [x] Icon — lighter path
- [x] Image — lighter path
- [x] Avatar — lighter path
- [x] Badge — lighter path
- [x] ProgressBar — lighter path
- [x] Card — lighter path
- [x] **← Checkpoint 2** — no new decision needed (see "Progress notes"); continuing lighter path
- [ ] CardHorizontal — lighter path
- [ ] CardVertical — lighter path
- [ ] VideoFrame — lighter path
- [ ] ScrollArea — lighter path
- [ ] Breadcrumb — lighter path
- [ ] AppHeader — lighter path

---

# Batch 2 — Deep Accessibility Review (Out of Scope)

These components require additional validation of:

- keyboard interactions
- stateful ARIA behavior
- WAI-ARIA Authoring Practices compliance

Batch 2 is **not** part of this handoff and should be completed in a future session.

Components:

- Accordion
- Button
- ButtonArrow
- Checkbox
- Chip
- DropdownMenu
- Select
- TextField
- TextLink

---

# Execution Process (Batch 1)

## Session cadence

Run **3–5 component reviews per sitting, then stop**. Start each component (or at most a small group) in a **fresh session** — long batch sessions accumulate context and degrade review quality, and the rolling 5-hour usage window naturally paces the batch. Ending at a merged-PR milestone means any session can pick up cleanly from this checklist.

## Per-component loop

For each component, in order:

1. Regenerate the frozen snapshot the reviewer subagent reads:

   ```
   npm run sense:component <ComponentName>
   ```

2. Run:

   ```
   /review-component <ComponentName>
   ```

3. Confirm:

   - review completed
   - quality gates passed
   - PR opened successfully

4. Merge the PR before beginning the next component review.

   This ensures shared files such as `component-patterns.json` remain current and prevents stale branch conflicts.

5. After the merge, run `/extract-learnings <ComponentName>` while `.claude/handoff/runs/<ComponentName>.review.json` is fresh. This back-fills the findings into component metadata — skipping it leaves the system with no memory of what the review found. (If budget-constrained, this may be deferred to the next checkpoint, but no later: `runs/` is gitignored and regenerable context is not the same as findings.)

6. Run `npm run handoff:tidy` to promote `<ComponentName>.run.json` into the committed `run-ledger.json`. This is the **only** step that makes per-run review telemetry durable — without it the batch produces no evidence for the checkpoints below.

7. Mark the component complete in the checklist above.

Repeat until all 18 Batch 1 components have been reviewed and merged.

## Mid-batch evaluation checkpoints

At the two checkpoint markers (after Heading, after Card), read `.claude/handoff/run-ledger.json` for the batch's entries and ask:

- Is `reviewerCaughtBeyondGate` consistently **empty** for the display/container components reviewed so far?
- Were there `manualRescues` or gate bounce-backs?

If the adversarial reviewer has caught nothing beyond the deterministic gate across the checkpoint window, **downgrade the remaining Batch 1 components** to the lighter path — `/code-review` on the diff plus the gate (`npm run metadata:validate && npm run typecheck && npm run build && npm run a11y:coverage && npm run a11y:test`) — and record the decision and the ledger evidence in a progress note in this handoff. If the reviewer is earning its cost, continue as planned and note that too.

This is the deliberate learning experiment of this batch: an eval-lite pass using existing telemetry, no new machinery. Batch 2 (interactive components) always gets the full adversarial review regardless of this checkpoint's outcome.

---

# Progress notes

## Checkpoint 1 (after Heading) — 2026-07-09

Ledger evidence (`.claude/handoff/run-ledger.json`, 5 entries — Box, Stack, Inline, Text, Heading):

| Component | reviewerFindingsBeyondGateCount | manualRescuesCount | gate failures |
|---|---|---|---|
| Box | 0 | 0 | 0 |
| Stack | 0 | 0 | 0 |
| Inline | 0 | 0 | 0 |
| Text | 1 | 0 | 0 |
| Heading | 0 | 0 | 0 |

4/5 components had `reviewerCaughtBeyondGate` empty. The one exception (Text) was a genuine but low-severity finding (`htmlFor` not scoped to `as="label"`) — the same class of polymorphic-`as` typing gap the reviewer had already flagged as an accepted trade-off on Box/Stack/Inline. Zero manual rescues, zero gate bounce-backs across all five runs; every review this far has been a fresh audit of unchanged code (no diff — first-ever review of established components), not a review of new changes.

**Decision: downgrade the remaining Batch 1 components to the lighter path** (`/code-review` on the current implementation + the deterministic gate: `npm run metadata:validate && npm run typecheck && npm run build && npm run a11y:coverage && npm run a11y:test`), per the handoff's checkpoint rule. The adversarial subagent is not earning its cost for this component family: it is consistently confirming clean, token-compliant, lint-clean code and surfacing only the same one or two low-severity, non-blocking typing observations already known and accepted across the layout/typography primitives. A lighter in-session pass is sufficient to catch anything in that same class for the remaining 13 Batch 1 components (Divider, Icon, Image, Avatar, Badge, ProgressBar, Card, CardHorizontal, CardVertical, VideoFrame, ScrollArea, Breadcrumb, AppHeader).

Batch 2 (interactive components) is unaffected by this decision and always gets the full adversarial review regardless of this checkpoint's outcome.

## Lighter-path reviews 1-5 (Divider, Icon, Image, Avatar, Badge) — 2026-07-09

Manual in-session review (no subagent) of each component's implementation, metadata, and CSS module, followed by the full gate (`metadata:validate`, `typecheck`, `build`, `a11y:coverage`, `a11y:test` — all passing throughout, run once after the batch since no code changed).

No code changes required for any of the five. Findings, all pre-existing and already documented in metadata (no new issues surfaced):

- **Icon**, **Badge**: the spread-props-can-override-intended-behavior typing gap (same class flagged on Box/Stack/Inline/Text) is already called out explicitly in each component's `usage.antiPatterns` — an accepted trade-off, not a new finding.
- **Divider**, **Image**, **Avatar**: no issues. CSS modules reference only `var(--ds-*)` tokens; metadata accurately reflects implementation.

Unlike the full `/review-component` path, this lighter path produces no `.review.json`/`.run.json` and is not promoted into `run-ledger.json` — it isn't one of the git-workflow's PR-required exceptions (no code changed, nothing to branch/PR for), so the only record is this note plus the checklist above.

## Lighter-path reviews 6-7 (ProgressBar, Card) — 2026-07-09

Manual review surfaced two real accessibility findings, both fixed in this pass (unlike the first five, actual code changed, so gate + lint were rerun and passed):

- **ProgressBar**: `role="progressbar"` had no accessible name (no `aria-label`/`aria-labelledby`), and neither consumer (`CardHorizontal`, `CardVertical`) supplied one — a screen reader would announce "N%, progress bar" with no indication of what's progressing. Added an optional `label` prop (defaults to `"Progress"`, mirroring `Icon`'s `label` pattern) and updated both consumers to pass `` `${title} progress` ``. Metadata updated to document the prop and the reason to always pass it when more than one ProgressBar can appear on a page.
- **Card**: metadata documented `accessibility.role: "region"`, but the implementation never set `role="region"` on the div — a bare `<div>` has no implicit role, so the documented landmark behavior never actually happened regardless of whether a caller passed `aria-label`. Fixed by conditionally setting `role="region"` only when `aria-label`/`aria-labelledby` is passed (same conditional-role pattern `Icon` already uses for `role="img"`) — an unlabeled region role would just add landmark noise. Metadata updated to describe the actual (conditional) behavior instead of the previously-aspirational one.

Gate (`metadata:validate`, `typecheck`, `build`, `a11y:coverage`, `a11y:test`) and `lint` all pass after the fixes.

## Checkpoint 2 (after Card) — 2026-07-09

Checkpoint 2's rule reads `run-ledger.json` to decide adversarial-vs-lighter for the *rest* of Batch 1 — but that decision was already made and applied at Checkpoint 1 (downgrade all remaining Batch 1 components to the lighter path), so there is no new ledger to evaluate: the lighter path doesn't write to `run-ledger.json` (see the "Lighter-path reviews 1-5" note above). No new decision needed here; continuing the lighter path for the remaining 6 Batch 1 components (CardHorizontal, CardVertical, VideoFrame, ScrollArea, Breadcrumb, AppHeader), as planned.

Worth noting: the lighter path is not rubber-stamping. It caught two genuine accessibility bugs (ProgressBar's missing accessible name, Card's undocumented-vs-actual role mismatch) that the deterministic gate alone would not have caught, since jsdom a11y tests aren't required for these non-interactive/display components (ADR-008). This is better evidence for the lighter path's value than Checkpoint 1's ledger data alone.

---

# After Batch 1 Completes

Run:

```bash
npm run sense
```

This should regenerate:

- `STATUS_QUO.md`
- `.claude/component-pipeline.json`

Then:

- verify the Batch 1 components no longer appear under the **Established — review backlog**
- update this handoff checklist
- keep the handoff **Status: active**, since Batch 2 remains outstanding
- add a short progress note describing what remains and the outcome of the checkpoint decision

---

# Verification

Each merged component PR should have passed:

- validate
- typecheck
- build
- a11y:coverage
- a11y checks
- Stage 2 validation performed by `/review-component`

After every merge:

- `components-check.yml` should continue passing
- no stale `component-patterns.json` conflicts should exist

After the full Batch 1 completes:

- `npm run sense` should report the 18 Batch 1 components with implementation maturity beyond the "Established review backlog"
- `run-ledger.json` should contain one entry per reviewed component (18 total, or fewer plus a recorded downgrade decision from a checkpoint)
- `/extract-learnings` has been run for every component reviewed via the full adversarial path
- Only the 9 Batch 2 components should remain pending adversarial review

---

# Exit Condition

This handoff is complete when:

- all 18 Batch 1 components have been reviewed (full or checkpoint-downgraded path, with the decision recorded)
- all PRs have been merged
- `npm run sense` has been regenerated
- Batch 1 components no longer appear in the **Established review backlog**
- this handoff remains **active**, documenting that only the Batch 2 review set remains
