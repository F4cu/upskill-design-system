---
title: "ADR-025 — Component state model"
---
# ADR-025 — Component state model

**Date:** 2026-10-06
**Amended:** 2026-10-11
**Status:** `accepted`

## Context

"State" was used loosely for three different things: interaction (hover, focus), lifecycle (a course in progress or completed) and content (a card with no image). Putting them all in one `state` prop, or a set of booleans, gives an API with impossible combinations (`isStarted={false} isCompleted`) and Figma properties that clash with code. The need came up when `CardVertical` needed a "Completed" look.

## Decision

Each kind of state has its own home (rule table in `packages/components/AGENTS.md` → "State model"):

- **Interaction** is CSS pseudo-classes only, never a prop. It shows up in Figma as a `State` variant used for previews. The exception is interaction state the app owns (`pressed`, `selected`, `open`), which is a controlled prop with `default*`/`on*Change`.
- **Lifecycle** is derived from a data prop when possible. When it can't be derived, it is one `status` enum, never a set of booleans. In Figma it is named for its axis (`Status`), never `State`.
- **Content** is the fallback when a prop is omitted. There are no `showX`/`empty` flags.

First application: `CardVertical` derives "completed" from `progress >= 100` and adds a `CardVertical.Completed` marker (check icon + "Completed", styled like Certified) to its meta row. There is no `completed` or `status` prop. Rejected alternative: a `status: 'notStarted' | 'inProgress' | 'completed'` prop. It would duplicate `progress` and could disagree with it. It stays the fallback if product ever needs lifecycle and percentage to differ.

## Consequences

- Scaffolds and reviews have one rule for naming state props. Figma and code names line up because `State` is reserved for interaction.
- A derived state can't be forced. A consumer who needs "completed" at 90% must use the parts API.

## Amendment (2026-10-10) — `active` (momentary press) vs `pressed` (toggle)

"Pressed" means opposite things across sources: in WAI-ARIA (`aria-pressed`) and in `Chip` it is a persistent toggle the app owns; in Material and Atlassian it is the momentary press while the pointer is down. Aligning Button to Figma needed the momentary state, so the two meanings had to be split before both landed in one system.

- **`active`** is the momentary press: an interaction state, CSS `:active:not(:disabled)` only, never a prop, a `State` variant value (`Active`) in Figma. Tokens are named `*.active` (`color.background.button.<variant>.active`, `color.background.overlay.active`).
- **`pressed`** stays reserved for the ARIA toggle: app data, a controlled prop backed by `aria-pressed`, a Boolean property in Figma.
- The axes are orthogonal: every interactive component gets `active`, including toggles. `Chip` shows `active` whether `pressed` is true or false (as Material does for filter chips).

First application: `Button` (all four variants) and `Chip`. A 10% overlay drops brand and subtle text just below AA in the light theme, so `active` also darkens text one step (`text.default`, `text.interactive.hover`) instead of taking a contrast waiver. `danger` has no red step past `red.12` (its hover), so `danger.active` aliases `red.dark.4`; theme files already cross into dark sub-scales (`container.inverted`, `text.accent.inverted`). Rejected alternative: naming the momentary state `pressed` to match Material/Atlassian tokens. That would give `pressed` two meanings in one system and clash with Chip's prop.

## Amendment (2026-10-10) — `active` applied to every interactive component

The first amendment applied `active` to Button and Chip. Tier 2 of the contract migration extends it to the rest of the interactive set, each one step past its hover:

| Component | Part | `active` |
|---|---|---|
| Accordion | trigger | `overlay.active` layered as a `background-image` over the open item's elevated fill. Adds the missing `:hover` (`overlay.hover`, same layering) that Figma already showed. |
| AppHeader | nav link, user button | label `text.brand` → `text.interactive.hover` |
| Breadcrumb | link | label `text.brand` → `text.interactive.hover` |
| ButtonArrow | button | background `overlay.subtlest` → `overlay.active` |
| CardVertical | favorite, menu (on-media) | new `background.on-media.active` (`black.alpha.6`, one step past hover) |
| Checkbox | box | `overlay.active` layered over either fill (input or brand), so both checked states darken one step without a new brand token. Orthogonal to `checked`, as Chip's `active` is to `pressed`. |
| DropdownMenu | item | `overlay.hover` → `overlay.active` |
| TextLink | link | `text.interactive.hover` → `text.default`. The brand text ramp ends at hover, so it takes the same text-darkening rule as Button neutral and Chip. |

**Exempt:** `TextField` and `Select`. On a text input or a native select, a press carries no feedback meaning (focus is the feedback). Display components (Card, CardHorizontal, Image, VideoFrame, Avatar, ProgressBar, Divider, layout and text primitives) have no pressable surface.

## Amendment (2026-10-11) — Three groups by who sets the state

The original three kinds mixed two questions: who sets a state, and whether it is a prop. In Figma every state is a property, so "is it a prop" can't be the grouping. States are grouped by **who sets them**, and each one records its code and Figma form separately. Spectrum ("user-initiated states" vs "component options") and React Aria (props in, computed states out) draw the same line.

| Group | Set by | Subgroup | Code | Figma |
|---|---|---|---|---|
| **Interactive** | The user, at runtime | hover, focus, active | CSS pseudo-classes only. Never a prop | `State` variant (`Default`/`Hover`/`Focus`/`Active`), preview only |
| **Configured** | The app, via props | Controlled: `pressed`, `checked`, `open`, `value` | `<x>` / `default<X>` / `on<X>Change` | Property named like the prop |
| | | Flag: `disabled`, `current`, `loading` | Bare boolean, default `false`, no event | Boolean named like the prop; `Disabled` ordered first |
| | | Data-derived: completed, in progress | Derived from a data prop; a `status` enum only when it can't be derived | Named for its axis (`Status`), never `State` |
| | | Content: empty image, no meta | Fallback when a prop is omitted; no `showX`/`empty` flags | `Has <x>` boolean, or one example per fallback |
| **Derived** | The component | `aria-*`, `data-*` | Computed from props it already has. Never a prop | None (code-only) |

`State` in Figma holds only the Interactive group. Every Configured state is its own property, so combinations (pressed + hover, checked + disabled) are real cells, not compound `State` values.

- **`disabled` is a Configured flag.** The app decides it and it has no event. In Figma it is a `Disabled` boolean, ordered first because it takes precedence: with `Disabled=true`, `State` is `Default` only. CSS paints it with `:disabled`, and interactive rules exclude it (`:hover:not(:disabled)`). Most published Figma kits fold disabled into `State` (Nathan Curtis, "The Sorry State of States", 2024: 9 of 10); this system follows code instead, as Curtis recommends.
- **`loading` is a flag, orthogonal to `status`.** Lifecycle is about the data; `loading` is an operation in flight, and an in-progress card can also be loading. A loading Button keeps its label and width, swaps the leading icon for a spinner, sets `aria-busy` and `aria-disabled` (not native `disabled`, so focus is kept) and ignores activation. Fetched content renders its own skeleton internally (ADR-009 rule 3), mirrors the real layout, sets `aria-busy` on the root, hides the placeholder shapes from assistive technology, and takes its colour from `color.background.skeleton`. There is no `Skeleton` component. A component gets `loading` only when the app genuinely waits there.
- **Derived is never a prop.** A component doesn't expose a prop whose only job is setting an attribute it could compute. Where it can't (`aria-label` on `Icon`), the prop is `label`.

| Derived | From |
|---|---|
| `aria-pressed` | `pressed` |
| `aria-expanded`, `aria-controls` | `open` |
| `aria-selected` | container's `value` |
| `aria-current` | `current`, or position (Breadcrumb) |
| `aria-invalid`, `aria-describedby` | `error` (presence) |
| `aria-busy`, `aria-disabled` | `loading` |
| `data-*` | Internal styling hooks (ADR-020) |

**Mapping reference.** *Both* means the same name and values, differing only in casing; *recorded* means a mapping in ADR-026. Props that aren't states (`variant`, `size`, `label`, events) belong to the ADR-026 API proposal.

| Example | Group · subgroup | Type | Figma | Maps |
|---|---|---|---|---|
| Hover, focus ring, momentary press | Interactive | none | `State=Hover` / `Focus` / `Active` | Figma-only (preview) |
| `disabled` | Configured · flag | `boolean` | `Disabled` | Both |
| `current` (NavItem) | Configured · flag | `boolean` | `Current` | Both. Breadcrumb derives it from position; its `_Breadcrumb/Link` part previews it with the same boolean |
| `loading` | Configured · flag | `boolean` | `Loading` | Both |
| `pressed` (Chip), `checked` (Checkbox), `open` (Accordion) | Configured · controlled | `boolean` | `Pressed`, `Checked`, `Open` | Both |
| `value` (Select) | Configured · controlled | `string` | `Has value` + `Value` text | Recorded |
| `progress` (CardVertical) | Configured · data-derived | `number` (0–100) | `Status` | Recorded (Figma can't derive) |
| `status` (when not derivable) | Configured · data-derived | string union | `Status` | Both |
| `error` (TextField) | Configured · content | `string` | `Has error` | Recorded |
| `src` omitted (Image) | Configured · content | `string` (optional) | placeholder example | Both |
| `aria-selected` (DropdownMenu item) | Derived | none | `Selected` | Recorded (preview only) |
| `aria-pressed`, `aria-invalid`, `aria-busy` | Derived | none | none | Code-only |

Consequences:

- Figma sets that previewed disabled as `State=Disabled` now use a `Disabled` boolean. All of them were migrated on 2026-10-11 (ADR-026, Tier 3 amendment); no `State` in the file has a `Disabled` value.
- No component implements `loading` yet. The first one (Button, then `CardVertical`) adds `color.background.skeleton` through `/tokens-author` and amends this ADR if the behaviour changes.
- Open: a locked control (on, can't be changed, still announced) needs `aria-disabled` rather than native `disabled`, which drops focus and form submission; HTML `readonly` doesn't apply to checkboxes. Decided when a component first needs it.
- Rejected: grouping by "is it a prop" (hover is a prop in Figma); `disabled` as a `State` value (hides checked + disabled and pressed + disabled, and doesn't match code); `loading` as a `status` value (can't combine with lifecycle); a `Skeleton` component (outside the fixed set, can't mirror each layout); native `disabled` on a loading button (drops focus mid-request).

## Amendment (2026-10-11) — Mapping reference after the Figma alignment

Tier 3 of the contract migration brought the Figma file in line with the groups above (ADR-026 amendment of the same date has the per-set detail). The mapping reference changes in two rows:

- **`current` is Both.** `_AppHeader/NavItem` and `_Breadcrumb/Link` have a `Current` boolean, crossed with `State` (`Default`/`Hover`/`Active`). Breadcrumb's link had `Active` as its resting value and `Current` as a `State` value, the collision this ADR warns about.
- **`aria-selected` gets a preview.** A Derived state is never a prop, but a designer still needs to see the selected item. `DropdownMenu/Item` has a preview-only `Selected` boolean (built at `State=Default` only), recorded in ADR-026. It is named after the ARIA attribute, because `Current` would collide with `aria-current`.


## Amendment (2026-10-11) — Checkbox checked hover

Tier 4 found that a checked Checkbox had no deliberate hover. `.checkbox:hover:not(:disabled)` outranks `.checkbox:checked`, so on hover the brand box took the neutral `border.input.hover` border. The Tier 2 `:active` rule already restored the brand border for checked boxes; hover had no such rule. A checked box on hover now keeps the brand border and layers `overlay.hover` over the brand fill, one step short of `active` (`overlay.active`, same layering). Figma's Checkbox set gains the matching `Checked=true, State=Hover` cell. Rejected: no hover change on a checked box (no interactivity signal, unlike every other interactive part), and keeping the neutral border (an accident of specificity, not a design).
