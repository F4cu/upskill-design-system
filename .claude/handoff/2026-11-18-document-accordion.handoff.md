---
status: active
created: 2026-11-18
completed:
---

# /document-component Accordion

Step 5.3 of `2026-11-18-docs-page-ia.handoff.md` (prove `/document-component` on a page not touched by hand). #178 is closed, so the run went past the plan checkpoint this time.

## Where it stands

Branch `document/accordion` (local, not pushed). Committed in two commits (page files, then the review fixes to the shared figure code).

- [x] Step 1: plan approved by the developer (2026-11-18)
- [x] Step 2: decision edit pass skipped (all 3 entries already had a `topic` and reader-facing wording); `featured: true` added to the focus-on-close entry
- [x] Step 3: files written
- [x] Step 4: `npm run spec:validate && npm run docs:build` green
- [x] Step 5a: visual check (all four tabs, light and dark at 1280px, light at 375px; no page overflow, no page errors)
- [x] Step 5b: developer review of the built page (2026-11-19), applied:
  - 2026-11-19: keyboard figure badges moved to a left gutter (new opt-in `keyboard.orderSide: 'left'`, `leftLayout` in `AccessibilityFigure.tsx`); a mid-sentence link's leader stops just short of the start of its sentence (developer's call; the ring and table name the link). Dialog/Button/CardVertical unchanged (checked).
  - 2026-11-19: Spec Detail `Trigger` showed the open panel's first text line in the crop padding. `AnatomyOverlay.tsx` now clips a Detail sample to its focus part's box (whole-px insets; fractional ones looped React at 375px on CardVertical), except absolutely positioned parts (CardVertical's Action keeps its thumbnail). CardVertical details checked unchanged at 1280/375.
  - 2026-11-19: Spec anatomy dots on Accordion Title/Subtitle landed on empty space (full-width blocks). `textRect` in `AnatomyOverlay.tsx`: a text-only part with no visible box is measured by its text. Before/after compared on all 7 published Spec pages at 1280/375: Accordion fixed; Dialog's Description dot moves to its text centre (badge order shifts); CardVertical 375 overview now shows the Root badge it was missing; Button and CardVertical details unchanged.
- [ ] Step 6: commit + `npm run docs:check` done (all current, no doc touch needed); push and PR against `main` wait on the developer's go-ahead
- [ ] Then tick 5.3 in the docs-page-IA handoff with the PR number

## Changed files

| File | What |
|---|---|
| `apps/docs/src/placement/Accordion.tsx` | New. Do: `patterns: course-module-list`. Don't: `notFor: 1`, a hand-built Accordion with every item open (controlled `open`) |
| `apps/docs/src/accessibility/Accordion.tsx` | New. 4 use cases; labeling marks Heading/Trigger/Subtitle/Panel on the `CourseModuleList` pattern story; keyboard `order: true` on the `FocusableContent` story |
| `apps/docs/components.mjs` | `CONTENT_OPTIONS.Accordion`: "Title and subtitle" (`{}`) and "Title only" (`{ subtitle: undefined }`). Accordion was already in `PUBLISHED` |
| `packages/components/src/components/Accordion/Accordion.spec.json` | `featured: true` on the focus-on-close decision (2/3 featured, both on behaviour) |
| `apps/docs/src/components/AccessibilityFigure.tsx` | Bug fix, see below |

## The figure fix (shared page code)

The keyboard figure treated any stop that had a box on screen as reachable by Tab, so it numbered the "grading rubric" link inside the closed (inert) panel as a 4th stop. That contradicted the caption and the spec. A new `reachable()` also excludes stops inside `[inert]:not([data-staged])`; the staging wrapper is inert on purpose, so it still counts. Checked: the Accordion figure now shows 3 stops (trigger, link in the open panel, next trigger); Dialog's figure still shows Cancel → Remove → Close. It's in this PR because it is page-side; split it out if the developer prefers.

## For the PR description

- Finding for `/extract-learnings`: once a placement file exists, the Composition section gives way to the Do/Don't boxes, so the `composition.donts[0]` "more than about six open items" don't appears nowhere on the Usage tab (the long-subtitle don't still shows up through the labeling advice).
- Not fixed, applies to every page: the reading-order code column runs the title and subtitle together ("The Anthropologist4 hours"); the announcement column is right.
- Usage tab is short (1 Do/Don't pair) because there is only one pattern; expected under R2.
- Nothing omitted (R7): States keeps its `Open` and `Closed` stories.

## Re-run the visual check

`npm run docs:build`, then `npx astro preview --port 4329` in `apps/docs/`. Base path is `/upskill-design-system/docs/`: http://localhost:4329/upskill-design-system/docs/components/accordion/. Figures hydrate `client:visible`, so a headless screenshot must scroll the page before capturing, or the keyboard figure stays blank.
