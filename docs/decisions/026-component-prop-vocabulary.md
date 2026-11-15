---
title: "ADR-026 — Component prop vocabulary and API proposal step"
---
# ADR-026 — Component prop vocabulary and API proposal step

**Status:** `accepted` · **Date:** 2026-10-07 · **Last amended:** 2026-11-10

> **In short.** One concept gets one prop name across the fixed set (table below), and Figma uses the same names up to casing unless a mapping is recorded here. `spec:validate` enforces the vocabulary through `scripts/prop-vocabulary.js`. `/component-scaffold` proposes the API (anatomy, props, divergences) and waits for approval before writing any file.

## Decision

The vocabulary is a table in `packages/components/AGENTS.md` → "Prop vocabulary"; the proposal step is in `/component-scaffold`. This ADR holds the full rules and the reasons.

### Vocabulary

One concept gets one name across the fixed set. A new component reuses these names; a prop name not in the vocabulary is a **new term** and needs a reason in the API proposal.

| Concept | Name | Notes |
|---|---|---|
| Visual weight or style | `variant` | One per component. Values name the look or weight, not a rank (ADR-024). Never `type`, `kind`, `mode`, `style`, `tone`, `appearance`. `default` is allowed as the baseline value of a surface or context axis whose other values are departures from it (Card `default\|elevated\|transparent`), never on an emphasis axis (ADR-024's Button problem). |
| Size | `size` | T-shirt scale `sm` / `md` / `lg`, using only the steps the component has. Typography components (`Text`, `Heading`, `TextLink`) are the exception: their `size` takes type-scale names. |
| Corner shape | `shape` | `square` / `round`. |
| Layout direction | `orientation` | `horizontal` / `vertical`. `direction` is reserved for what a glyph points at (`ButtonArrow`). |
| Lifecycle | `status` | One enum; derived from data when possible (ADR-025). |
| Selected or entered value | `value` / `defaultValue` / `onValueChange` | For custom widgets. A component that spreads onto a native input keeps native names (`value`/`checked` + `onChange`). |
| Shown / hidden | `open` / `defaultOpen` / `onOpenChange` | Disclosure, popovers and menus. Never `expanded`, `visible` or `onClose` alone. |
| Toggle | `pressed` / `defaultPressed` / `onPressedChange` | For `aria-pressed`, including filter chips: each chip toggles independently, and the page owns the set. `default*` is omitted when the caller must always own the state. |
| Selection in a set | `value` on the container | `selected` is never an item prop. When a group owns the choice (tabs, listbox options), the container holds `value` / `onValueChange` and items derive `aria-selected` from it. |
| Current item in navigation | `current` on the item | Boolean, renders `aria-current` (`page` for a nav link). An item prop, unlike `selected`: nothing in the component chooses it and there is no change event; the page sets it from its route (AppHeader `NavItem`). Breadcrumb derives it from position and takes no prop. |
| Any other controlled state | `<x>` / `default<X>` / `on<X>Change` | The callback name comes from the state prop's name: `searchValue` → `onSearchValueChange`. |
| Discrete event | `on<Verb>`, or `on<Part><Verb>` for an event from a nested part | `onSelect(value)` for picking an item; `onUserMenuSelect`. Never `handle*`. |
| Boolean | Bare adjective or participle, default `false` | `disabled`, `required`, `certified`, `wrap`, `fullWidth`. Never `is*`, `has*`, `show*`. Exception: `hideLabel`. The label still renders for assistive technology, so the default-`false` form is "hide". |
| Accessible name | `label` | Visible label text when the component shows one; otherwise the `aria-label` (`Icon`, `Breadcrumb`). |
| Error | `error` (message string) | Presence means invalid; there is no separate `invalid` boolean (ADR-025 content state). |
| Main content | `children` | For wrappers and for single free-form content. A component that places several pieces of text uses one named prop per piece (`title`, `subtitle`, `author`; ADR-023 amendment 2026-10-02). |
| Image | `src` / `alt` | On a component that is the image (`Image`, `Avatar`, `CardVertical.Media`). A composite prefixes the part: `thumbnailSrc`, `logoSrc`. |
| Collection | `items` | `<part>Items` when a composite has more than one (`navItems`, `userMenuItems`). Form selection inputs keep the native `options`. |
| Icon | `icon` (leading) / `trailingIcon` | `Icon` itself takes `name`. |
| Root element / inner heading | `as` / `headingLevel` | `as` changes the component's root element; `headingLevel` sets a heading the component renders inside itself (`Accordion`). |
| Link | `href` | |

**Recorded new terms** (outside the vocabulary, each with its reason):

| Component | Prop | Why it is not a vocabulary name |
|---|---|---|
| DropdownMenu | `listRole: 'menu' \| 'listbox'` | Picks the ARIA pattern (`menu` + `menuitem` for actions, `listbox` + `option` with `aria-selected` for a choice from `value`). It changes what assistive technology announces, not the look, so it is not a `variant`. It is not named `role` because that is the native HTML attribute; the props type omits `role` so the component sets it on the root itself. |
| AppHeader | `logoSrcDark` | The Image row's part prefix (`logoSrc`) plus a theme suffix. The header renders both images and CSS shows one per `data-theme`, because a logo is an asset, not a token, and can't follow the theme through a variable. Optional: without it the light logo shows in both themes. |

### Enforcement

`spec:validate` runs `scripts/prop-vocabulary.js` on every spec's props. Because `spec:validate` already proves the spec props equal the code props, this checks the code.

- **Banned names:** `type`/`kind`/`mode`/`style`/`tone`/`appearance` (except native attributes), `state`, `hover`/`focus`/`focused`/`hovered`/`active`, `expanded`/`visible`, a bare `onClose`, `selected`/`selected*`, `invalid`. **Banned prefixes:** `is`/`has`/`show`/`handle`.
- **Booleans** that aren't native or controlled default to `false`.
- **Callbacks** are `on<Verb>`.
- **The controlled triple:** `default<X>` needs `<x>` and `on<X>Change`; `on<X>Change` needs `<x>`.
- **Value checks:** array props are `items`/`<part>Items`/`options`; `error` is a string; `shape` and `orientation` take their two values; `size` is `sm`/`md`/`lg` or type-scale names, never a mix.
- **Figma:** a `both`-surface property equals the prop name up to casing, after dropping `Has <x>` and with `children` exempt. `State` is never a configured prop's property.
- **Concept ↔ name.** Each spec prop's `concept` is a closed enum in `component.spec.schema.json`: the short concept names of the vocabulary table in `packages/components/AGENTS.md`, `native`, or `new term: <reason>`. The check fails when a prop's name doesn't fit its concept (`Size` must be `size`; `Image` must be `src`/`alt` or `<part>Src`/`<part>Alt`; `Discrete event` must be `on<Verb>`; `Controlled state` allows `on<X>Change` or `onChange` but no other callback; `Lifecycle` allows `status` or the data it derives from, `progress`, ADR-025), when a vocabulary name carries another concept (`variant` is always `Visual weight/style`, `label` always `Accessible name`) unless the prop is native, when `native` sits on a prop that isn't kind `native` or a `Boolean` prop isn't typed `boolean`, and when the schema enum and the name rules disagree. Native-input names (`checked`, `value` + `onChange` on Checkbox and TextField) are `Controlled state`. The docs component page shows each prop's concept; a `new term` shows its reason.

Exceptions are waived by id in `scripts/prop-vocabulary-waivers.json`, a shrinking ledger: a waiver that stops matching fails the gate, so it must be deleted. Current waivers:

- CardVertical `progress` ↔ `Status`: the recorded mapping below.
- Inline `wrap` defaults to `true`: it predates the vocabulary, and flipping it is a breaking rename.
- AppHeader `logoSrc` ↔ Figma `Logo`: **open drift.** Rename the Figma property to `Logo src` or record the mapping, then delete the waiver.

`scripts/generate-pattern-schema.js` separately reports `drift` in `component-patterns.json` for `/layout-generation` (ADR-013): every `on<X>Change` needs an `x` prop, every `default<X>` needs both `x` and `on<X>Change`, and selection components never carry a `selected*` prop.

### Figma names

Code and Figma share names, values and defaults. Casing is the only routine difference: `trailingIcon` in code is `Trailing icon` in Figma, and `variant` is `Variant`. A slot property takes its code prop's name: the one default slot is `Children`; other slots take their part's name (`Body`, `Meta`). A label string is a `Text` text property, not a slot. Any other difference is a **recorded mapping**: it goes in the table below and is called out in the component's API proposal. It is never an unrecorded divergence.

| Code | Figma | Why |
|---|---|---|
| Optional prop or optional part omitted | `Has <x>` boolean, default `false` | An instance-swap or text layer has no "empty" option (ADR-023). An optional part left out of a composition (`<CardVertical.Progress>` on `Root`) is the same case: its code counterpart is rendering the part or not. |
| Pseudo-classes (`:hover`, `:focus-visible`, `:active`) | `State` variant (`Default`/`Hover`/`Focus`/`Active`) | Preview only; `State` holds interaction only (ADR-025). |
| `disabled` | `Disabled` boolean, default `false`, ordered first | A casing-only match, not a mapping: disabled is a configured flag (ADR-025), so it never lives in `State`. Disabled is built at `State=Default` only. |
| `children` as a label string | `Text` text property | A text property, not a slot: the label layer's content (Button, Chip, Badge). `Children` names only a slot property. |
| Native `value` / `placeholder` (TextField) | `Has value` variant + `Value` text property | Figma can't show the placeholder and a value at once. `Has value=false` previews the placeholder style; `Value` holds whichever text is shown. |
| `progress` (CardVertical) | `Status` variant (`Not started` / `In progress` / `Completed`) | Preview of the lifecycle the code derives from `progress` (ADR-025). Figma can't derive, so the axis is explicit there and has no code prop. |
| `value` (ProgressBar, `number` 0–100) | `Value` variant (`0`/`10`/`20`/`50`/`80`/`100`) | A variant can't hold a continuous number, so Figma previews a few steps. Same name; the values are a sample. |
| `aria-selected` on a menu or listbox item (derived from the container's `value`) | `Selected` boolean on the item, built at `State=Default` only | Preview only. Figma can't derive the selection from a container, and the item takes no `selected` prop in code (vocabulary: selection in a set). |

Code-only props (event handlers, `default*`, `className`, `id`) have no Figma property. Figma-only properties (`State`, `Has <x>`, design-only interaction states such as Menu `Expanded`) are listed as such.

**A state that changes both the parent and a nested part is a variant on the parent** (TextField and Select `Has error`):

- Figma can't drive a nested instance's variant from a parent boolean. So the parent becomes a set whose variants differ **only** in that state, each with the nested part preset to match. Figma keeps a designer's nested overrides on a parent flip only for properties the two presets agree on.
- The nested instance must not be bound to an instance-swap property. A swap value is shared by every variant, so per-variant presets collapse into one.
- All other part properties stay on the part, exposed through nested instance properties. Add a parent axis only when a state really spans parent and part; multiplying axes is how configuration collapse starts (ds101, Nathan Curtis).

**`figmaNodeId` is a node id or `none`**, enforced as `^([0-9]+:[0-9]+|none)$`. `none` covers layout primitives, text-style components (`Text`, `Heading`, `VideoFrame`), components with no set (`Card`, `Divider`, `TextLink`), and `Icon` (its glyphs are 32 single components, not a set).

Figma-only properties with no code counterpart:

| Component set | Property | Why it stays |
|---|---|---|
| Chip | `Has dropdown` | Legacy dropdown-arrow look. Out of scope in code (Chip usage "do not use"); kept because placed instances use it. |
| Accordion list | The whole set, `Show more` = `false` / `true` | A stack of `Accordion` instances plus a Show more link, for page mock-ups. Code composes Accordions directly and has no list component. |
| Input Group + button | The whole component | Search input plus icon button, for page mock-ups. Code composes `TextField` and `Button` (AppHeader search). |
| Image | `Size` = `Small` / `Medium` / `Large` | Placeholder sizes for mock-ups; code sizes by `aspectRatio` and its container. |
| AppHeader | `Device` = `Desktop` / `Tablet` / `Mobile` | One preview per device breakpoint. Code reflows with device tokens and media queries in its CSS Module, and has no prop. |

Known gap (code prop with no Figma property): TextField `hideLabel`. Figma can't invert a boolean onto a layer's visibility; hide the `Label` layer by hand.

### API proposal step

Before writing any file, `/component-scaffold` produces an **API proposal** and stops for the developer's approval:

- **Anatomy:** the named parts and layers. These names become Figma layer names and, if the component has parts, `composition.parts` (ADR-023).
- **Props table:** one row per prop, with its vocabulary concept (or "new term" with a reason), kind (variant axis, lifecycle, content, controlled state, event, native), type, default, and Figma property, marked both, code-only or Figma-only.
- **Divergences:** any Figma property that differs from code by more than casing, and any value that departs from the vocabulary.

The developer approves or edits the table; only then are the files generated. Inside `/add-component` this is part of Stage 1, so the loop gains a checkpoint before code exists, in addition to the visual checkpoint after it.

## Context

ADR-023, ADR-024 and ADR-025 each set naming rules for the problem in front of them: part names are Figma layer names, variants name an absolute weight, lifecycle state is one `status` enum, booleans are bare adjectives that default to `false`. ADR-023 deferred the rest: "The system-wide property-naming audit is a separate follow-up." This ADR is that follow-up.

The rules existed, but nothing listed the concepts. Nothing said that "the selected value" is always `value`, or that "show/hide" is always `open`. So the same concept had different names across the fixed set. `scripts/generate-pattern-schema.js` reported this in `component-patterns.json` → `drift`, but only `/layout-generation` reads that file (ADR-013), so a scaffold never saw it:

- Change callbacks: `onOpenChange` (Accordion), `onPressedChange` (CardVertical.Favorite), `onValueChange` (Select), `onSelect`/`onClose` (DropdownMenu).
- Selected value: `value` (Select) vs `selectedValue` (DropdownMenu).
- Size scales: `sm|md|lg` (Button, Avatar), `sm|lg` (CardVertical), `sm|md` (Icon), `default|large` (TextField).
- A controlled pair whose names didn't match: `searchValue` + `onSearchChange` (AppHeader).

The ds101 references the system is built on ([Component property naming](https://f4cu.github.io/ds101/component-property-naming/), [Component API design](https://f4cu.github.io/ds101/component-api-design/), [Component usability](https://f4cu.github.io/ds101/component-usability/)) ask for three things: name one concept one way across components; use the same names, options and defaults in Figma and code; agree on an API (anatomy plus a props list marked Figma-only, code-only or both) before building. The first two were only partly written down. The third had no step anywhere: `/component-scaffold` went straight from Figma context to the component files.

## Consequences

- One reference answers "what do I call this prop?". It is loaded with the component rules, so it is in front of the scaffold and the reviewer at the moment a name is chosen. The ADR-025 naming bullet folds into it.
- Naming arguments happen once, on a table, before code and Figma exist. That is cheaper than renaming afterwards, which ADR-024 showed costs a migration in code, usage, stories and Figma.
- `/component-scaffold` is no longer one-shot: it waits for a reply. That is the point of the step, and it matches the developer-present nature of the moment.
- The prose in `packages/components/AGENTS.md` keeps only what needs judgement (which concept a prop is, the state groups, the Figma mappings); the gate enforces the rest.
- `concept` is gated rather than free text. The 37 `new term` values are reviewable on the docs page; 25 of them are the layout primitives' props, which is evidence for a vocabulary row for layout props, not decided here.
- The harness-ablation Arm 0 strips `scripts/prop-vocabulary.js` and its waivers along with `validate-spec.js`.
- **Out of scope:** forwarding `ref` to the root element (ds101 usability checklist, question 9). That is a behaviour gap, not a naming one, tracked in issue #114.

## Ruled out

Alternatives considered and rules that were tried and dropped. Each says why, so it isn't proposed again.

| Ruled out | When | Why |
|---|---|---|
| An API template document in `docs/` that every new component fills in | 2026-10-07 | Duplicates the metadata and the TypeScript props type, goes stale like every doc page, and isn't in front of anyone at the moment of naming a prop. |
| A `props` section in `component.schema.json` | 2026-10-07 | A breaking change to the ADR-001 contract that duplicates the TypeScript types (the source of truth for props) and needs a migration of all 27 metadata files. Spec `props` (ADR-027) later took this role without touching the metadata contract. |
| One change-callback name required system-wide (old `drift` rule) | 2026-10-07 | Contradicted the vocabulary, which derives the callback from the state prop's name. Replaced by the controlled-triple rule. |
| `variant` ↔ Figma `Style` as a recorded mapping | 2026-10-10 | It was a preference, not a Figma limitation: Figma's own Simple Design System ([figma/sds](https://github.com/figma/sds)) uses `Variant`, and `Style` collides with Figma's color and text styles. |
| `appearance` instead of `variant` | 2026-10-10 | `variant` is the majority name (MUI, Radix, Chakra, shadcn, Primer, Polaris, React Spectrum, SDS) and agents default to it. |
| Slot named after the part when it maps to `children` (e.g. `CardVertical.Meta`'s `Meta` slot) | 2026-10-10 | The default slot takes the code prop's name, `Children` (Nathan Curtis, ["Implementing Slots in a Figma Library"](https://nathanacurtis.substack.com/p/implementing-slots-in-a-figma-library)). |
| `active` for the current nav item | 2026-10-10 | `active` became the momentary press on every interactive component (ADR-025), so the two meanings would meet on one element. Replaced by `current`, which names the ARIA attribute it drives. |
| `label` for a component's single free-form text (Badge) | 2026-10-10 | The Main content row prescribes `children`; every harness-ablation run named it that unprompted. |
| `State=Disabled` as a Figma interaction state | 2026-10-11 | `disabled` is a configured flag, not an interaction (ADR-025); it is a `Disabled` boolean. |
| Free text in `figmaNodeId` (`N/A — …`, `note: …`, `""`) | 2026-10-11 | `sense-component.js` read it as a node id, and `airtable-sync.js` only strips values starting with `none`. |
| "No new gate yet" (drift report only) | 2026-11-10 | Prose enforcement had hit the `packages/components/AGENTS.md` context budget (ADR-029). Replaced by the blocking check in `spec:validate`. |
| Free-text `concept` on spec props | 2026-11-10 | Nothing read it, and four props carried a sentence instead of a concept (#150). |
| Using this ADR's long row titles as the `concept` enum | 2026-11-10 | Every spec already used the short names in `packages/components/AGENTS.md`; renaming over a hundred values adds churn and no information. |

## Change history

One line per change, newest first. The full text of each original amendment is in git history (`git log -p -- docs/decisions/026-component-prop-vocabulary.md`).

- **2026-11-10** — Each prop's `concept` is a closed enum checked against its name (Enforcement). No existing spec needed a waiver.
- **2026-11-10** — The blocking vocabulary check ships in `spec:validate`, with a waiver ledger seeded with three waivers across 27 specs.
- **2026-10-12** — The `Has <x>` mapping covers optional parts, not only optional props. Surfaced by the Figma fidelity measurement (`.claude/handoff/2026-10-12-figma-fidelity-measurements.handoff.md`); see ADR-023 amendment 2026-10-12.
- **2026-10-11** — Contract migration Tier 4: CardVertical.Root progress already read `Value`; Checkbox gained `Checked=true, State=Hover`. `component-patterns.json` reports no drift.
- **2026-10-11** — Contract migration Tier 3: `Disabled` leaves `State` in every Figma set; `State=Active` previews added; nine sets linked or renamed; `figmaNodeId` constrained.
- **2026-10-11** — `Disabled` leaves `State` (decision; migrated the same day in Tier 3).
- **2026-10-10** — Contract migration Tier 1: AppHeader `NavItem.active` → `current`; Accordion states `collapsed`/`expanded` → `closed`/`open`; `listRole` and `logoSrcDark` recorded as new terms.
- **2026-10-10** — Button `trailingIcon` and `shape` mapped in Figma; `Button icon` gained Disabled variants.
- **2026-10-10** — Badge `label` → `children` migrated in code and Figma.
- **2026-10-10** — `Variant` replaces `Style` in Figma; the default slot is `Children`.
- **2026-10-08** — Badge `label` recorded as drift (found by the harness-ablation pilot).
- **2026-10-07** — Figma alignment pass: properties renamed in place to match the vocabulary.
- **2026-10-07** — Accepted. Parent-and-part variant rule added (TextField `Has error`).

<details>
<summary>Vocabulary migration (all rows closed)</summary>

These were breaking renames, each touching code, usage, stories and Figma, so they shipped apart from the decision.

| Component | Before | After | State |
|---|---|---|---|
| AppHeader | `searchValue` + `onSearchChange` | `onSearchValueChange` | Migrated 2026-10-07 |
| DropdownMenu | `selectedValue`; `onClose`; rendered conditionally by the consumer | `value`; `open` + `onOpenChange` (controlled only: the consumer owns the trigger, and the menu only ever requests `false`) | Migrated 2026-10-07 |
| TextField | `size: default \| large` | `size: md \| lg` (40px/48px, the same steps as Button) | Migrated 2026-10-07, Figma included |
| Chip | `selected` (renders `aria-pressed`) | `pressed` + `onPressedChange`, controlled only; filter rows are a labelled `role=group` | Migrated 2026-10-07, Figma included |
| Card, CardHorizontal, Badge | `variant` values `default`, `outline` | No rename. Badge's `outline\|filled` names the look; `default` is a baseline value | Closed 2026-10-07 |
| Badge | `label` (the badge's text) | `children` | Migrated 2026-10-10, Figma included |
| AppHeader | `NavItem.active` (the current page) | `NavItem.current` | Migrated 2026-10-10 |
| Accordion | metadata `states` `collapsed` / `expanded` | `closed` / `open`, the values of the `open` prop | Migrated 2026-10-10 |

</details>

<details>
<summary>Figma change log (node ids and instance counts)</summary>

All renames were made in place on existing variants, so placed instances kept their main component and state. Instances were read back before and after each change.

**Alignment pass (2026-10-07).**

- **Chip:** `state=Active|Hover|Selected` split into `Pressed` (`false`/`true`) and `State` (`Default`/`Hover`); `dropdown` renamed `Has dropdown`. All 30 instances kept their state.
- **Accordion list item:** `isExpanded=on|off|isExpanded3` → `Open` (`true`/`false`, default `false`) × `State` (`Default`/`Hover`). The third variant was the collapsed hover state.
- **Button:** `Size` values `Small`/`Default`/`Large` → `sm`/`md`/`lg`. The default variant is `md` + `Neutral`, matching code. `Trailing icon` (default `true`) toggled the *leading* icon; renamed `Has icon`, default `false`, and the instance swap renamed `Icon`. The 7 instances that showed the icon through the old default were pinned to `true`.
- **CardHorizontal:** `Progress` → `Has progress`. **Button arrow:** `State=Active` → `Default` (`Active` reads as the `:active` pseudo-class). **CardVertical:** `State` values recased to `Default`/`Hover`.
- **Set names match code:** `Accordion list item` → `Accordion`; the former `Accordion` composite → `Accordion list`, its `State=Expanded|Collapsed` axis renamed `Show more` (default `false`); `Button arrow` → `ButtonArrow`; `Image placeholder` → `Image`; `Option menu` → `DropdownMenu`; `Option item` → `DropdownMenu/Item`.
- **Checkbox** (`92:8772`, formerly `Checkbox with label`): `State=on|off|State3` → `Checked` × `State` (`Default`/`Hover`). A `Label` text property drives the label layer. Box, check and label rebound to the variables the code reads (`background/input`, `background/brand`, `border/input/{default,hover}` at 1.5px, `text/inverted/default`, `text/default`). All 12 instances kept their state and labels. The box's main component (`92:8764`), removed from the canvas while its instances stayed, is back as `_Checkbox/Box` (private, unpublished).
- **TextField:** the Figma `Input Group` (`71:1189`) became `TextField` (label + input + error), now a set (`2879:8549`) with `Label` and `Error` text properties and a `Has error` variant; the `Input` swap property was removed so per-variant presets work (parent-and-part rule). Error layer: `font/size/body-small`, `text/feedback/error`. `Input field` (`92:8005`) became the private part `_TextField/Input`: `Size` `md`/`lg`; `State=Empty|Filled|Hover` split into `Has value` × `State` plus `Has error`; the 12 unused `Style=Outlined` variants deleted; `Trailing icon` → `Has icon` + `Icon`; variables follow the CSS. All 44 instances kept their variant, icon and text.
- **Select** follows TextField: the former `Select` set (`92:8030`) is the private part `_Select/Trigger` (its `Style` axis removed; the single Outlined use moved to Filled), with `Has value` × `State` × `Has error` and a `Value` text property. A new `Select` set (`2879:8375`) holds `Label`, `Trigger` and `Error`. The 8 TextFields that wrapped a Select (all "Language" pickers) are now `Select` instances.
- Figma's `clone()` drops `componentPropertyReferences`: a duplicated variant must be re-wired to the set's properties. Figma picks a set's default variant by canvas position (top-left), not layer order.

**`Variant` and `Children` (2026-10-10).** 326 instances kept their values.

| Node | Set | Before | After | Instances |
|---|---|---|---|---|
| `57:1265` | Button | `Style` | `Variant` | 54 |
| `54:1192` | Button icon | `Style` | `Variant` | 136 |
| `130:7289` | CardHorizontal | `Style` | `Variant` | 91 |
| `143:4417` | brand-logo (Figma-only) | `Style` | `Variant` | 37 |
| `2871:7505` | CardVertical.Meta | slot `Meta` | slot `Children` | 8 |

`CardVertical.Root`'s `Body` slot keeps its name: Root has several regions.

**Badge (2026-10-10).** Set `28:1134`, 13 instances: `type=Default|highlight` → `Variant=Outline|Filled`; a `Text` text property drives the label; the Filled variant's visible stroke is a 1px transparent stroke, matching the CSS.

**Button `trailingIcon` and `shape` (2026-10-10).**

- `shape` maps to `Button icon`'s existing `Shape` (`Square`/`Round`); that set's `size=Small|Medium|Large` → `Size=sm|md|lg`, `icon` → `Icon`.
- Every `Button` variant (36) gained a `TrailingIcon` layer driven by `Has trailing icon` + `Trailing icon` (swap, default `chevron-down`). All 54 instances keep it hidden.
- Verification gap: figma-cli's 20,000-character output limit cut the before-snapshot, so 75 of 136 `Button icon` instances had no before-state; the 61 that did were unchanged.
- `Button icon` gained 18 disabled variants and was re-gridded; default is `Size=md, Shape=Square, Variant=Neutral, State=Default`. `Button` Neutral disabled now uses `border/disabled` and `text/disabled`, not the raw `neutral/neutral-8`.

**Tier 3 (2026-10-11).** `Disabled` split out of `State`:

| Node | Set | Disabled variants | Instances |
|---|---|---:|---:|
| `57:1265` | Button | 12 of 48 | 54 |
| `54:1192` | Button icon | 18 of 72 | 136 |
| `92:8772` | Checkbox | 2 of 5 | 12 |
| `61:1228` | ButtonArrow | 2 of 6 | 34 |
| `92:8005` | `_TextField/Input` | 4 of 28 | 45 |
| `92:8030` | `_Select/Trigger` | 1 of 7 | 8 |

The outer `TextField` (`2879:8549`) and `Select` (`2879:8375`) sets carry only `Has error`. `Chip` has no disabled preview. `State=Active` previews added to ButtonArrow, DropdownMenu/Item, Accordion `Open=false` and Checkbox; Accordion `Open=false, State=Hover` now uses `overlay/hover`.

| Node | Before | After | Instances |
|---|---|---|---:|
| `95:16289` | Avatar `Size=Small/Medium/Large` (default Small) | `Size=sm/md/lg`, default `md` | 37 |
| `54:1259` | Progress bar, `completion` | `ProgressBar`, `Value` | 219 |
| `82:2242` | Header main, `headerLayout` | `AppHeader`, `Device` | 16 |
| `86:3211` | Breadcrumb | unchanged, now linked | 16 |
| `130:8323` | breadcrumb link, `State=Active/hover/Current` | `_Breadcrumb/Link`, `Current` × `State=Default/Hover/Active`; current label uses `text/default` | 51 |
| `130:8676` | Nav item, `Property 1=Default/Variant2` | `_AppHeader/NavItem`, `Current` × `State=Default/Hover/Active` | 22 |
| `86:3505` | Show more link, `state=collapsed/expanded/state3/state4` × `Property` | `Open` × `State=Default/Hover` | 8 |
| `155:6236` | DropdownMenu/Item, `State` | `Selected` × `State`; `Selected=true` uses `text/brand` at 600 | 24 |
| `130:7289` | CardHorizontal `Variant=default/inverted` | `Variant=Default/Inverted` | 91 |

Variable pushed: `color/background/on-media/active` (Theme, both modes → `color/black/alpha-6`).

**Tier 4 (2026-10-11).** Checkbox `Checked=true, State=Hover` (`2934:8022`) added to `92:8772`; no `completion` property left in the file.

</details>
