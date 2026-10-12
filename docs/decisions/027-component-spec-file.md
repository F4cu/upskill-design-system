---
title: "ADR-027 — Component spec file, split from metadata by reader"
---
# ADR-027 — Component spec file, split from metadata by reader

**Date:** 2026-10-07
**Status:** `accepted`
**Amended:** 2026-10-12

## Context

The ds101 page on [component specs](https://f4cu.github.io/ds101/component-specs/) asks a spec for things `<Name>.metadata.json` does not hold:

- **Anatomy:** every named part, with its role and what activating it does. ADR-001 left `anatomy` out on token-cost grounds. Only ADR-023 compound parts are recorded (`composition.parts`), so Button's icon, label and trailing icon are not recorded anywhere.
- **The whole API:** every prop with its type and default, including non-enum and code-only props. `variants` only lists enum axes.
- **Prohibited combinations as data.** Today they are prose. "Requires the icon prop and an aria-label" sits inside `variants.shape.purpose`.
- **A token for each styled value.** `tokens` is a flat list per category. It cannot say which part uses a token, or in which state.
- **Decisions design files cannot show:** Figma property mappings, divergences and the sets a component spans. These live in ADR-026 prose and in memory notes.

ds101 also says "a description informs, a contract arbitrates": a spec is only useful when something checks it.

Two facts about this repo shape the answer:

1. **Metadata has two kinds of reader.** `/layout-generation` reads all 27 metadata files on every run, for `usage`, `variants` and `composition`: how to choose a component and put it together with others. The builder moments (`/component-scaffold`, `/review-component`, `a11y-coverage.js`) read one component at a time, for `states`, `tokens` and `accessibility`: what to build. Every gap above is builder information. Adding it to metadata would make layout generation pay for it 27 times on every run.
2. **ADR-026 already has the "agree before building" step, but nothing keeps its output.** `/component-scaffold` produces an API proposal (anatomy, a props table with Figma surface, divergences) and stops for approval. The approved table lives only in the chat. ADR-026 rejected a `props` section in the metadata schema for two reasons: it would break the ADR-001 contract, and it would duplicate the TypeScript types.

Writing a pilot spec for Button found five problems that nothing reported:

- `metadata.tokens` leaves out two tokens the CSS Module reads: `font.line-height.none` and `border-radius.full`.
- The icon-only rule (`shape` requires `icon` and `aria-label`) is not enforced by the types. The components rules ask for type-enforced anti-patterns.
- Button has no focus style and no focus token; the browser's default ring applies.
- ADR-026 lists Button `shape` as a code prop with no Figma property. In fact icon-only buttons are a separate Figma set, `Button icon` (`54:1192`).
- The `1px` border width is a literal in 15 CSS Modules. No border-width token exists.

The options were:

1. **Extend `component.schema.json`.** This breaks the ADR-001 contract and grows the context `/layout-generation` reads on every run.
2. **A Markdown spec page per component.** ADR-001 already rejected Markdown for agent context. Nothing could validate it, and it would go stale like any doc page.
3. **A separate `<Name>.spec.json` for the builder reader, checked against the code.**

## Decision

Option 3, as a pilot.

### The file

`<Name>.spec.json` sits next to the component and is validated against `packages/components/component.spec.schema.json`. It has these sections:

| Section | Holds |
|---|---|
| `anatomy` | Every named part, internal elements included: element, `builtOn`, `role`, `action`, `required`, `when`. Names follow the ADR-023 naming contract. |
| `props` | The approved ADR-026 API proposal, kept: `kind`, `type`, `options`, `default`, vocabulary `concept`, and `figma` (`surface`, `property`, `set`). |
| `constraints` | Combinations a component requires or forbids (`if` / `require` / `ignore` / `forbid`), each with an `enforcedBy` list (`type`, `test`, `lint`). Where a component is placed stays in `usage.antiPatterns`. |
| `states` | Every state with its ADR-025 kind (`interaction`, `appData`, `lifecycle`, `content`) and its trigger. |
| `styles` | Part → ordered rules of `when` (prop values and state) → CSS property → value. A value is a token path, a `{ literal, reason }` or a `{ sameAs }`. A raw value can still appear, but it has to say why. |
| `figma` | The component sets it spans, and recorded divergences with the decision on each. |

### Who reads it

- `/component-scaffold` writes it from the approved API proposal **before** any code exists. This makes it a spec of intent, not a description of what was built.
- `/review-component` reads it to review the code against the spec.
- `/layout-generation` **never** reads it, and `generate-pattern-schema.js` does not aggregate it. The ADR-013 rule still holds: each reader gets the narrowest context.

### Why the duplication is acceptable

TypeScript stays the source of truth for what was built. The spec is the agreed intent. `npm run spec:validate` (`scripts/validate-spec.js`, in `components-check.yml`) fails when the two disagree:

- **Props:** every prop the component declares is in the spec, and every spec prop exists. Variant-axis options match the TypeScript union and the metadata axis. Destructuring defaults match.
- **Styles:** the token paths in the spec equal the `--ds-*` properties the CSS Module reads, and each one is defined in the built token CSS.
- **Cross-references:** anatomy, states, constraints and `when` keys resolve, and every metadata state appears in the spec.
- **Unenforced constraints** (an empty `enforcedBy`) are listed as backlog items, not failures. This follows the shrinking-ledger convention of `a11y-backlog.json`.

This answers ADR-026's objection. The metadata schema is untouched. When the same fact lives in two places and a check fails on disagreement, that is a contract, not drift.

### Pilot and exit condition

The pilot covers Button (an atom) and CardVertical (a compound component with ADR-023 parts). During the pilot:

- Specs are optional. The validator checks only components that have one.
- Metadata is unchanged. `tokens`, `states` and `accessibility` stay where they are, so the pilot specs repeat them.

**Accept** when both of these hold:

- The pattern-accuracy harness, with a third arm (metadata + spec), shows component scaffolding does not get worse.
- CardVertical's parts fit the schema without new top-level keys.

On acceptance:

- Move `tokens`, `states` and `accessibility` from metadata into the spec. This is a breaking change to the ADR-001 contract and needs an ADR-001 amendment, which also reverses the `anatomy` exclusion for the spec file. Migrate `a11y-coverage.js`, `validate-metadata.js` token resolution, `sense-component.js` and Airtable sync.
- Change `/component-scaffold` step 3 to write `<Name>.spec.json`.
- Make a spec required for every component. Generate `props` and `styles` with a script from the props types and CSS Modules; the agent writes only anatomy roles and constraints.
- Correct ADR-026's known-gaps line about Button `shape`.

**Reject** if the harness shows scaffolding gets worse, or if keeping specs up to date costs more than the drift it catches. In that case delete the spec files and the validator; metadata is untouched.

The harness plan (Arm C, two tasks, the `spec:conformance` gate, and what "not worse" means) is in `.claude/handoff/archive/2026-10-07-spec-harness-arm.handoff.md`.

## Consequences

- Each kind of reader has its own file. Layout generation's context does not grow, and gets smaller once the migration moves three sections out.
- Facts that design files cannot carry (roles, banned combinations, code-only props, Figma set mappings) now have a field that a schema checks.
- A raw value in `styles` must state its reason. The validator catches a token that the CSS reads but the spec leaves out, which is the gap `metadata.tokens` has had.
- Each component gets one more file to keep in sync. The validator makes that cost visible instead of letting drift pass silently. The real burden can only be judged after the CardVertical pilot.
- `spec:validate` needs built tokens. In CI it runs after `tokens:build`.
- The five problems the Button pilot found are reported but not fixed in this change. Two are already visible in the spec: the unenforced icon-only constraint (validator backlog) and the missing focus style (the `focus-visible` state notes).

## Amendment (2026-10-07) — CardVertical pilot

`CardVertical.spec.json` is written and passes `spec:validate`. The second exit condition is met: the parts fit without new top-level keys. They did need four additions inside existing sections, which this amendment records as part of the schema:

- **`anatomy[].parent`** records nesting. A compound component has 22 named elements in four levels, and a flat list can't show which `Icon` belongs to which part.
- **`anatomy[].builtOnProps`** records the fixed props a part passes to its child component (Title → Heading `size=headline-serif`, Body → Stack `gap=sm`). This is where most of a compound component's look comes from, and it never appears in its own CSS Module.
- **A `template` style value** embeds `{token.path}` references in a composite CSS value: the halo `drop-shadow(...)` and `calc(100% + {space.stack.xs})`. The validator extracts the token paths from it.
- **An `element` prop kind** for `as`. ADR-026's kind list had no row for it.

Part props are keyed `<Part>.<prop>` inside `props`. The validator reads each `<Name><Part>Props` type and checks completeness, options and defaults per part. It also checks that every metadata `composition.parts` entry appears in `anatomy` with the same `builtOn`.

**Size.** The CardVertical spec is 18 KB and its metadata 21 KB; for Button the two are about 9 KB each. Until the migration moves `tokens`, `states` and `accessibility` out of metadata, a builder moment reading both files roughly doubles its per-component context. The harness arm has to weigh that against any accuracy gain.

**What the pilot found:**

- `Root` sets `min-width: 220px` / `160px`. These are raw px values in a CSS Module, which the component rules forbid; the tokens-author convention is a size primitive plus a device alias.
- `metadata.tokens` lists six tokens the CSS Module never reads (`color.text.*`, `font.family.headline-serif`, `font.weight.medium`, `font.line-height.tight`, `space.inline.sm`). They reach the card through `Heading`, `Text` and `Inline`. The spec states this through `builtOnProps` rather than listing other components' tokens. This is part of #117.
- No opacity or z-index token scale exists. The thumbnail hover `0.8` and the overlay stacking (`1`, `100`) are literals with reasons.
- The one prop constraint, controlled `pressed` wins over `defaultPressed`, is already enforced by a behavioural test. CardVertical's other rules are about composition (what a part accepts) and belong in metadata `composition.parts`.

## Amendment (2026-10-08) — Harness arm result: accepted

The first exit condition is met. The pattern-accuracy harness ran Arm A (brief + API table + dependency metadata + schema) against Arm C (A + the target's `<Name>.spec.json`), N = 3 runs per task, on 2026-10-08. The accept bar was registered before any run: Arm C's median headline total ≤ Arm A's on each task.

| Task | Arm A median (range) | Arm C median (range) | Spec conformance A → C | Prompt chars A → C |
|---|---|---|---|---|
| `component-button` | 35 (33–35) | 0 (0–2) | 38 → 26 | 16,302 → 25,209 (+55%) |
| `component-cardvertical-parts` | 9 (7–12) | 4 (4–6) | 46 → 39 | 57,276 → 75,152 (+31%) |

Arm C is better on both tasks, so the bar is met. The developer's prediction ("better, especially in prop and accessibility compliance") holds for props: spec conformance improves on both tasks. It shows nothing for accessibility: `lint` and `a11y:coverage` scored the same in both arms, and this harness never runs axe.

**Why the size of the win is overstated:**

- **Arm A had no token catalogue.** 32–34 of Button Arm A's violations are invented token names in its metadata (`color.action.accent.background`, `spacing.sm`). Its CSS invents unprefixed custom properties too, which this harness's headline doesn't count. The spec gave Arm C the real paths. The real `/component-scaffold` can read the token files, so most of the Button gap measures "no token names vs. token names", not the spec's other sections. The harness-ablation eval's `unknown-token` trap measures this inside a real workspace.
- **A scorer false positive costs both arms 2 on CardVertical.** All six runs export the right type names as `export interface`, and the task's required pattern accepts only `export type`. Corrected medians are 7 vs. 2, so the verdict doesn't change. The task file was locked before the run and was left as it is, per the honest-outcome rule.

**What acceptance changes now:**

- **Specs stay optional, and only Button and CardVertical have one**, until the migration below lands. `spec:validate` stays in `components-check.yml`.
- **The "On acceptance" steps above are now the backlog, not part of this change:** move `tokens`, `states` and `accessibility` into the spec (with the ADR-001 amendment), switch `/component-scaffold` step 3 to write the spec, require a spec for every component with script-generated `props` and `styles`, and correct ADR-026's Button `shape` line. Each is its own PR.
- **The extra context is a real cost.** Until the migration removes the duplicated sections, a builder moment that reads both files carries +31% to +55% more prompt for these two components.
- **The harness-ablation eval's Arm 1 context includes the specs.** `prepare.js` keeps and strips them like metadata, including redacting the target's own spec.


## Amendment (2026-10-11) — Migration step 1: `accessibility` joins the spec, builder sections leave metadata for spec components

The first "On acceptance" step is done for the two components that have a spec, and made transitional for the rest. The metadata side is recorded in the ADR-001 amendment of the same date.

- **`accessibility` is a new required spec section.** It has the shape metadata had (`role`, `notes`, `ariaAttributes`, `keyboardInteractions`). The spec already had `states` (with ADR-025 kinds, richer than the metadata `{ state, description }` pairs) and `styles`, so the move needed no other new section.
- **No `tokens` section in the spec.** A list next to `styles` would repeat it. The token list is derived from `styles` by `specTokens` in `scripts/lib.js` (same five categories), and `spec:validate` already checks `styles` against the CSS Module and the built tokens.
- **Button and CardVertical lose `states`, `tokens` and `accessibility` from metadata.** `spec:validate` no longer checks metadata states against the spec; there are none.
- **The move cannot be all-or-nothing yet.** Moving the sections out of all 27 metadata files needs 27 specs, which is the backfill (step 4) and needs the generator (step 3) first. Until then the validator requires the three sections in metadata when a component has no spec, and forbids them when it has one.
- **Pattern output is unchanged.** `npm run patterns:generate` produces the same `component-patterns.json` before and after, because the accessibility strings it quotes now come from the spec through the same reader.

**Still open from the acceptance list:** `/component-scaffold` step 3 writing the spec (step 2), the `props`/`styles` generator (step 3), the backfill and making the spec required (step 4), and the ADR-026 Button `shape` line (step 5). The harness-ablation tooling (`scripts/harness-ablation`, `scripts/pattern-accuracy-harness`) still passes metadata files as context and strips specs for the target; it needs no change for this step, but a re-run after the backfill should confirm the smaller metadata does not hurt scaffolding.

## Amendment (2026-10-11) — Migration step 3: `spec:generate` drafts a spec from the code

The acceptance list called for a script that generates `props` and `styles` so only anatomy roles and constraints are authored. It is `npm run spec:generate -- <Name>` (`scripts/generate-spec.js`). The props reader that `spec:validate` already used moved to `scripts/spec-props.js` so both scripts read the TypeScript the same way.

**What it is for.** The backfill of the 25 components that already exist. It describes code that is there. It does not replace `/component-scaffold` writing the spec before the code for a new component; run afterwards on a component that has a spec it only refreshes derived prop fields.

**What it derives, and what it leaves as `TODO`.**

| Derived from the code | Left as `TODO` for a person or agent |
|---|---|
| Props the component and its parts declare: type, options (in declaration order), literal defaults, a kind guess | The ADR-026 vocabulary `concept` of a prop it has no rule for; the Figma property and set; `native` props the contract depends on but the component does not declare |
| Parts, from metadata `composition.parts` and the classes the JSX uses, with element and `builtOn` | Each part's `role` and `action`; parts with no class of their own (a label `span`); `parent` |
| States, from pseudo-classes and metadata `states` (kind by name) | The ADR-025 kind and trigger of any state it cannot place |
| `styles`: token paths, option classes, `[data-x]` attributes, pseudo-class states, `--_x` custom properties resolved to the property that reads them (a second reader becomes `sameAs`), `border` shorthands split | Why a raw value is raw; every selector it cannot place (`:has()`, `svg` descendants, ancestor state, `aria-*` attributes, `::` elements) |
| `accessibility`, copied from metadata | Constraints; Figma sets and divergences |

`spec:validate` now fails on any string or key that starts with `TODO`, so a draft cannot pass until it is finished. Writing the real spec file also removes `states`, `tokens` and `accessibility` from the component's metadata, because `metadata:validate` forbids them once a spec exists. An existing spec is only merged: its authored fields, parts, states and style rules are kept, and `options`/`default` are refreshed from the code. Drift in parts or states is reported.

**Measured against the two pilot specs** (run with `--fresh` into a scratch file, compared field by field):

| | Button | CardVertical |
|---|---|---|
| Own props found | 7 of 7 (the 3 missing are inherited `disabled`, `type`, `onClick`) | 25 of 25 |
| Props with kind, options and default equal | 7 of 7 | 23 of 25 (`progress` and `Progress.value` are lifecycle props, guessed as content) |
| Style `(property, value)` pairs found | 37 of 37 | 20 of 20 |
| Style declarations on the same part and condition | 41 of 43 | 11 of 26 |
| Selectors left as `TODO` | 0 | 5 of 17 |

For a single-element component like Button the draft is nearly the finished spec. For a compound component the values are right but placement is not: a class shared by two parts (`.onMedia`), ancestor state (`.card:hover .thumbnail`) and `aria-pressed` styling have to be placed by hand. The pilots' judgment calls (`builtOnProps`, `Menu (design-only)` Figma notes, constraints) are not derivable and are not attempted.

**Not tried.** Running it on a component with no spec in the repo. A scratch test on Badge (generate, fill 7 `TODO`s, `spec:validate` with `--components-dir`) passed. Step 4 is the real test.

## Amendment (2026-10-11) — Migration step 4: every component has a spec, and the spec is required

All 27 components now have a `<Name>.spec.json`. `spec:validate` fails for a component without one, and `metadata:validate` rejects the sections that moved (ADR-001 amendment of this date). The `--components-dir` mode, used by the harness runs, still checks only the specs it finds.

**How the 25 were backfilled.** `spec:generate` drafted each one, then a person completed it. Of the 25:

- **18 needed only `TODO` fills** (part roles, vocabulary concepts, reasons for raw values): Avatar, Badge, Box, Card, Chip, Divider, Heading, Icon, Image, Inline, ProgressBar, ScrollArea, Stack, Text, TextLink, VideoFrame, and, after the corrections below, ButtonArrow and Breadcrumb.
- **7 needed their structure rewritten by hand**: Accordion, AppHeader, Checkbox, CardHorizontal, DropdownMenu, Select, TextField. The generator's guess was wrong in the same ways each time: metadata's `accessibility.role` describes the inner control (the Accordion trigger, the Checkbox input), not the element the generator called `Root`; classes applied conditionally (`isOpen && styles.panelOuterOpen`) are state, not parts; and combination states in metadata (`checked-hover`, `disabled-unchecked`) are three independent conditions that the rule `when` expresses directly.
- **Box's padding** had to be written out: `data-px` is computed from `paddingX ?? padding`, so each size is three rules (`padding`, `paddingX`, `paddingY`), in that order.

**Bugs the backfill found in the generator, now fixed.** The worst was silent: `.panelOuterOpen .panel` was merged into the always-on `Panel` rule, overwriting `opacity: 0` with `1`. Specs for Breadcrumb and ButtonArrow had also invented parts (`LabelCurrent`, `IconLeft`) from ternary classes and passed validation; an audit run found them and both were regenerated. `spec:validate` cannot catch either kind of error, because both leave props and token sets intact. The generator now treats `&&` and ternary classes as conditions, attaches a modifier-only selector to the element that carries it, and leaves a `TODO` for state it cannot name.

**Validator changes.**

- A spec may have no props (Divider).
- The TypeScript options comparison applies only when the prop's type is a literal union. Image's `aspectRatio` is `string` in TypeScript and an enumerated axis in metadata.
- A token that only `index.tsx` reads through a template counts as read (Avatar).
- A prop typed with a shared union of more than 12 literals (`IconName`) is `content`, not a `variantAxis` (TextField `icon`, as Button's already was).

**What the backfilled specs do not contain.**

- **Constraints.** Only Button and CardVertical have any (2 in all). Code cannot say which prop combinations are forbidden, and the other components' rules still sit in `usage.antiPatterns`. This is a gap, not a finding that none exist.
- **Figma read-back.** Figma property names follow the ADR-026 casing rule. They were not read back from the Figma sets, except where the contract-migration handoff recorded them (`Has author`, `Has error`, `Disabled`, `Checked`, `Has progress`).
- **Figma sets and divergences.** The `figma` section is empty for the 25.

**Findings the specs make visible.** Six raw values in CSS Modules have an exact token and should be migrated: `font-weight: 600` is `font.weight.semibold` (AppHeader, Breadcrumb, DropdownMenu), `4px` is `size.050` (ProgressBar), `3rem` is `size.600` (VideoFrame, twice). Each is recorded as a literal with that reason, not changed here. The other 116 literals of 122 carry a reason that holds. Also visible: the AppHeader hamburger has no click handler, Checkbox draws a 1.5px border where every other module uses 1px, and the token set has no shadow, z-index, opacity, border-width or aspect-ratio scale.

**Still open from the acceptance list:** the ADR-026 known-gaps line about Button `shape` (step 5).

## Amendment (2026-10-11) — Migration step 5: what happened to the pilot's findings

The acceptance list ended with correcting ADR-026 and deciding the findings the pilots reported. Each was checked against the repo today.

| Finding (pilot, 2026-10-07) | State | Evidence |
|---|---|---|
| ADR-026 lists Button `shape` as a code prop with no Figma property | Already closed | The ADR-026 amendment of 2026-10-10 ("`shape` was never a gap") maps it to the `Button icon` set (`54:1192`); the known-gaps line now lists only TextField `hideLabel`. No edit needed. |
| `metadata.tokens` leaves out tokens the CSS reads | Closed by construction | The token list is derived from the spec's `styles` for all 27 components (ADR-001 amendment, step 4). |
| The icon-only rule is not enforced by the types | Closed | `ButtonProps` is a union whose `shape` branch requires `icon` and `aria-label` and forbids `children` and `trailingIcon`; `Button.a11y.test.tsx` has `@ts-expect-error` cases for both; the spec constraint says `enforcedBy: ["type", "test"]`. |
| Button has no focus style or token | Closed | ADR-028: one token-bound `:focus-visible` ring in `reset.css`. The Button spec's `focus-visible` state points to it. |
| CardVertical `Root` sets raw `min-width` 220px and 160px | Closed | `size.card.min.lg` and `size.card.min.sm`. |
| CardVertical `metadata.tokens` lists tokens the CSS never reads | Closed | As above. |
| The `1px` border width is a literal in 15 CSS Modules | Open: needs a decision | 13 modules, 17 declarations, plus Checkbox at 1.5px and 2px. The specs record each as a literal with a reason. |
| No opacity or z-index token scale | Decided: no scale | z-index is `100` on three popovers (AppHeader, CardVertical, Select) and `1` once; opacity is `0`/`1` for a fade and `0.8` once. Too few distinct values to justify a scale. They stay literals with a reason. Revisit if a fourth distinct value appears. |

**The six raw values with an exact token are migrated.** `font-weight: 600` became `var(--ds-font-weight-semibold)` (AppHeader, Breadcrumb, DropdownMenu), `height: 4px` became `var(--ds-size-050)` (ProgressBar), and `3rem` became `var(--ds-size-600)` (VideoFrame, width and height). Their spec literals are now token paths. `size.050` is `0.25rem`, so the progress track now follows the root font size where `4px` did not; at the default size it is identical. A same-machine before/after screenshot of the five components' default stories, light and dark (10 shots), differed in 0 pixels. The committed ADR-019 baselines were not used, because they come from a different OS.

**Decision for the owner: a border-width token.** Recommended: add one, because 17 declarations repeat the same value and the spec now records them all as unexplained literals. It is a token-scale change (a new primitive and device alias, a Figma variable, an Airtable row), so it goes through `/tokens-author` as its own PR, not through this migration. Checkbox's 1.5px and 2px should be decided in the same change: either align the box to the 1px default or add a second step.

## Amendment (2026-10-12) — The Arm C exit test is frozen

The pattern-accuracy harness's Arm C (the target's spec added to the prompt), which this ADR used as its exit test, is frozen with the rest of the harness at `044d28f`. It scored a model's emitted metadata against a schema that still had `tokens`, so it can't be re-run on the current schema. Rationale and the guard: ADR-029 amendment 2026-10-12. The accept bar for the spec rollout (scaffolding does not regress with the smaller metadata) is now checked by the first real spec-first scaffold, not by re-running Arm C.
