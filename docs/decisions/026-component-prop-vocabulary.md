---
title: "ADR-026 — Component prop vocabulary and API proposal step"
---
# ADR-026 — Component prop vocabulary and API proposal step

**Date:** 2026-10-07
**Status:** `accepted`
**Amended:** 2026-10-08

## Context

ADR-023, ADR-024 and ADR-025 each set naming rules for the problem in front of them: part names are Figma layer names, variants name an absolute weight, lifecycle state is one `status` enum, booleans are bare adjectives that default to `false`. ADR-023 deferred the rest: "The system-wide property-naming audit is a separate follow-up." This ADR is that follow-up.

The rules exist, but nothing lists the concepts. Nothing says that "the selected value" is always `value`, or that "show/hide" is always `open`. So the same concept already has different names across the fixed set. `scripts/generate-pattern-schema.js` reports this in `.claude/component-patterns.json` → `drift`, but only `/layout-generation` reads that file (ADR-013), so a scaffold never sees it:

- Change callbacks: `onOpenChange` (Accordion), `onPressedChange` (CardVertical.Favorite), `onValueChange` (Select), `onSelect`/`onClose` (DropdownMenu).
- Selected value: `value` (Select) vs `selectedValue` (DropdownMenu).
- Size scales: `sm|md|lg` (Button, Avatar), `sm|lg` (CardVertical), `sm|md` (Icon), `default|large` (TextField).
- A controlled pair whose names don't match: `searchValue` + `onSearchChange` (AppHeader).

The ds101 references the system is built on ([Component property naming](https://f4cu.github.io/ds101/component-property-naming/), [Component API design](https://f4cu.github.io/ds101/component-api-design/), [Component usability](https://f4cu.github.io/ds101/component-usability/)) ask for three things: name one concept one way across components; use the same names, options and defaults in Figma and code; agree on an API (anatomy plus a props list marked Figma-only, code-only or both) before building. The first two are only partly written down. The third has no step anywhere: `/component-scaffold` goes straight from Figma context to four files.

The options were:

1. **An API template document in `docs/`** that every new component fills in. It would duplicate the metadata and the TypeScript props type, go stale like every doc page, and nobody would read it at the moment of naming a prop.
2. **A `props` section in `component.schema.json`.** It would make prop names machine-checkable from metadata. But it is a breaking change to the ADR-001 contract, it duplicates the TypeScript types (which are already the source of truth for props), and every one of 27 metadata files would need a migration.
3. **A vocabulary table in the component rules, plus an API proposal checkpoint in `/component-scaffold`.** The vocabulary lives where it is loaded when touching component code. The checkpoint is the "agree before building" moment, and it lives in the command that produces the API.

## Decision

Option 3. The vocabulary is a table in `packages/components/AGENTS.md` → "Prop vocabulary". The proposal step is in `/component-scaffold`.

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

### Figma names

Code and Figma share names, values and defaults. Casing is the only routine difference: `trailingIcon` in code is `Trailing icon` in Figma. Any other difference is a **recorded mapping**: it goes in the table below and is called out in the component's API proposal. It is never an unrecorded divergence. Known mappings:

| Code | Figma | Why |
|---|---|---|
| `variant` | `Style` | "Variant" is Figma's own word for a component-set member; a property named `Variant` is ambiguous in the Figma UI. |
| Optional prop omitted | `Has <x>` boolean, default `false` | An instance-swap or text layer has no "empty" option (ADR-023). |
| Pseudo-classes | `State` variant | Preview only; `State` is reserved for interaction (ADR-025). |
| `children` as a label string | `Text` text property | Figma has no `children`; the text property is the label layer's content (Button, Chip). |
| Native `value` / `placeholder` (TextField) | `Has value` variant + `Value` text property | Figma can't show the placeholder and a value at once. `Has value=false` previews the placeholder style; `Value` holds whichever text is shown. |
| `progress` (CardVertical) | `Status` variant (`Not started` / `In progress` / `Completed`) | Preview of the lifecycle the code derives from `progress` (ADR-025). Figma can't derive, so the axis is explicit there and has no code prop. |

Code-only props (event handlers, `default*`, `className`, `id`) have no Figma property. Figma-only properties (`State`, `Has <x>`, design-only interaction states such as Menu `Expanded`) are listed as such.

**A state that changes both the parent and a nested part is a variant on the parent** (amendment 2026-10-07, TextField `Has error`):

- Figma can't drive a nested instance's variant from a parent boolean. So the parent becomes a set whose variants differ **only** in that state, each with the nested part preset to match. Figma keeps a designer's nested overrides on a parent flip only for properties the two presets agree on.
- The nested instance must not be bound to an instance-swap property. A swap value is shared by every variant, so per-variant presets collapse into one.
- All other part properties stay on the part, exposed through nested instance properties. Add a parent axis only when a state really spans parent and part; multiplying axes is how configuration collapse starts (ds101, Nathan Curtis).

Figma-only properties with no code counterpart, recorded 2026-10-07:

| Component set | Property | Why it stays |
|---|---|---|
| Chip | `Has dropdown` | Legacy dropdown-arrow look. Out of scope in code (Chip metadata "do not use"); kept because placed instances use it. |
| Accordion list | The whole set, `Show more` = `false` / `true` | A stack of `Accordion` instances plus a Show more link, for page mock-ups. Code composes Accordions directly and has no list component. |
| Input Group + button | The whole component | Search input plus icon button, for page mock-ups. Code composes `TextField` and `Button` (AppHeader search). |
| Image | `Size` = `Small` / `Medium` / `Large` | Placeholder sizes for mock-ups; code sizes by `aspectRatio` and its container. |

Known gaps (code props with no Figma property): Button `trailingIcon` (the set has one icon slot, the leading `Icon` with `Has icon`) and Button `shape`. TextField `hideLabel` (Figma can't invert a boolean onto a layer's visibility; hide the `Label` layer by hand).

### API proposal step

Before writing any file, `/component-scaffold` produces an **API proposal** and stops for the developer's approval:

- **Anatomy:** the named parts and layers. These names become Figma layer names and, if the component has parts, `composition.parts` (ADR-023).
- **Props table:** one row per prop, with its vocabulary concept (or "new term" with a reason), kind (variant axis, lifecycle, content, controlled state, event, native), type, default, and Figma property, marked both, code-only or Figma-only.
- **Divergences:** any Figma property that differs from code by more than casing, and any value that departs from the vocabulary.

The developer approves or edits the table; only then are the four files generated. Inside `/add-component` this is part of Stage 1, so the loop gains a checkpoint before code exists, in addition to the visual checkpoint after it.

## Consequences

- One reference answers "what do I call this prop?". It is loaded with the component rules, so it is in front of the scaffold and the reviewer at the moment a name is chosen. The ADR-025 naming bullet folds into it.
- Naming arguments happen once, on a table, before code and Figma exist. That is cheaper than renaming afterwards, which ADR-024 showed costs a migration in code, metadata, stories and Figma.
- `/component-scaffold` is no longer one-shot: it waits for a reply. That is the point of the step, and it matches the developer-present nature of the moment.
- **No new gate yet.** Detection is the `drift` report in `component-patterns.json`. Since 2026-10-07, `scripts/generate-pattern-schema.js` checks this vocabulary instead of requiring one callback name system-wide: every `on<X>Change` needs an `x` prop, every `default<X>` needs both `x` and `on<X>Change`, and selection components never carry a `selected*` prop. A blocking check (adding banned boolean prefixes) is still a follow-up.
- **Existing drift is migrated in a separate PR.** These are breaking renames, each touching code, metadata, stories and Figma, so they ship apart from this decision:

  | Component | Before | After | State |
  |---|---|---|---|
  | AppHeader | `searchValue` + `onSearchChange` | `onSearchValueChange` | Migrated 2026-10-07 |
  | DropdownMenu | `selectedValue`; `onClose`; rendered conditionally by the consumer | `value`; `open` + `onOpenChange` (controlled only: the consumer owns the trigger, and the menu only ever requests `false`) | Migrated 2026-10-07 |
  | TextField | `size: default \| large` | `size: md \| lg` (40px/48px, the same steps as Button) | Migrated 2026-10-07; Figma `Size` renamed in the alignment pass (amendment below) |
  | Chip | `selected` (renders `aria-pressed`) | `pressed` + `onPressedChange`, controlled only; filter rows are a labelled `role=group` | Migrated 2026-10-07, Figma included: `state=Selected` split into `Pressed` (default `false`) and `State` (interaction) |
  | Card, CardHorizontal, Badge | `variant` values `default`, `outline` | No rename. Badge's `outline\|filled` names the look; `default` is a baseline value (vocabulary row above) | Closed 2026-10-07 |
  | Badge | `label` (the badge's text) | `children` (single free-form content, vocabulary row above) | Open: found 2026-10-08 by the harness-ablation pilot, where every arm named it `children` |

- **Out of scope:** forwarding `ref` to the root element (ds101 usability checklist, question 9). No component forwards one today. That is a behaviour gap, not a naming one, tracked in issue #114.

## Amendment (2026-10-07) — Figma alignment pass

The file was brought in line with the vocabulary by renaming properties in place, so placed instances keep their state. No components were created or deleted.

- **`variant` ↔ `Style` confirmed.** Button and Select already used `Style`; CardHorizontal's `Variant` axis is renamed to `Style`.
- **Chip:** `state=Active|Hover|Selected` split into `Pressed` (`false`/`true`) and `State` (`Default`/`Hover`); `dropdown` renamed `Has dropdown` (Figma-only, table above). All 30 instances kept their state.
- **Accordion list item:** `isExpanded=on|off|isExpanded3` → `Open` (`true`/`false`, default `false`) × `State` (`Default`/`Hover`). The third variant was the collapsed hover state.
- **Button:** `Size` values `Small`/`Default`/`Large` → `sm`/`md`/`lg`. The default variant is now `md` + `Neutral`, matching code. `Trailing icon` (default `true`) toggled the *leading* icon; it is renamed `Has icon`, defaults to `false`, and the instance swap is renamed `Icon`. The 7 instances that showed the icon through the old default were pinned to `true`, so nothing changed visually.
- **CardHorizontal:** `Progress` → `Has progress`. **Button arrow:** `State=Active` → `Default` (`Active` reads as the `:active` pseudo-class). **CardVertical:** `State` values recased to `Default`/`Hover`.
- **Component set names match code:** `Accordion list item` → `Accordion`; the former `Accordion` composite → `Accordion list`, with its `State=Expanded|Collapsed` axis renamed `Show more` (default `false`), since `State` is reserved for interaction; `Button arrow` → `ButtonArrow`; `Image placeholder` → `Image`; `Option menu` → `DropdownMenu`; `Option item` → `DropdownMenu/Item` (its layers inside DropdownMenu → `Item`).
- **Checkbox** (`92:8772`, formerly `Checkbox with label`): `State=on|off|State3` → `Checked` (`false`/`true`, the native-input name) × `State` (`Default`/`Hover`). `State3` became the Hover preview. A `Label` text property now drives the label layer. The box, check and label are rebound to the variables the code reads (`background/input`, `background/brand`, `border/input/{default,hover}` at 1.5px, `text/inverted/default`, `text/default`). All 12 instances kept their checked state and labels. `State` gained `Disabled` for both `Checked` values (border `border/disabled`, label `text/disabled`, checked fill `background/disabled`), so every metadata state has a preview. The box's main component (`92:8764`), which had been removed from the canvas while its instances stayed, is back on the Checkbox page as `_Checkbox/Box` (private, unpublished), defaulting to the unchecked look; variants override fill, stroke and check per state.
- **TextField:** the Figma `Input Group` (`71:1189`) is the code `TextField` (label + input + error) and takes its name. It gains `Label` and `Error` text properties and is now a set (`2879:8549`) with a `Has error` variant. Its two variants differ only in the nested input's `Has error`, so one switch shows the red border and the message; the `Input` swap property was removed to make that possible (rule above). This was tested on throwaway copies first. The error layer uses `font/size/body-small` and `text/feedback/error`. Its nested input's properties are exposed on the parent, and the input fills the field's width as in code. `Input field` (`92:8005`) becomes the private part `_TextField/Input`:
  - `Size` is `md`/`lg` (40/48px).
  - `State=Empty|Filled|Hover` is split into `Has value` × `State` (`Default`/`Hover`/`Focus`/`Disabled`) plus `Has error` (with an empty+error row for "required field left empty"), covering every metadata state. The new Focus, Disabled and error rows are duplicates of existing variants.
  - The 12 unused `Style=Outlined` variants were deleted, and the axis went with them; code has one look.
  - `Trailing icon` (default `true`, but it toggled the leading icon) is now `Has icon` (default `false`) + `Icon`.
  - Variables follow the CSS: fill `background/input`, borders `border/input/{default,hover}`, `border/selected`, `border/disabled`, `border/feedback/error`, text `text/default` or `text/disabled`.
  - All 44 instances kept their variant, icon and text.
- **Select** follows the TextField structure:
  - The former `Select` set (`92:8030`) is the private part `_Select/Trigger`. Its `Style=Outlined|Filled` axis is gone: code has one look, and the single Outlined use was moved to Filled.
  - Its properties are now `Has value` × `State` (`Default`/`Hover`/`Focus`/`Disabled`) × `Has error` (with empty+error) and a `Value` text property. It is bound per the CSS: placeholder `text/subtle`, chevron `icon/default`, or `icon/disabled` when disabled.
  - A new `Select` set (`2879:8375`) holds `Label`, a `Trigger` and `Error`, with a `Has error` parent variant (rule above).
  - The 8 TextFields that wrapped a Select (all "Language" pickers) are now `Select` instances with the same label, value and width. This closes the Select-in-TextField gap.
- Figma's `clone()` drops `componentPropertyReferences`. A duplicated variant must be re-wired to the set's properties, or its layers stop responding to them.
- Figma picks a set's default variant by canvas position (top-left), not layer order, so defaults were set by moving variants.
- ADR-024's Figma follow-ups were already done: the Button `Style` values, the CardVertical halo (two drop shadows bound to `color/icon/on-media/halo`), and the variables.

## Amendment (2026-10-08) — Badge `label` is drift

The harness-ablation pilot rebuilt Badge three times and every run named its text `children`, which is what the Content row prescribes for single free-form content. Badge's shipped `label` predates the vocabulary. It joins the migration table as open drift; the rename is a separate breaking PR like the others.
