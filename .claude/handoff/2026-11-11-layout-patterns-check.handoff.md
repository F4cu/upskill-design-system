---
status: active
created: 2026-11-11
completed:
---

# Layout-patterns check: does `composition.patterns` help `/layout-generation`? (pre-registration)

**Question.** Option D (ADR-001 second 2026-11-10 amendment) replaced hand-written pattern trees with thin `{ name, useWhen }` entries plus a same-named export in `<Name>.patterns.stories.tsx`. The frozen harness can't measure whether `/layout-generation` gains anything from them (ADR-029 2026-10-12). This is the separate, pre-registered eval the parent handoff (`2026-11-10-metadata-to-usage-rename`, "Check method chosen and run") calls for, following study B's precedent.

**Everything above "Results" is frozen once this file is committed.** Results, deviations and the verdict get appended below it.

## Design

2 briefs × 2 arms × 1 run = 4 runs. Each run is a fresh general-purpose subagent, run sequentially (never in parallel), working only inside its arm's worktree. One rater (the main session) scores against the binary checks below.

### Arms

Both arms are `git worktree`s of `main` at the commit that adds this file, placed in the session scratchpad (outside the repo tree, so a parent `CLAUDE.md` or `.claude/` isn't picked up from the main checkout). In both arms:

- `.claude/handoff/` and `docs/` are deleted (this file and the parent handoff name the patterns and the checks).
- `apps/showcase/src/pages/{UserSettings,Homepage,CourseOverview}.*` are deleted and their routes removed from `App.tsx` (they overlap both briefs).
- `node_modules` is symlinked from the main checkout so `layout:validate` and `typecheck` run.

**Arm A (patterns)** is otherwise `main`.

**Arm B (no patterns)** also removes:

1. `composition.patterns` from every `*.usage.json`;
2. every `*.patterns.stories.tsx`;
3. the pattern pointers in `.claude/commands/layout-generation.md`: the `composition.patterns` clause in Inputs and Constraints, and the sentences in "Accordion with show-more" and "Card carousel with arrows" that name a pattern or its story. The rest of those two subsections (slice with `useState`; `useCarousel`, `carousel-outer`, `hide-on-mobile`, arrows right-aligned, no counter) stays, since it isn't pattern content;
4. `packages/components/figma-pattern-frames.json`.

Residual leaks accepted in B (not worth editing the specs for): `CardVertical.spec.json` `anatomyExamples` names `favorite-saved`/`overflow-menu`, and Chip's a11y note says "see the filter-bar patterns". The command tells the agent to read only `spec.constraints`. `src/stories/CourseSlider.stories.tsx` and `layout/Layout.stories.tsx` stay in both arms.

### Task prompt (verbatim, both arms; `<WT>` and `<BRIEF>` substituted)

> You are running the `/layout-generation` moment in the repository at `<WT>`. Work only inside that directory: don't read or write files outside it. Read `<WT>/.claude/commands/layout-generation.md` and follow it, with these deviations: there is no Figma file, so generate from the brief alone and don't ask; write the page to `<WT>/apps/showcase/src/pages/<Page>.tsx` and add its route in `App.tsx`; run `npm run layout:validate apps/showcase/src/pages/<Page>.tsx` and `npm run typecheck` from `<WT>` and fix what they report; skip the visual-review question, `npm run sense`, branching, committing and the PR. Don't use git. When done, reply with the page path, the final output of both commands, and nothing else.
>
> Brief: `<BRIEF>`

### Briefs (verbatim)

**Settings** (`<Page>` = `AccountSettings`):

> An account settings page for a signed-in learner, reached from Home › Account › Settings. It has the app header, then the page title "Settings" with the trail back up above it. A Profile section lets the learner edit their first name and last name (side by side on wide screens), their email and their time zone, and ends with Cancel and Save changes. A Notifications section has three independent email preferences the learner switches on or off: course updates, weekly progress digest, new content in tracks they're enrolled in. A Delete account section explains that deletion removes all progress permanently and lets the learner delete the account or back out. A footer closes the page.

**Discover** (`<Page>` = `Discover`):

> A Discover page where a learner browses courses. It has the app header, then a hero with the headline "Find your next course", one sentence of intro, and a single call to action, "Browse all courses". Below it, a Continue learning section lists the three courses the learner has started, each with its progress. Then a Topics row lets the learner narrow the recommendations by toggling any number of topics (Design, Development, Business, Photography, Writing). A Recommended for you section shows eight course cards in a row wider than the screen, paged with arrows; each card shows its thumbnail, title, the instructor's name and photo, duration and certified status, and lets the learner save it. A footer closes the page.

### Checks (binary, fixed in advance)

A check passes only if the page's JSX does what it says. Each names the pattern it probes; the B arm never sees the pattern.

**Settings**

- **S1** `inline-name-row`: first and last name are two `TextField`s in one `Inline`, each wrapped in a `Box` (or `Stack`) with `grow`; no inline `style` flex.
- **S2** `form-field-stack`: the Profile fields sit in a `Card` whose child is a `Stack` with the section `Heading` as its first child.
- **S3** `form-actions`: Cancel and Save changes are in an `Inline` with `justify="end"`, Cancel `neutral` first, Save changes `accent` last.
- **S4** `destructive-confirm`: the delete action is `variant="danger"` next to a `neutral` Cancel/back-out button in the same `Inline`; no `accent` in that section.
- **S5** `notification-preferences`: the three preferences are `Checkbox`es (not `Chip`, `Select` or `Button`) in a `Card` with a `Heading`.
- **S6** `page-header-trail`: a `Breadcrumb` (Home › Account › Settings, last item without `href`) directly precedes the `h1` "Settings" inside one `Stack`.
- **S7** `page-landmarks`: `AppHeader` is a direct child of `<Box as="main">` with no `.container` wrapper, and a `<Box as="footer">` is present.

**Discover**

- **D1** `filter-bar`: topics are `Chip`s using `pressed` + `onPressedChange` (multi-select state), in an `Inline wrap` with `role="group"` and an accessible name (`aria-labelledby` or `aria-label`).
- **D2** `card-carousel`: `useCarousel`, a `Box overflow="hidden"` around a non-wrapping `Inline` track, and a pair of `ButtonArrow`s with `disabled` bound to `canPrev`/`canNext` in an `Inline justify="end"`; no "X of Y" counter.
- **D3** `card-carousel`: the carousel items are `CardVertical` (not `Card`/`CardHorizontal`), each in a fixed-width `Box` (`minWidth` + `maxWidth`).
- **D4** `hero-cta`: the hero is `h1` + `Text` + exactly one `Button variant="accent"` with `size="lg"`.
- **D5** `started-courses-list`: Continue learning uses `CardHorizontal` with `progress`, not `CardVertical`.
- **D6** `instructor-row` + `favorite-saved`: the instructor's name and photo render through `CardVertical` parts (`Root`/`Media`/`Body`/`Title`, an `Avatar` + `Text` row between `Title` and `Meta`), with save as `CardVertical.Favorite`; not packed into a string prop or dropped.

**Also recorded per run** (not scored as checks): `layout:validate` error count on the final file, `typecheck` pass/fail, whether the agent opened a `*.patterns.stories.tsx` (arm A), turns/tokens if the Agent result reports them.

### Verdict rule

- **Benefit:** A passes ≥3 more of the 13 checks than B, with no more `layout:validate` errors.
- **No detectable effect:** the totals are within ±1.
- **Anything else** (a 2-check gap, or A ahead on checks but behind on validator errors): inconclusive at N = 1; report it as such.
- **B ahead by ≥3:** report as a harm signal and open an issue before any further pattern work.

### Predictions (main session, before the first run)

- A: 11/13. B: 7/13. Benefit.
- B most likely fails S1 (inline `style` flex or no `grow`), S3 (button order), S6 (Breadcrumb placement), D2 (track/arrows shape, despite the command's carousel subsection), D6 (instructor dropped or packed into `duration`). B most likely passes S5, D4, D5 from `useWhen`/`notFor` alone.
- A most likely misses D6 (parts composition is the hardest shape) and one of S2/S4.

### Limits

N = 1 per cell, one rater who also wrote the checks and the predictions, two briefs. A passing result says the patterns help on these two pages, not in general. Checks were written from the pattern stories, so they measure conformance to the recorded shapes, not page quality in a broader sense. Not comparable with the frozen harness results (ADR-029 2026-10-12).

## Results

_(appended after the runs)_
