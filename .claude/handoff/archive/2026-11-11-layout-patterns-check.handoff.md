---
status: done
created: 2026-11-11
completed: 2026-11-11
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

## Results (2026-11-11, runs at `c146135`)

### Deviations from the frozen design

1. Arm B also had `composition.patterns` stripped from `packages/components/component.usage.example.json`: it's a copy of Button's usage file, so leaving it would have handed B Button's four patterns. The pre-registered list missed it.
2. Arm B's usage files were rewritten by `JSON.stringify(…, null, 2)`, so their formatting differs from A (arrays expanded). Same content apart from the removed key.
3. `npm run typecheck` checks only `@upskill/components`, not `apps/showcase`, so "typecheck pass" says nothing about the generated pages. Recorded as run, not as a page check.
4. Residual leak found in B: `.claude/component-patterns.json` lists `CardVertical.patterns.stories.tsx` as a `useCarousel` consumer. Both B runs saw the filename while reading that file. The file doesn't exist in B, so only the name leaked.

### Scores

| Check | Settings A | Settings B | | Check | Discover A | Discover B |
|---|---|---|---|---|---|---|
| S1 `inline-name-row` | ✓ | ✓ | | D1 `filter-bar` | ✓ | ✗ |
| S2 `form-field-stack` | ✓ | ✓ | | D2 `card-carousel` track + arrows | ✓ | ✗ |
| S3 `form-actions` | ✓ | ✓ | | D3 `card-carousel` items | ✓ | ✓ |
| S4 `destructive-confirm` | ✓ | ✓ | | D4 `hero-cta` | ✓ | ✓ |
| S5 `notification-preferences` | ✓ | ✓ | | D5 `started-courses-list` | ✓ | ✓ |
| S6 `page-header-trail` | ✓ | ✓ | | D6 `instructor-row` + `favorite-saved` | ✓ | ✓ |
| S7 `page-landmarks` | ✓ | ✓ | | | | |
| **Total** | **7/7** | **7/7** | | | **6/6** | **4/6** |

**A 13/13, B 11/13.** `layout:validate` errors: 0 in all four runs; all passed on the first attempt. `typecheck` passed in all four (see deviation 3).

B's two failures:

- **D1:** the Chip group is an `Inline` with `role="group"` and `aria-labelledby`, but without `wrap`. Five chips in a non-wrapping row can overflow on mobile, so this is a real defect, not only a shape mismatch.
- **D2:** the arrows sit in an `Inline justify="space-between"` header row next to the section heading, not in an `Inline justify="end"` below the track. They still render right-aligned and `disabled` is bound to `canPrev`/`canNext`, so this fails the check as written but not functionally.

### Per-run record

| Run | Pattern stories read | Tokens | Tool uses | Duration |
|---|---|---|---|---|
| Settings A | `FormActions`, `DestructiveConfirm`, `FormFieldStack`, `InlineNameRow`, `NotificationPreferences`, `PageHeaderTrail`, `HeroCta` | 87k | 12 | 89 s |
| Settings B | none (filename leak only, deviation 4) | 80k | 11 | 73 s |
| Discover A | `CardCarousel`, `FilterBar`, `HeroCta`, `InstructorRow`, `FavoriteSaved`, `StartedCoursesList`, `FormActions`, `DestructiveConfirm` | 115k | 12 | 86 s |
| Discover B | none (filename leak only) | 113k | 18 | 132 s |

Both A runs read every pattern-story file's contents (each run also had the full set of filenames from a glob), which goes against the command's "open that file only for the patterns you pick". It cost little: A used +7k and +2k tokens over B.

Unscored differences seen while scoring: Settings B gave each Checkbox `role="switch"` and immediate-apply state, an inference from Checkbox's `notFor` note on switches; Settings B left the title block outside a named section; A's footers add the `borderTop="inverted"` from `page-landmarks`, and B's don't. B also wired a controlled `searchValue` into AppHeader in both runs, which A didn't.

### Verdict

**Inconclusive at N = 1** under the pre-registered rule: A leads by 2 checks (the rule needs ≥3 for "benefit"), with equal validator errors. Not a harm signal.

Against the predictions (A 11, B 7): A did better than predicted, and B did much better. Settings shows no difference: without patterns, the agent's other inputs (the rest of the usage files, spec `constraints`, `component-patterns.json`, the command's grammar and recurring sections, and its general knowledge) were enough for all seven shapes. The eval held those inputs constant, so it can't say which of them did the work; B's code comments cite Breadcrumb `useWhen`, Button `limits` and Checkbox `useWhen`, which is suggestive, not measured. The whole gap is on Discover, in the two checks closest to layout detail (wrapping, arrow placement); the parts composition (D6) that was predicted hardest passed in both arms. Read cautiously: the checks were written from the pattern stories, so they favour A by construction, and a 2-check gap from one run per cell is within noise.

**What this supports:** keep option D (cheap: pattern names + `useWhen` cost little per run and the stories double as Storybook docs and Figma frames), but don't expect much from removing or adding them: without patterns, the agent's other inputs still got 11 of 13 checks right. This eval doesn't show which of those inputs did the work; that would need an ablation that removes one input at a time (e.g. `donts`, or the command's recurring sections). Not pursued further unless real `/layout-generation` runs show composition misses that a pattern would have caught.
