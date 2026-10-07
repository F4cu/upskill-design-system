---
title: "ADR-026 — Component prop vocabulary and API proposal step"
---
# ADR-026 — Component prop vocabulary and API proposal step

**Date:** 2026-10-07
**Status:** `accepted`

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

Option 3. The vocabulary is a table in `.claude/rules/components.md` → "Prop vocabulary". The proposal step is in `/component-scaffold`.

### Vocabulary

One concept gets one name across the fixed set. A new component reuses these names; a prop name not in the vocabulary is a **new term** and needs a reason in the API proposal.

| Concept | Name | Notes |
|---|---|---|
| Visual weight or style | `variant` | One per component. Values name the look or weight, not a rank (ADR-024). Never `type`, `kind`, `mode`, `style`, `tone`, `appearance`. |
| Size | `size` | T-shirt scale `sm` / `md` / `lg`, using only the steps the component has. Typography components (`Text`, `Heading`, `TextLink`) are the exception: their `size` takes type-scale names. |
| Corner shape | `shape` | `square` / `round`. |
| Layout direction | `orientation` | `horizontal` / `vertical`. `direction` is reserved for what a glyph points at (`ButtonArrow`). |
| Lifecycle | `status` | One enum; derived from data when possible (ADR-025). |
| Selected or entered value | `value` / `defaultValue` / `onValueChange` | For custom widgets. A component that spreads onto a native input keeps native names (`value`/`checked` + `onChange`). |
| Shown / hidden | `open` / `defaultOpen` / `onOpenChange` | Disclosure, popovers and menus. Never `expanded`, `visible` or `onClose` alone. |
| Toggle | `pressed` / `defaultPressed` / `onPressedChange` | For `aria-pressed`. |
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

Code-only props (event handlers, `default*`, `className`, `id`) have no Figma property. Figma-only properties (`State`, `Has <x>`, design-only interaction states such as Menu `Expanded`) are listed as such.

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
- **No new gate yet.** Detection stays with the existing `drift` report in `component-patterns.json`. A deterministic naming check (banned boolean prefixes, `on*` handlers without a matching state prop, controlled props missing their `default*`/`on*Change` partners) is a follow-up. It should land after the migration below, otherwise it starts red.
- **Existing drift is migrated in a separate PR.** These are breaking renames, each touching code, metadata, stories and Figma, so they ship apart from this decision:

  | Component | Before | After | State |
  |---|---|---|---|
  | AppHeader | `searchValue` + `onSearchChange` | `onSearchValueChange` | Migrated 2026-10-07 |
  | DropdownMenu | `selectedValue`; `onClose`; rendered conditionally by the consumer | `value`; `open` + `onOpenChange` (controlled only: the consumer owns the trigger, and the menu only ever requests `false`) | Migrated 2026-10-07 |
  | TextField | `size: default \| large` | `size: md \| lg` (40px/48px, the same steps as Button) | Migrated 2026-10-07; Figma size values still to check and rename |
  | Chip | `selected` (renders `aria-pressed`) | Review: `pressed` matches the ARIA contract; `selected` is the familiar filter-chip word | Open |
  | Card, CardHorizontal, Badge | `variant` values `default`, `outline` | Review against ADR-024's "name the weight" rule | Open |

- **Out of scope:** forwarding `ref` to the root element (ds101 usability checklist, question 9). No component forwards one today. That is a behaviour gap, not a naming one, tracked in issue #114.
