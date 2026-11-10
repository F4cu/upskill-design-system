---
title: "ADR-001 — Component Metadata Schema for Machine-Readable Design System"
---
# ADR-001 — Component Metadata Schema for Machine-Readable Design System

**Date:** 2026-06-11
**Amended:** 2026-11-10
**Status:** `accepted`

## Context

The design system roadmap includes developer-triggered **agentic moments** — component scaffolding and layout generation among them — that read structured per-component context to do their work. (These were originally framed as "Phase 3 agentic loops"; the lite-agentic model later replaced always-on loops with a fixed set of developer-triggered moments, now Phase 7.) For those to work, agents need structured context about each component — not just its props and styles, but its purpose, constraints, anti-patterns, and relationships.

Without a shared schema defined upfront, each component would accumulate ad-hoc documentation in inconsistent shapes, making it impossible to build reliable tooling on top.

Two format options were evaluated:
- **Markdown spec files** — human-readable, low friction to write, used by hvpandya.com's approach
- **JSON metadata files** — machine-readable, validates against a schema, higher initial cost to author

Research by Indeed (Diana Wolosin, Into Design Systems 2025) benchmarked 8 MCP configurations across 1,056 prompts and found JSON reduced token cost by ~80% vs Markdown with equal or better accuracy. The reason: JSON is unambiguous — explicit keys, explicit values, no parsing required.

The schema structure was synthesised from three sources:
- **giorris.dev** — base structure (`usage`, `variants`, `aiHints.selectionCriteria`, `antiPatterns`)
- **hvpandya.com** — `anatomy` and `tokens` (explicit list of semantic token paths per component)
- **LLM Component Schema Standard** (petrilahdelma) — `generativeRules` for context-aware agent instructions

## Decision

All components in `packages/components/src/` will ship with a co-located `ComponentName.metadata.json` file validated against `packages/components/component.schema.json`.

The schema defines seven required top-level properties: `component`, `usage`, `variants`, `states`, `tokens`, `accessibility`, and `relationships`.

Key design choices:
- `status` (`draft` / `stable` / `deprecated`) lives inside `component.status`, not as a top-level section — status is a property of the component itself, not a parallel concern
- `usage` splits agent guidance into `keywords` (intent-matching terms) and `when` (scenario guidance)
- `usage.antiPatterns` requires all three fields (`scenario`, `reason`, `alternative`) — partial guidance is not useful to an agent
- `relationships` is the richest section for layout generation: `accepts` and `containedBy` enforce parent-child constraints; `neverPairWith` prevents illegal sibling combinations; `compositionPatterns` provides named, tested starting points; `layoutBehavior` describes fill/hug/fixed width and display type
- `tokens` categorises semantic paths by type (`color`, `spacing`, `typography`, `borderRadius`, `other`) — aligns with the three-layer token model and supports deprecation analysis
- `figmaNodeId` is an optional field inside `component` to support Figma ↔ component traceability
- `additionalProperties: false` is enforced throughout — schema drift is caught at validation time

### Deliberately excluded (do not re-add without a new ADR)

These came from the source inspirations, or from an early draft of the schema, and were intentionally left out. They are recorded so they are not reintroduced as oversights:

- **`anatomy`** — part-by-part structural documentation. Human-readable and doesn't reduce agent token cost; it lives in Storybook stories instead.
- **`aiHints` / `generativeRules`** — catch-all sections for agent instructions. Guidance is instead distributed where it carries structural meaning: `usage.keywords`, `usage.when`, `relationships.compositionPatterns`, and `relationships.layoutBehavior`. (`aiHints` was briefly present in the schema and removed in commit `30e769d`.)
- **`useCases`** — a flat scenario array. Replaced by the `usage.keywords` (intent-matching) + `usage.when` (scenario guidance) split, which serves both component selection and layout generation.

The schema must be defined and reviewed before any component is built so that the first component (Button) establishes the pattern correctly.

## Consequences

- Every new component requires a metadata file — this adds authoring overhead per component
- The schema becomes a contract: changes to it are breaking for any tooling built on top (MCP server, Airtable sync, Storybook metadata panel)
- Agents consuming this system get reliable, token-efficient context without needing to parse implementation code
- The `tokens` section creates a living map of which semantic tokens are actually in use — useful for deprecation analysis
- The expanded `relationships` section is the primary input for the layout generation agentic moment — `accepts`/`containedBy` are structural rules an agent must not violate
- Excluding `anatomy` reduces authoring overhead without losing machine-readable value; human-readable anatomy can live in Storybook stories instead
- Schema validation can be added to CI as a lightweight check alongside the token build

## Amendment (2026-06-17) — Named variant axes, unified taxonomy, enforced validation

A foundation review before Phase 5b found the schema and the committed metadata had drifted: 7 of 11 metadata files failed the schema, and the schema could not express a component with more than one variant axis (Button had bolted on illegal top-level `sizes`/`shapes` keys). Three refinements:

1. **`variants` is now a map of named axes.** It changed from a single `{ options, default, purpose }` object to an object keyed by axis name (`variant`, `size`, `shape`, …), each axis holding `{ options, default, purpose }`. A component with one visual axis uses a single key named `variant`; a component with no visual variation declares `variant` with one `default` option; `default` may be `null` for an axis that is off unless set (e.g. Button `shape` for icon-only mode). Rationale: Button (variant + size + shape), TextField (icon + size + shape), and every Phase 5b/5c component (Avatar `size`, Chip `state`, PaginationArrows `direction` + `state`) have multiple independent axes. The old single-axis shape could not represent them honestly.

2. **One taxonomy, enforced.** `component.category` ∈ `atom | molecule | organism | layout` and `component.type` ∈ `interactive | display | container | input` are applied consistently across all files. Earlier files used a parallel ad-hoc vocabulary (`primitive`, `typography`, `media`, `action`) that validated against nothing. Mapping: layout primitives → `layout`/`container`; Text/Heading/Icon → `atom`/`display`; Button → `atom`/`interactive`; form components and Card keep `molecule` with `input`/`container`.

3. **Validation is enforced in CI** — realising the final consequence above. `scripts/validate-metadata.js` (ajv, draft 2020-12) validates every metadata file plus the example against the schema and checks that `component.name` matches its folder; `.github/workflows/components-check.yml` runs it alongside typecheck and build on every PR touching components. Schema/metadata drift can no longer merge silently.

`accessibility.notes` (optional string) was also added — several components carried guidance the `role`/`ariaAttributes`/`keyboardInteractions` fields could not hold.

The contract warning above still holds: this was a breaking change to the `variants` shape, so all 11 metadata files plus `component.metadata.example.json` and the component-scaffold command prompt were migrated in the same change.

## Amendment (2026-07-23) — `relationships` renamed to `composition` (recorded retroactively)

Commit `d89782a` (2026-06-24) reshaped the relationship section without a matching amendment here; this records it so the ADR prose matches the live schema:

1. **`relationships` → `composition`.** The top-level section is named `composition`; the seven required properties are `component`, `usage`, `variants`, `states`, `tokens`, `accessibility`, `composition`.
2. **`compositionPatterns` moved to `usage.patterns`.** Named, proven compositions live under `usage` alongside `keywords`/`when`/`antiPatterns` — they are guidance for choosing and combining the component, not structural constraints.
3. **`neverPairWith` dropped, absorbed into `usage.antiPatterns`.** Five files had populated it (the three Card variants' mutual-exclusion rules, Chip↔Button, Image↔Avatar). Those constraints survive as anti-patterns — e.g. Card's "Using Card as a sibling of CardVertical or CardHorizontal in the same layout group" — where each carries a `reason` and `alternative` instead of a bare name list; self-nesting rules moved to `layoutBehavior.canNest`. Per the "deliberately excluded" convention above, do not re-add it without a new ADR.

`composedOf` (internal library dependencies) has been part of the section since the original schema. References to `relationships` elsewhere in this ADR are preserved as written; read them as `composition`.

## Amendment (2026-10-07) — `tokens` lists what the component itself reads, enforced

`tokens` was hand-written and never checked against the code. Issue #117 found 11 of 27 components out of step with their CSS Modules. Seven left out tokens their CSS reads (AppHeader missed nine). Others listed tokens their CSS never reads, either stale (Text listed `font.weight.medium`; its CSS uses `bold`) or applied by a child component (CardVertical listed `color.text.subtle`, which reaches it through `<Text color="subtle">`).

**Decision.** `tokens.*` lists exactly the tokens the component itself reads: `var(--ds-*)` in its CSS Module or its `index.tsx`. A TSX template prefix counts, so Avatar's `` var(--ds-size-avatar-${size}) `` covers `size.avatar.*`. A token applied by a child component (a Text color, a Stack gap, a Heading size) belongs to the child's metadata, not the parent's.

`scripts/validate-metadata.js` enforces both directions. A token read by the CSS Module but not listed fails, and so does a listed token that neither file reads.

**Why this rule:** it is the only one a script can check. It also keeps the token map complete for deprecation analysis: every token a component renders is read by some component's CSS, so it is listed in that component's metadata. The route a child token takes is recorded where it is useful to a builder, in the component spec's `anatomy[].builtOnProps` (ADR-027).

**Alternative considered:** waiting for ADR-027 to move `tokens` into the spec, where `spec:validate` already enforces this for the two pilot components. That would leave 25 components unchecked until the pilot is decided. If ADR-027 is accepted, the check moves with the section.


## Amendment (2026-10-11) — `states`, `tokens` and `accessibility` move to the spec file

ADR-027 accepted the spec file after the harness arm (2026-10-08) and listed this move as its first follow-up. Metadata keeps what `/layout-generation` reads: `component`, `usage`, `variants`, `composition`. The sections only the builder moments read (`/component-scaffold`, `/review-component`, `a11y-coverage.js`) go where they are read.

**Decision.**

- A component **with** a `<Name>.spec.json` keeps `states` and `accessibility` in the spec, and has **no** `tokens` list: its tokens are the ones its spec `styles` reference, which `spec:validate` already checks against the CSS Module. `scripts/validate-metadata.js` fails if such a metadata file still carries any of the three sections.
- A component **without** a spec keeps all three in metadata, still required and still checked as before, including the 2026-10-07 rule that `tokens` lists what the component itself reads. `component.schema.json` no longer lists them as required; the validator makes them required exactly when there is no spec.
- Readers go through `readComponentMetadata` in `scripts/lib.js`, which returns the metadata with `tokens` (derived from the spec's styles, grouped by the same five categories) and `accessibility` taken from the spec. `a11y-coverage.js`, `component-risk.js`, `handoff-tidy.js`, `generate-pattern-schema.js`, `sense-component.js` and the Airtable component push use it, so none of them cares which file holds the data. Only Button and CardVertical have a spec, so the move is complete for those two now and finishes for the other 25 with the ADR-027 backfill.

**The `anatomy` exclusion is reversed for the spec file only.** Metadata still has no `anatomy`; the spec's `anatomy` section is the place for it (ADR-027). The "Deliberately excluded" list above stands for metadata.

**Consequences.**

- The rule that `tokens` lists only what the component itself reads now holds by construction for spec components: the list is derived, never written. CardVertical's six unread tokens (`color.text.*`, `font.family.headline-serif` and others) are gone from its token list, and so from its Airtable row on the next push.
- `npm run metadata:derive-tokens` refuses components that have a spec.
- Measured on the two migrated components: metadata, which `/layout-generation` reads for all 27 components, shrinks by 27% (Button, 9.9 KB to 7.2 KB) and 21% (CardVertical, 21.1 KB to 16.6 KB). A builder moment reading both files sees only 10% and 5% less (19.4 KB to 17.4 KB, and 39.3 KB to 37.4 KB), because the spec absorbs `accessibility`. The +31% to +55% overhead ADR-027 measured came mostly from sections that stay in the spec; it falls away only as the spec's own size does.
- The required-until-spec rule is temporary. When the backfill gives every component a spec, `states`, `tokens` and `accessibility` leave the metadata schema and the validator check goes with them.

## Amendment (2026-10-11) — The transitional rule ends: metadata has no `states`, `tokens` or `accessibility`

The earlier amendment of this date kept the three sections in metadata for components without a spec. Every component now has a spec (ADR-027 amendment of this date), so the exception is gone.

- `component.schema.json` no longer defines `states`, `tokens` or `accessibility`. Metadata that carries them fails the schema, and `scripts/validate-metadata.js` says where they went. The required top-level properties are `component`, `usage`, `variants` and `composition`.
- The token list is the set of tokens a spec's `styles` reference. `spec:validate` checks it against the CSS Module and now also against `index.tsx`, because a size read through a template (`var(--ds-size-avatar-${size})`) is a real read. `npm run metadata:derive-tokens` and its script are deleted.
- `readComponentMetadata` in `scripts/lib.js` stays as the one reader that returns metadata with `tokens` and `accessibility` merged in from the spec. The a11y gate, the review-risk script, the pattern aggregate, the component snapshot and the Airtable push use it.
- The metadata that `/layout-generation` reads for all 27 components went from 151 KB to 113 KB (−25%).
- Of the 27 token lists, one changed when derived from the specs: Avatar had listed `size.avatar.sm` and `size.avatar.md`, which only `index.tsx` reads. Its spec now states them as `size` rules, so nothing is lost.
- The 2026-10-07 rule that `tokens` lists only what the component itself reads holds by construction for all components now. There is nothing to hand-write and nothing to keep in step.

## Amendment (2026-11-10) — `metadata.json` becomes `usage.json`, relabelled around composition

Since ADR-027 moved the builder sections to `<Name>.spec.json`, the metadata file only holds what `/layout-generation` reads to choose and combine components, for all 27 components on every run. A schema audit (handoff `2026-11-10-metadata-to-usage-rename`) measured what those 112 KB hold and who reads each field:

- `antiPatterns` is 32% of the bytes. Of the 106 entries, 35 are wrong picks, 30 are composition rules, 37 are rules about setting props at the call site, and 4 are about how the component is built. One list held four kinds of rule with four different readers.
- Nothing reads `usage.keywords`, `layoutBehavior.displayType` or `layoutBehavior.canNest`. `composedOf` repeats what `generate-pattern-schema.js` already reads from the JSX. `component.category` is read only to test for `"layout"`.
- `validate-layout` checks `accepts`/`containedBy` for parts only. Its one count rule (accent Button at most once per region, never in a repeated item) is hard-coded, and the same rule is written as prose in three places in Button's metadata.

Other systems were compared on how they document composition (Carbon, GOV.UK patterns, Atlassian primitives, shadcn registry, Custom Elements Manifest, Nathan Curtis on Figma slots). None has a better vocabulary than `accepts`/`containedBy`/`parts`, and the Custom Elements Manifest has no parent/child field at all. What Carbon (one primary per region) and Curtis (`minItems`/`maxItems` per slot) add is **counts as data**.

The system has 27 components with mostly distinct roles, read whole, so choosing a component is rarely the hard part. The hard part is composition: what weight an action gets in a given container, what nests where, which tree a region uses. The file is relabelled to make composition its main content, and renamed for its role. "Usage" covers how to use a component, not only when to pick it. No industry `usage.json` convention was found; the name is chosen for its meaning alone.

**Decision.** One breaking change, in a single migration:

1. **Rename.** `<Name>.metadata.json` → `<Name>.usage.json`, validated by `component.usage.schema.json` (`npm run usage:validate`).
2. **Flatten `usage`.** Its fields move to the top level, so the file name and an inner key no longer collide.
3. **Field map.**

   | Old | New |
   |---|---|
   | `component.{name, type, status, description, figmaNodeId}` | unchanged; `type` gains `layout` |
   | `component.category` | dropped (only `"layout"` was read; now `type: "layout"`) |
   | `usage.keywords` | dropped (no reader) |
   | `usage.when` | `useWhen`: when to use this component at all. Lines that name a variant move to the option level. |
   | `usage.patterns` | `patterns`, shape unchanged |
   | `usage.antiPatterns`, wrong picks | `notFor[]`: `{ case, because, instead }`. `instead` is a fixed-set name, checked by the validator, or `null` when the alternative is outside the library. |
   | `usage.antiPatterns`, composition | `composition.rules[]`: `{ case, because, do }`, or `composition.limits` / `composition.nests` when the rule can be stated as data |
   | `usage.antiPatterns`, call-site props | `spec.json` `constraints`: prop combinations, required props, and content-format rules as documented-only constraints on the prop (empty `enforcedBy`). Rules a type already enforces and restatements of the inline-style ban are deleted. |
   | `usage.antiPatterns`, build rules | `spec.json` `decisions` / `accessibility.notes`, or `packages/components/AGENTS.md` when they apply to new components |
   | `variants.<axis>.purpose` | `variants.<axis>.useWhen`: option → situation first, then at most one clause on how it looks (to map Figma instances). Sizes in px and required props go to the spec. |
   | `composition.{accepts, containedBy, parts}` | unchanged |
   | `composition.composedOf` | dropped (derived from the JSX) |
   | `composition.layoutBehavior.widthBehavior` | `composition.width` |
   | `composition.layoutBehavior.displayType` | dropped (no reader) |
   | `composition.layoutBehavior.canNest` | `composition.nests`, enforced by `validate-layout`. Replaces the five "X inside X" anti-patterns. |
   | — | `composition.limits[]`: `{ if, max, per, because }`, `per` ∈ `region` (nearest `<section>`) · `repeated` (inside a repeated item: CardVertical, CardHorizontal or a `.map()`) · `parent` (direct parent). `validate-layout` checks it, replacing the hard-coded accent rule. |

4. **`/layout-generation` also reads `spec.constraints`.** The call-site prop rules are still read by whoever writes the layout, because that's who sets the props. Constraints are small (2 across all specs today, about 14 more after the move) and checkable; prose anti-patterns are not.
5. **`/extract-learnings` routes each finding** to `notFor`, `composition.rules`/`limits`, or `spec.constraints`, using the split above.

**Kept on purpose.** `component.status` stays: it is the Maturity axis that ~12 scripts and the Airtable push read (ADR-010), and moving it saves nothing in a whole-file read. `figmaNodeId` stays for now, although `spec.figma.sets[0].nodeId` duplicates it; removing it touches `airtable-sync` and is a separate change.

**Not a revival of `neverPairWith`.** `notFor` names a replacement and a reason for a wrong *pick*. It is not a list of forbidden siblings. Mixing rules (one card type per section) are `composition.rules`, owned by one component and not copied to each one involved.

**Alternatives considered.**
- *Picking fields from the toolkit-research benchmark* (`pick_when`, aliases, lookalike sections, content and overflow rules). That benchmark is for a 195-entry library searched through a shortlist; here 27 files are read whole. Lookalike `instead` is kept only where real lookalike groups exist (Badge/Chip, the three cards, Button/ButtonArrow/TextLink). Keywords are dropped.
- *A separate patterns file* (as GOV.UK patterns or shadcn blocks are separate items). A whole-file read gains nothing from that split, so patterns stay per component, with the two duplicated ones (`certified-badge`, `form-field-stack`) kept on one owner.
- *Moving every non-pick anti-pattern to the spec* (the audit's first proposal). Rejected for call-site rules unless `/layout-generation` reads them there (point 4).

**Consequences.**
- Every reader of the old names moves in the same change: the validator, `lib.js`, `sense.js`, the docs component page, the commands and the `AGENTS.md` files. Recorded history (archived handoffs, harness results) keeps the old names.
- The files `/layout-generation` reads shrink from 112 KB to 82 KB (−27%), or about −24% counting the spec `constraints` it now also reads. The audit estimated 30–35%; the rest depends on the wording pass (situation-first `useWhen`, descriptions that open on a category noun), which is not part of this change.
- The pattern-accuracy harness can't confirm that layout accuracy held: it is frozen at the pre-spec architecture and refuses to run on HEAD (ADR-029 amendment 2026-10-12). Checking this change needs its own pre-registered eval on the current schema, or the first real `/layout-generation` run with the new files. Until then, the claim that nothing the layout writer needs was lost rests on the sort of all 106 anti-patterns, each one placed by hand.
- Composition rules that can be counted become checks. Rules that can't stay as prose with a `because`.
- The "Deliberately excluded" list gains `keywords` (no reader; its intent-matching role never materialised) and `composedOf` (derived).

## Amendment (2026-11-10, second) — composition labels, and patterns become names with stories

A review of `Button.usage.json` after the rename found two labels still unclear, and the content sweep that followed (handoff `2026-11-10-metadata-to-usage-rename`, "Content sweep result") moved 3 rules to `notFor`, deleted 4 and trimmed 3.

**Labels.**

| Old | New | Why |
|---|---|---|
| `composition.rules[]` `{ case, because, do }` | `composition.donts[]` `{ case, because, instead }` | Every entry is a don't with a do (Atlassian/Primer do/don't pairs); "rules" read like another `useWhen`. Same shape as `notFor`, so there's one shape to learn: in `notFor`, `instead` is a fixed-set component name (validated); in `donts` it's prose. |
| top-level `patterns` | `composition.patterns` | The top level answers *should I pick this component?* (`useWhen`, `notFor`, `variants`); `composition` answers *how do I assemble it?* For readability only: no script or agent gain is claimed. |
| `patterns[].description` | `patterns[].useWhen` | Most descriptions restated the tree. A situation-first line is what matches a pattern to a brief. |

`patterns[].name` stays: it's the id shared by the usage entry, the Storybook export (PascalCase), the Figma example frame and `spec.anatomyExamples[].pattern`. `usage:validate` now checks that it's unique across the set.

**Patterns are names, and the code lives in stories (option D).** Pattern `tree`s were hand-written shorthand that nothing parsed, so a tree could name a missing component, an invalid prop or a forbidden nesting, and no gate would notice. No system compared writes a tree in metadata. Polaris lists example files, Atlassian keeps an `examples/` folder, Primer splits `.examples.stories.tsx` from the component stories, and the Storybook MCP manifest generates snippets from stories. A pattern is now `{ name, useWhen }`, and its code is the same-named export in `<Name>.patterns.stories.tsx`. `/layout-generation` reads names and `useWhen` lines for all 27 components, then opens a patterns story file only for the patterns it picks. `tree` was kept as an optional field only until each pattern had its story, then removed from the schema.

**Triage.** The 62 patterns became 24: 23 kept plus `page-landmarks`, which merges the five Box landmark patterns and AppHeader's shell. 39 were removed: preset prop combinations that are state stories (6), a component's internal markup (5), merges into a kept pattern (14), trivial shapes (11), and trees that contradicted another rule (3). The kept patterns are listed in the handoff, along with the 2 inline-style trees that wait on #151.

**Figma.** The ADR-023 rule of one example frame per pattern now covers compositions only. The component set is the variant matrix, so the 6 CardVertical frames that showed states were deleted. Example sections for the other owners' patterns follow their stories.

**Alternatives considered.**
- *A: leave trees as they are.* Rejected because drift stays invisible.
- *B: parse trees in `usage:validate`.* That needs a grammar and a parser to keep a second notation honest. Rejected because D removes the notation instead.
- *C: generate trees from stories.* That gives one source and keeps the trees, but `/layout-generation` would still read 24 trees on every run that it can't run or type-check. D keeps that context small and puts the code where the compiler checks it.
- *Linking each pattern to a story URL.* Rejected because the name is already the link (the convention `anatomy:test` and `AnatomyOverlay` use), so a URL field would duplicate it.

**Consequences.**
- Readers move in the same change: the schema, `validate-usage.js`, `validate-spec.js`, the docs component page, `/layout-generation`, `/extract-learnings`, `/component-scaffold`, `packages/components/AGENTS.md`, and docs 02, 06, 10, 11 and 12.
- Done the same day: all 24 patterns have their story; `usage:validate` fails when the exports of `<Name>.patterns.stories.tsx` and the pattern names differ; `anatomy:test` and `AnatomyOverlay` read pattern stories from that file, and the axe sweep's `*.stories.tsx` glob already covers it (screenshots stay `--default` only); `tree` is gone from the schema and the files. The four `src/stories/` examples the patterns replaced (CourseModuleList, Carousel, SettingsForm, FooterHighlights) were deleted; CourseSlider and the Landing Page stay as page-level examples. `/layout-generation`'s carousel and show-more recipes now point at the stories and keep only the showcase classes.
- Whether `/layout-generation` still picks the right shapes without trees is unmeasured, because the harness is frozen. Either the first real runs check it, or a pre-registered eval with and without patterns does (ADR-029).
