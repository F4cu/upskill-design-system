---
status: active
created: 2026-11-13
completed:
---

# Dialog follow-ups after PR #171

Dialog (Phase 5e, ADR-031) shipped through `/add-component` → `/review-component` (full path, adversarial reviewer) in PR #171, branch `component/dialog`. Every CI check passed on 2026-11-13. These steps were left for a later session. Do them in order: step 1 reads run artifacts that exist only on the machine that ran the review, and step 6 reads the state the earlier steps leave.

**Before starting:** confirm #171 is merged (`gh pr view 171 --json state`). If it isn't, merge it first. Every step below assumes Dialog is on `main`.

## Progress

Tick an item when its "Done when" is met, and add the date and PR or commit.

- [ ] 1. Back-fill the review findings (`/extract-learnings Dialog`)
- [ ] 2. Browser check that the page behind the modal is inert, and record the visual review
- [ ] 3. Push the new tokens to Airtable
- [ ] 4. Push the new tokens to Figma as variables
- [ ] 5. Build Dialog in Figma, capture the pattern frames, delete the 3 waivers
- [ ] 6. Refresh the status files and mark Dialog done in the roadmap

## 1 · Back-fill the review findings

Run `/extract-learnings Dialog`. It reads `.claude/handoff/runs/Dialog.review.json` and `Dialog.run.json`, routes each finding to its durable home, opens a PR, and runs `npm run handoff:tidy`, which promotes the run into `run-ledger.json`.

- `runs/` is gitignored, so the files exist only on the machine that ran the review (this Mac). If they're gone, the findings are summarised in PR #171's description and in **Review findings, for reference** below. Write the review JSON again from those notes before running the command.
- Some findings are already in `Dialog.spec.json` `decisions` (they landed in #171): the close-event rule, the Title focus ring, and the Safari Body-scroll limitation. Extraction should not add them twice.

**Done when:** the extract-learnings PR is merged. (`run-ledger.json` already has the Dialog run: `handoff:tidy` promoted it on 2026-11-13 when this handoff was indexed.)

## 2 · Browser inertness check and visual review

jsdom can't emulate `showModal()` inertness or the top layer, so no test covers them (spec `accessibility.notes`). In Storybook (`/run-storybook`), open `Components/Dialog` → `Default` in a real browser and check:

- Tab and Shift+Tab never reach the page behind the open modal. Past the last control, focus may go to the browser's own controls; that's the recorded decision, not a trap bug.
- Clicking the page behind the modal does nothing.
- The scrim shows in both light and dark (`data-theme`).
- `NonModal`: the page stays interactive and Escape closes the dialog.
- Opening with the mouse shows no focus ring on the Title; opening from the keyboard shows the ring (intended, ADR-028).

Record the answer as `/add-component` Stage 2c describes: `"visualReview": { "status": "approved" | "changes-requested", "comments": …, "at": "<iso>" }` under Dialog in `.claude/component-review-state.json`. If something fails, file an issue (or fix it on a `component/dialog-*` branch with a PR) instead of approving.

**Done when:** `visualReview` for Dialog is recorded, as `approved` or with issues filed.

## 3 · Push the new tokens to Airtable

PR #171 added these tokens:

| Layer | Token | Value |
|---|---|---|
| Primitive | `size.6400` | `512` |
| Device (desktop) | `size.dialog.max` | `{size.6400}` |
| Theme light | `color.background.scrim` | `{color.black.alpha.7}` |
| Theme dark | `color.background.scrim` | `{color.black.alpha.9}` |

Run `npm run airtable:push:primitives`, then `npm run airtable:push:semantic`, then `npm run airtable:push:device`, through the `/airtable-sync` skill (scripts, never the Airtable MCP). Check first whether the merge-to-`main` Action (Phase 6) already synced them. If it did, this step is only a check.

**Done when:** the four rows exist in Airtable.

## 4 · Push the tokens to Figma as variables

Run `/figma-variable-push`, which uses figma-cli and pins `FIGMA_FILE="Upskill - Design System"`. It should find exactly the tokens in the table above as clean-missing. Anything else it reports is drift: stop and run `/figma-variable-audit` instead of pushing it. Figma holds the default brand only (ADR-012).

**Done when:** Figma has variables for all three tokens (named per the Figma conventions in the drift memory note; scrim in both light and dark modes), and `figma-variables.json` is recaptured.

## 5 · Dialog in Figma, pattern frames, waivers

Dialog was built code-first. Build in the Figma file, following ADR-023 and ADR-026's Figma mappings:

- A **Dialog** component set mirroring the code props: `Has description` and `Non-modal` booleans; `Title`, `Description`, `Body` and `Actions` layers named as the spec's `anatomy` parts (`Root`, `Header`, `Title`, `Close`, `Description`, `Body`, `Actions`). Bind fills, padding, radius and width to the variables from step 4.
- A **Dialog examples** section with one frame per `composition.patterns` id, built from instances only: `confirm-action`, `edit-form`, `detail-panel`. The code for each is the same-named export in `Dialog.patterns.stories.tsx`.

Then run `node scripts/capture-pattern-frames.js` (figma-cli) and delete the three Dialog entries from `scripts/figma-pattern-frame-waivers.json`. `usage:validate` fails on a waiver whose frame exists, so it confirms the deletion.

**Done when:** `usage:validate` passes with `waivers: []` and `packages/components/figma-pattern-frames.json` lists the three frames.

## 6 · Status files and roadmap

- `npm run sense` so `component-pipeline.json` and `STATUS_QUO.md` include Dialog with its review and visual-review state.
- `npm run airtable:push:components` for Dialog's maturity. The human `Implementation` value (`done`) is set by hand in Airtable and pulled back with `npm run airtable:pull:governance`.
- `ROADMAP.md`: in the Phase 5e row (`Coverage gaps (5e, ADR-031)`), mark Dialog as shipped (#171). Phase 5 stays in progress until Table, Alert and Pagination ship too.
- ADR-031 says the motivating page is migrated "in the same PR or the one right after": move `apps/showcase/src/pipeline/PipelineDetailPanel.tsx` onto Dialog. It is not in #171, so it's due now. Run `/layout-generation`, or do it as a plain edit with `npm run layout:validate`.
- Touching `ROADMAP.md` will likely make `docs/00-start-here.md` stale again. Commit a clock-reset comment in its frontmatter in the same PR (see the docs-check coupling convention).

**Done when:** `npm run status:component -- Dialog` shows it done, the roadmap row is updated, and the pipeline panel uses Dialog.

## Review findings, for reference

The adversarial reviewer's verdict was `changes-required`. Applied in #171:

- **medium:** `handleClose` closed a just-reopened dialog when a queued `close` event from the effect cleanup arrived after `showModal()` (StrictMode, Fast Refresh, toggling `nonModal`). It is fixed by checking `event.currentTarget.open`. The jsdom stub now fires `close` in a later task, and a regression test covers it; the test fails without the fix.
- **medium:** the a11y test missed Shift+Tab, the full Tab order, return focus after a modal Escape, and one call per Escape in a modal. All of these are added.
- **low:** the resync test fired `close` while the dialog was still open; a no-description test, a `headingLevel` test and the full owned-attribute `@ts-expect-error` list were missing; the Title focus ring and the Safari Body-scroll limitation are recorded in spec `decisions`.

Recorded, not changed:

- A DropdownMenu nested in a Dialog would close both on one Escape. This is latent: DropdownMenu isn't in `composition.accepts`. If it is ever added there, make DropdownMenu call `preventDefault` on Escape.
- Remove the Title's `tabindex` on blur, as GOV.UK does. Cosmetic only.

Fixed before the review: the modal rendered in the top-left corner, because `reset.css` `margin: 0` removed the browser's own `margin: auto`. `.root` now sets `margin: auto`.
