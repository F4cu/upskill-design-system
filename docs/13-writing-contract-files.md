---
title: "Writing contract files"
sources:
  - packages/components/component.usage.schema.json
  - scripts/validate-usage.js
  - packages/components/AGENTS.md
  - docs/decisions/001-component-metadata-schema.md
# clock reset 2026-11-10: usage:validate now checks component-level composition.accepts/containedBy names (#149); this page says nothing about checking containment, still accurate
# clock reset 2026-11-10: spec:validate checks each prop name against its spec concept (ADR-026 amendment, #150); this page does not describe concepts, still accurate
# clock reset 2026-11-11: usage:validate checks one Figma example frame per pattern against the frozen packages/components/figma-pattern-frames.json (ADR-023 amendment 2026-11-11); this page's writing rules are unchanged, still accurate
---
# Writing contract files

## What it is

A guide to writing the prose in a component's contract files, `<Name>.usage.json` and `<Name>.spec.json`, so that an agent can act on it. It collects what the `metadata.json` → `usage.json` migration (2026-11-10) learned: what other design systems do, what this repo's 27 files got wrong, and the rules and lint that came out of it. [Machine-readable metadata](10-machine-readable-metadata.md) explains what each field *is* and who reads it; this page is about how to *write* one.

The short form of these rules lives in the usage schema's top-level `description`, where the agents that write usage files (`/component-scaffold`, `/extract-learnings`) see it. `npm run usage:validate` checks the parts a script can check.

## Why the prose matters more than it looks

`/layout-generation` reads all 27 usage files whole, on every run. Nothing is searched or shortlisted, so every sentence is read 27 times per run, by a reader that can't ask what you meant. Two consequences follow:

- **A sentence with no decision in it still costs tokens.** Before the migration, 11 components declared a `variant` axis with one option and no prop behind it. Each one restated the description.
- **A sentence the reader can't act on is worse than no sentence.** "Use for prominent actions" leaves the agent to guess what counts as prominent. "The one action a decision region exists for: a form or dialog footer, a hero" gives it a test.

## First question for any field: who reads it?

Before writing or keeping a field, name the script or agent that reads it. The 2026-11-10 audit found `usage.keywords` had no reader at all (no script, no command), so it was dropped, not rewritten. A field with no reader is cost with no benefit, however well it's written.

| File | Reader | What it needs from the prose |
|---|---|---|
| `usage.json` | `/layout-generation`, picking and assembling | Situations, wrong picks, counts, composition don'ts |
| `spec.json` | `/component-scaffold`, `/review-component`, `spec:validate` | Anatomy, prop rules, sizes, states, the accessibility contract |

Picking and building are different jobs (ADR-027). A px height helps the builder and is noise for the picker; "never inside a repeated item" helps the picker and the builder never needs it.

## The rules, and where they come from

| # | Rule | Source | Why it helps a model |
|---|---|---|---|
| 1 | **Describe the reader's situation, not the component.** | GOV.UK "When to use this component"; Polaris best practices; toolkit-research found 57 of 195 entries described the component (D-246) | A model matches a brief to a situation. A description of the component only matches if the model already knows the answer. |
| 2 | **The description opens on one category noun:** "A <noun> that …". | Primer, Atlassian | The noun places the component in a category before any detail. Lookalike contrasts go in `notFor`, not here. |
| 3 | **Give a test the reader can check, not an adjective.** | Carbon: "only one primary button per screen" | "Prominent" or "sparingly" leaves the model to guess. A count, a place or a condition doesn't, and a count can become `composition.limits` data. |
| 4 | **Every don't says why, and what to do instead.** | Atlassian and Primer do/don't pairs; GOV.UK | The *because* lets a model apply the rule to cases it doesn't name. Anthropic's prompting guidance makes the same point: give the reason, not only the instruction. |
| 5 | **One fact, one field.** | Carbon's usage/style/code split; ADR-027 | If the description and a variant line both state a fact, the model reads it twice, or reads two versions that drift apart. |
| 6 | **One term per concept; quote props exactly.** | Prop vocabulary (ADR-026) | A model may read a synonym as a second concept. Write `` `variant="accent"` ``, not "the primary style". |
| 7 | **Use product nouns, at most three examples.** | GOV.UK's service-specific examples | "The Discover carousel" or "a course card" is concrete; "a content item" isn't. |
| 8 | **Leave a field out rather than fill it.** | No equivalent elsewhere; this repo's 27× read cost | Filler is read on every run and can't be acted on. |
| 9 | **No marketing words or hedging.** | All of the above | "Fully accessible", "foundational" or "simply" adds no decision. |

Two kinds of distinction help a model most. **Lookalikes** (Badge vs Chip; Card, CardHorizontal and CardVertical; Button, ButtonArrow and TextLink): naming the difference between overlapping options raised tool-selection accuracy by 8–38% in the ToolScope study. Here that is `notFor` with `instead`. **Tie-breakers between adjacent options:** Badge `outline` vs `filled` is decided by the surface underneath, so the line names the surface.

## Where each sentence goes

Most problems found in the audit were good sentences in the wrong field. Sort before you write:

| The sentence says | Field | Example |
|---|---|---|
| When this component is the right choice at all | `useWhen` (top level) | "An action happens in place and the URL doesn't change" |
| Which option of an axis to use | `variants.<axis>.useWhen.<option>` | Button `danger`: "Destructive or irreversible actions, next to a neutral Cancel" |
| This looks right but another component is | `notFor` (`instead` = a component, or `null` + `note`) | Badge as a toggleable filter → Chip |
| How many of something a container can hold | `composition.limits` | At most one accent Button per region |
| X inside X is wrong | `composition.nests: false` | Card inside Card |
| A placement or grouping mistake that can't be counted | `composition.donts` (`case`, `because`, `instead`) | Mixing card types in one section |
| When a named composition fits | `composition.patterns[].useWhen` | `form-actions`: "A form or dialog ends in one decision" |
| A prop combination is invalid, or a prop is required | spec `constraints` | Accordion `open` with `defaultOpen` |
| How the component is built, and why | spec `decisions` | Accordion's panel is always mounted |
| A size, a CSS value, a token | spec (`styles`, prop descriptions) | Heading `lg` is 1.625rem |
| Something a gate already enforces | Delete it | The inline-style ban; a `label` the types require |

The audit placed all 106 old anti-patterns this way: 34 to `notFor`, 27 to composition rules, 2 to `limits`, 10 to spec constraints, 6 to spec decisions, 1 to the accessibility notes, 1 to `packages/components/AGENTS.md`, and 26 deleted because a gate or another field already covered them. A second sweep of the composition rules moved 3 more to `notFor` and deleted 4. Only 4 of the 106 were true build rules; the rest had been in the wrong place, not wrong.

**Exception: caller obligations stay in usage.** Chip's group name, ProgressBar's `label` and Icon's accessible name are accessibility facts, but the *layout writer* has to supply them, and `/layout-generation` doesn't read `spec.accessibility`. So they stay as `donts`. Where a don't and the spec's accessibility contract overlap, they are two sides of one fact, not duplicates.

## Before and after, from this repo

**A variant line that describes the look** (Button, before the migration) mixed when, what and px sizes in one `purpose` string. After:

```jsonc
"accent":      "The one action a decision region exists for: form or dialog footer, hero. Brand fill.",
"neutral":     "Everyday and supporting actions, and the lead action in a card or other repeated item. Bordered.",
"transparent": "Low-weight actions inline with content ('Show more', Close) and a card's second action. No fill at rest.",
"danger":      "Destructive or irreversible actions (delete, deactivate), next to a neutral Cancel. Error fill."
```

The situation comes first; the one clause after it ("Brand fill.") is there so an agent can map a Figma instance back to an option. "Never inside a repeated item" moved to `composition.limits`, where `layout:validate` checks it.

**Descriptions** (rewritten 2026-11-10). Each kept its category noun and what sets it apart; everything else already lived in the spec, a token or `notFor`. Two facts lived nowhere else and moved: CardVertical's "no dark variant" became a `notFor` pointing to CardHorizontal's inverted variant, and Avatar's "no letter fallback" became a spec `ruledOut` entry.

| Before | After |
|---|---|
| "Triggers an action. Four variants that name an absolute visual weight, not a rank (…) — the container decides which weight an action gets (ADR-024). Three sizes, …" (48 words) | "A control that performs an action in place, such as submitting a form or opening a dialog, without changing the URL." |
| "32px circular prev/next navigation button. Uses an Icon chevron internally. direction prop selects left or right. Disabled state: …" | "A circular previous or next control that steps through a carousel or sequence." |
| "Renders one of 22 inline SVGs from the fixed icon set. Uses currentColor …" | "A glyph from the fixed icon set that takes the color of the surrounding text." |

**Variant lines** (rewritten 2026-11-10). Sizes and CSS were already in the spec's `styles` and the CSS Module, so they were cut, not moved. Two facts moved: TextField's decorative-icon note to `spec.accessibility.notes`, and CardHorizontal's "the parent supplies the dark fill, never `data-theme="dark"`" to a `composition.donts` entry, because the layout writer is the one who has to supply it.

| Option | Before | After |
|---|---|---|
| Text `size.body-default` | "Standard body copy. 1rem, regular weight, 1.5 line-height." | "Body copy and descriptions." |
| ScrollArea `orientation.horizontal` | "overflow-x: auto; overflow-y: hidden. Use with Inline(wrap=false) for horizontally scrollable card rows." | "A row of cards that scrolls sideways; put an Inline with wrap=false inside." |
| Chip `pressed.false` | "Resting state. Transparent background, subtle text, default border." | "A filter that is off." |
| Text `color.brand` | "Brand-coloured emphasis; use sparingly for accent text." | "A word or phrase that needs accent emphasis. Brand color." |

The last row shows rule 3: "use sparingly" became the situation that earns the option.

**Top-level `useWhen` lines** (rewritten 2026-11-10). Instructions and don'ts mixed into a situation list were split out: the situation stays, the rule moves to `donts`.

| Field | Before | After |
|---|---|---|
| CardVertical `useWhen` | "Completed is derived, not a prop: progress >= 100 adds … In a parts composition, render `<CardVertical.Completed />` inside CardVertical.Meta yourself." (35 words) | "The learner has finished the course: progress of 100 or more adds a Completed marker, and the bar stays." The parts instruction became a `donts` entry. |
| Icon `useWhen` | "Opening an overflow menu …; always inside an icon-only Button with an aria-label and `aria-haspopup="menu"`, never as a bare clickable glyph" | "An overflow menu of secondary actions (more-vertical, the 'kebab'), inside an icon-only Button." The "never" became a `donts` entry. |
| TextField `useWhen` | "The value is typed, not selected — use Select for predefined option sets" | "The value is typed, not chosen from a list." `notFor` already points to Select. |

**Placeholder axes (removed).** Divider, Accordion, Checkbox and 8 others had `"variant": { "options": ["default"], … }` with no `variant` prop. The 2026-06-17 schema required at least one axis, so every component declared one. Now `variants` is optional, and `usage:validate` fails when an axis isn't a spec prop (ADR-001 third amendment of 2026-11-10).

## What the lint checks, and what it can't

`scripts/validate-usage.js` checks:

- The description opens on "A " or "An " followed by a lowercase word, has at most 25 words, and has no ADR number.
- Each `useWhen` line, variant option line and pattern `useWhen` has at most 20 words.
- No usage prose contains a px/rem size or a CSS declaration.
- Every variant axis is a prop in the spec.

The prose checks fail the gate. They ran as warnings while the 26 other components were rewritten (78 at the start, 0 at the end, all on 2026-11-10); `PROSE_FAILS` in the script then flipped to `true`.

The lint can't check rules 1, 3, 4, 5, 6 or 7: whether a line names a situation, gives a test or says why. Those need a reader. The checklist below is for that read.

## Checklist before committing a usage file

1. Every field has a reader you can name.
2. The description is one sentence: "A <noun> that …", no sizes, props or ADRs.
3. Every `useWhen` line is a situation the layout writer could be in.
4. Every variant option says when first, then at most one clause on the look.
5. Every don't has a *because*. A wrong pick names the component to use instead.
6. Anything countable is a `limit` or `nests`, not prose.
7. Sizes, CSS and prop rules are in the spec, not here.
8. Nothing repeats what another field or a gate already says.
9. `npm run usage:validate` passes.

## What's still open

- **Unmeasured.** The pattern-accuracy harness is frozen at `044d28f` (ADR-029), so none of this has been shown to change `/layout-generation`'s output. The case rests on the reasoning above and the byte count (112 KB → 82 KB after the migration, before the rewrite). A pre-registered eval, or the first real layout runs, would test it.
- **Deliberately left out.** A content and overflow section (GOV.UK copy per state, Carbon overflow), the strongest gap in the toolkit-research benchmark: it would add bytes to every run for a problem this library's 27 components rarely have. Known gaps go to GitHub issues, not into usage prose.

## Related

- Docs: [Machine-readable metadata](10-machine-readable-metadata.md) (what each field is and who reads it), [Context engineering](09-context-engineering.md), [Component lifecycle](02-component-lifecycle.md)
- ADRs: [001 — Component metadata schema](decisions/001-component-metadata-schema.md) (amendments of 2026-11-10), [024 — Button variants by weight](decisions/024-button-variants-by-weight.md), [026 — Prop vocabulary](decisions/026-component-prop-vocabulary.md), [027 — Component spec file](decisions/027-component-spec-file.md)
- Handoff: `2026-11-10-metadata-to-usage-rename.handoff.md` in `.claude/handoff/`, or `archive/` once done (the audit, the anti-pattern sort, the pattern triage)
