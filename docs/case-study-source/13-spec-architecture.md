# One file per reader: splitting the component contract

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar. The source of record for every number here is ADR-027 (`docs/decisions/027-component-spec-file.md`) and its six amendments, 2026-10-07 → 2026-10-12, plus the ADR-001 amendments of 2026-10-11. This chapter picks up where [The metadata contract](06-machine-readable-contract.md) leaves off. Parts of that chapter describe the pre-spec shape (metadata holding states, tokens and accessibility) and are now historical.*

## The contract had two readers, and they wanted different things

By October 2026 every component had a `<Name>.metadata.json`, schema-checked in CI, and it was doing its job. A gap showed up anyway when I read the component-spec page of the [ds101 wiki](https://f4cu.github.io/ds101/component-specs/) against it. A real spec asks for things the metadata didn't hold:

- the **anatomy**: every named part, with its role
- the **whole API**, including non-enum and code-only props
- **forbidden prop combinations as data** rather than prose
- **which token each part uses in which state**
- **the Figma decisions** design files can't show

The obvious move was to add those fields to metadata. Looking at who reads metadata stopped me.

- **`/layout-generation` reads all 27 metadata files on every run.** It needs `usage`, `variants` and `composition`: which component to pick and how it nests.
- **The builder moments** (`/component-scaffold`, `/review-component`, the accessibility gate) **read one component at a time.** They need `states`, `tokens` and `accessibility`: what to build.

Every gap on the ds101 list was builder information. Adding it to metadata would have made layout generation pay for it 27 times per run, to answer questions layout never asks. I'd already measured that cost once. The pattern-schema harness showed that context one task needs can make another task worse (ADR-013). So the question changed from "what's missing from the contract?" to "which reader is it missing for?"

## A description informs, a contract arbitrates

That line from ds101 set the bar: a spec is only useful when something checks it. There were three options:

1. **Extend the metadata schema.** It breaks the ADR-001 contract, and it grows the context layout reads on every run.
2. **A Markdown spec page per component.** ADR-001 already rejected Markdown for agent context. Nothing could validate it, and it would rot like any doc page.
3. **A separate `<Name>.spec.json` for the builder reader, checked against the code.**

ADR-027 (2026-10-07) chose option 3 as a pilot, with written exit conditions to accept it or delete it. The spec has six sections:

| Section | Holds |
|---|---|
| `anatomy` | Every named part, internal elements included, with role, what activating it does, and what it's built on |
| `props` | The approved API proposal, kept: kind, type, options, default, vocabulary concept, Figma surface |
| `constraints` | Combinations a component requires or forbids, each saying what enforces it (`type`, `test`, `lint`) |
| `states` | Every state with its ADR-025 kind and its trigger |
| `styles` | Part → conditions → CSS property → token path. A raw value is allowed but must state its reason |
| `figma` | The component sets it spans, and recorded divergences |

## Duplication, turned into a check

The spec repeats things the code already says, which is the objection ADR-026 had raised against a `props` section in metadata. The answer is about roles. TypeScript is the source of truth for what was built. The spec is the agreed intent, written by `/component-scaffold` from the approved API proposal **before any code exists**. And `npm run spec:validate` fails the PR when the two disagree:

- every declared prop is in the spec and every spec prop exists, with matching options and defaults
- the token paths in `styles` equal the `--ds-*` properties the CSS Module reads, and each one exists in the built tokens
- anatomy, states and conditions cross-reference correctly
- a constraint nothing enforces is listed as a **backlog item**, not a failure, the same shrinking-ledger convention the accessibility backlog uses

When the same fact lives in two places and a gate fails on disagreement, that's a contract, not drift. The approved API proposal also stopped living only in a chat transcript.

## The pilot found five things nothing had reported

Writing the Button spec by hand turned up five problems every existing gate had passed:

- the metadata token list missed two tokens the CSS reads
- the icon-only rule (an icon-only button needs `icon` and `aria-label`) wasn't enforced by the types
- Button had no focus style at all, so the browser default applied
- an ADR said Button's `shape` had no Figma property, when icon-only buttons are a separate Figma set
- `1px` border widths were literals in 15 CSS Modules, with no token to replace them

CardVertical was the harder test: a compound component with 22 named elements in four levels. It fit without any new top-level key, though it needed four additions inside existing sections. One records nesting, and one records the fixed props a part passes to its child. That second one turned out to be where most of a compound component's look comes from, and it never appears in its own CSS Module.

## The accept test, and why its win is overstated

The other exit condition was measured. The pattern-accuracy harness gained Arm C: the same scaffold prompt as Arm A, plus the target's spec. The bar was registered before any run: Arm C's median must be no worse than Arm A's on each task, over N = 3.

| Task | Arm A median | Arm C median | Prompt size A → C |
|---|---:|---:|---:|
| Button | 35 | 0 | +55% |
| CardVertical with parts | 9 | 4 | +31% |

The bar was met, and ADR-027 was accepted on 2026-10-08. The ADR amendment that records it also says why the result looks better than it is:

- **Arm A had no token catalogue.** In each Button Arm A run, 32–34 of the violations are invented token names. The spec handed Arm C the real paths, and the real scaffold can read the token files anyway. Most of that gap measures "no token names vs token names", not the spec's other sections.
- **A scorer false positive cost both arms 2 on CardVertical.** The task file was locked, so it was left as it was and reported.
- **The extra context is a real cost.** Until metadata shed the duplicated sections, a builder reading both files carried 31–55% more prompt.
- **The prediction only half held.** I'd predicted gains "especially in prop and accessibility compliance." Props improved. Accessibility didn't move, and this harness never runs axe.

## The rollout, in five steps

Acceptance turned the ADR's "On acceptance" list into a backlog, done over 2026-10-11 and merged as PR #142:

1. **`accessibility` joins the spec, and builder sections leave metadata.** The spec has no `tokens` list at all: the list is derived from `styles`. A rule made the move transitional: a spec owns the sections when it exists, and metadata keeps them otherwise.
2. **`/component-scaffold` writes the spec first,** right after the approved API proposal, and `spec:validate` joins every component gate.
3. **A generator drafts specs from existing code** (`npm run spec:generate`), with `TODO` for what code can't say. `spec:validate` fails on any `TODO`, so a draft can't pass until a person finishes it.
4. **All 27 components get a spec, and it's required.** Metadata's schema drops `states`, `tokens` and `accessibility` for good.
5. **The pilot's findings are closed or decided one by one** (below).

The layout side got what the split promised. The metadata `/layout-generation` reads for all 27 components went from 151 KB to 113 KB (−25%). Deriving the token list from `styles` also removed the field that caused every gate retry in the [harness ablation](12-harness-ablation-learnings.md). It's no longer hand-written, so it can't be wrong.

## A generator for the backfill, and where it was wrong

Measured against the two hand-written pilots, the generator was close on a simple component and weak on a compound one. Values came out right; placement didn't:

| | Button | CardVertical |
|---|---|---|
| Own props found | 7 of 7 | 25 of 25 |
| Style declarations on the right part and condition | 41 of 43 | 11 of 26 |

The backfill of 25 components bore that out. **18 needed only `TODO` fills**: part roles, vocabulary concepts, reasons for raw values. **7 needed their structure rewritten by hand** (Accordion, AppHeader, Checkbox, CardHorizontal, DropdownMenu, Select, TextField), and the generator was wrong in the same three ways each time:

- metadata's ARIA role describes the inner control, not the outer element the generator called `Root`
- a class applied conditionally is a state, not a part
- a combined state like `checked-hover` is two independent conditions

The worst bug was silent. A selector for the open accordion panel was merged into the always-on rule, which overwrote `opacity: 0` with `1`. Two other specs had parts invented from ternary class names, and they passed validation too. `spec:validate` can't catch either kind, because props and token sets stay intact. An audit pass found them, and the generator was fixed. It's a useful limit to know: a contract check catches disagreement, not a wrong answer that happens to be consistent.

## What the specs made visible

Writing every raw value down with a reason was the most productive part of the backfill. Of 122 literals across the CSS Modules:

- **116 carry a reason that holds.**
- **6 had an exact token** and were migrated. A same-machine before/after screenshot of the affected components, light and dark, differed in 0 pixels.
- **Opacity and z-index got no scale.** There were too few distinct values to justify one, so they stay literals with a reason, until a fourth value appears.
- **Border width is pending** an owner decision, now with a recommendation, because 17 declarations repeat the same unexplained value.

Four of the five Button findings are closed, and only the border width is open. The icon-only rule is now a TypeScript union with `@ts-expect-error` tests, and Button got a token-bound focus ring (ADR-028). The backfill also surfaced a real accessibility bug: the AppHeader mobile-menu button has no click handler, so screen readers announce a control that does nothing.

## What it doesn't prove

- **The accept test can't be re-run.** Arm C scored emitted metadata against a schema that still had `tokens`. It's frozen at `044d28f` with the rest of the harness (ADR-029 amendment, 2026-10-12).
- **Spec-first scaffolding is untested on a real new component.** Every spec so far was written for a component that already existed. The first spec-first run (#136, Button `loading`) is the real test of whether `styles` can be written before the CSS exists.
- **Most specs are thin where code can't help.** 25 of 27 have no `constraints`, and their rules are still prose in `usage.antiPatterns`. That's a gap, not evidence that there are none. 25 of 27 have no Figma read-back either.
- **The maintenance cost is unknown.** One more file per component is visible to the validator, but whether keeping specs current costs more than the drift they catch is ADR-027's own reject condition, and it can only be judged over time.

## Why this belongs in the case study

The interesting move wasn't adding a spec. It was splitting the contract **by reader instead of by topic**: what you need to choose a component vs what you need to build one. That made the layout context smaller while the builder context got richer. The duplication with the code became a gate instead of a liability. The pilot had written exit conditions in both directions, including deleting everything. When it passed, the ADR still recorded why the win was smaller than it looked. And when a generator produced specs that passed validation while being wrong, that limit went into the ADR too.

## Sources for this section

- `docs/decisions/027-component-spec-file.md` — decision and six amendments (CardVertical pilot, harness arm, migration steps 1/3/4/5, Arm C frozen)
- `docs/decisions/001-component-metadata-schema.md` — the 2026-10-11 amendments moving `states`, `tokens`, `accessibility` out of metadata
- `docs/decisions/025-component-state-model.md`, `026-component-prop-vocabulary.md`, `028-focus-indicator.md`
- `.claude/handoff/archive/2026-10-07-spec-harness-arm.handoff.md` — Arm C design, pre-registration, result
- `.claude/handoff/archive/2026-10-11-spec-rollout.handoff.md` — the five steps and their open items
- `.claude/handoff/2026-10-12-spec-rollout-followups.handoff.md` — what's still open (AppHeader, border width, constraints, Figma read-back)
- `packages/components/component.spec.schema.json`, `scripts/validate-spec.js`, `scripts/generate-spec.js`, `scripts/spec-props.js`, `readComponentMetadata` in `scripts/lib.js`
- [ds101: component specs](https://f4cu.github.io/ds101/component-specs/)
- `docs/case-study-source/06-machine-readable-contract.md` (pre-spec shape), `12-harness-ablation-learnings.md` (gate churn), `04-rejected-alternatives.md` §1 (ADR-013)
