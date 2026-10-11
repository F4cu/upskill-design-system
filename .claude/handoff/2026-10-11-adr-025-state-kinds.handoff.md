---
status: active
created: 2026-10-11
completed:
---

# ADR-025 state model refinement — apply from laptop

Self-contained: apply it in a session with repo access. Revised 2026-10-11 after a research pass. The groups are now named by **who sets the state**, and `disabled` gets its own Figma property instead of a `State` option.

## Ask (from the developer)

ADR-025 should be more specific: interaction states separated from app-owned states; a lifecycle story for things like a loading Button or a skeleton card; code-only state and ARIA attributes; and a table with prop examples, the prop's type, and whether each maps to Figma. Revision: the previous grouping (Interaction / Props / Output) was confusing, because hover *is* a property in Figma. Group by who sets the state instead, and split `disabled` out of `State`.

## Research basis (for the ADR context, verified 2026-10-11)

- **Nathan Curtis, "The Sorry State of States" (Dec 2024):** of 10 published Figma text-input kits (Material 3, MUI, SLDS, Primer, Carbon, Atlassian, Redwood, NewsKit, Polaris), 9 put disabled inside `State`; only Atlassian has a separate `isDisabled`. In code, hover/active are implicit, and disabled/readonly are conventional props. He recommends against folding disabled into `State` ("that's not how code works") and recommends a separate `Disabled` property, ordered first because it takes precedence. Focus stays in `State` because it is "triggered client-side, not a developer's configuration."
- **Spectrum:** "user-initiated states: default, hover, down, and keyboard focus"; "disabled, selected, and dragged states … are all component options."
- **Material 3:** disabled is listed with the states, but a disabled component can't be hovered, focused or pressed, and it gets no state layer.
- **React Aria:** props in (`isDisabled`, `isSelected`), states computed (`isHovered`, `isPressed`, `isFocusVisible`), data attributes out.
- **Primer:** `disabled` (native) and `inactive` (`aria-disabled`, stays focusable) are separate props.

## Steps

1. Create a branch off `main`: `git switch -c adr-025-state-kinds` (explicitly requested).
2. `docs/decisions/025-component-state-model.md`: change `**Amended:**` to `2026-10-11` and append the "ADR-025 amendment" block below, verbatim.
3. `docs/decisions/026-*.md`: bump `**Amended:**` to `2026-10-11` and append the "ADR-026 amendment" block below. Do not edit the dated history entries that mention `State=Disabled`; they record what was true at the time.
4. `packages/components/AGENTS.md` → "State model (ADR-025)": replace the intro and table with the "AGENTS.md replacement" block below. Rename the bullet "Exception — interaction state that is app data" to "Controlled state detail" and drop `disabled` from its list. Change "Every lifecycle and content state appears" to "Every lifecycle, async and content state appears".
5. Gates: `npm run claudemd:check` (the nested `packages/components` budget is 16000 bytes), then `npm run docs:check`.
6. Commit, push, open a PR against `main`.
7. **Figma migration: a separate session via `/figma-cli`**, not part of this PR's diff. See "Figma follow-up" below. Until it is done, the ADR-026 amendment marks the affected sets as pending.

## Decisions (confirmed by the developer 2026-10-11)

- **`disabled` is its own Figma property**: `Disabled` boolean, default `false`, ordered first in the property panel. It is not a `State` option. Impossible cells (disabled × hover/active/focus) are not built. Reason: future Chip options (pressed + disabled, clickable) and Checkbox `Checked × Disabled` need independent axes. Compound `State` values don't scale, and nobody draws the combinations a single axis hides.
- The groups are **Interactive** (user, at runtime), **Configured** (the app, via props) and **Derived** (the component, as `aria-*`/`data-*`). "Is it a prop" is a column, not the grouping.
- `loading` is a flag orthogonal to `status`. Skeletons are internal to each component; there is no `Skeleton` component.
- The ADR names a not-yet-existing token, `color.background.skeleton`, to be added later via `/tokens-author`. No component implements `loading` yet.
- `current` has no Figma property today (code-only).
- **Deferred, not decided:** a "locked" control (visible, focusable, announced, not changeable: e.g. a checked checkbox the user can't untick) via `aria-disabled` instead of native `disabled`. HTML `readonly` does not apply to checkboxes. Recorded in the amendment as an open question.
- **Out of scope:** Chip's pressed + disabled styling (`.chip:disabled` outranks `.pressed`, so a disabled pressed chip loses its selected cue). The developer chose not to change Chip now.

## ADR-025 amendment (append to 025)

## Amendment (2026-10-11) — Three groups by who sets the state, and a mapping table

The original three kinds mixed two questions: who sets a state, and whether it is a prop at all. In Figma every state is a property, so "is it a prop" can't be the grouping; it differs per surface. The groups are named by **who sets the state**. Each row then records its code and Figma representation separately.

Other systems draw the same line. Spectrum separates "user-initiated states" (default, hover, down, keyboard focus) from "component options" (disabled, selected, dragged). React Aria separates props passed in (`isDisabled`, `isSelected`) from states it computes (`isHovered`, `isPressed`, `isFocusVisible`) and exposes them as data attributes. Nathan Curtis ("The Sorry State of States", 2024) found 9 of 10 published Figma kits fold disabled into `State`, while code libraries make it a prop, and recommends a separate `Disabled` property.

### The groups

| Group | Set by | Subgroup | Code | Figma |
|---|---|---|---|---|
| **Interactive** | The user, at runtime | hover, focus, active | CSS pseudo-classes only (`:hover`, `:focus-visible`, `:active:not(:disabled)`). Never a prop | `State` variant (`Default`/`Hover`/`Focus`/`Active`), preview only |
| **Configured** | The app, via props | Controlled: `pressed`, `open`, `value` | `<x>` / `default<X>` / `on<X>Change` | Property named like the prop |
| | | Flag: `disabled`, `current`, `loading` | Bare boolean, default `false`, no event | Boolean property named like the prop. `Disabled` is ordered first |
| | | Data-derived: completed, in progress | Derived from a data prop; a `status` enum only when it can't be derived | Property named for its axis (`Status`), never `State` |
| | | Content: empty image, no meta | Fallback when a prop is omitted; no `showX`/`empty` flags | `Has <x>` boolean, or one example per fallback |
| **Derived** | The component | `aria-*`, `data-*` | Computed from props the component already has. Never a prop | None (code-only) |

`State` in Figma holds only the Interactive group. Every Configured state is its own property, so combinations (pressed + hover, checked + disabled) are real cells, not compound `State` values.

### Rules that apply to a subgroup

- **`disabled` is a Configured flag, not an Interactive state.** The app decides it and it has no `on*Change`. In Figma it is a `Disabled` boolean, ordered first because it takes precedence: when `Disabled=true`, `State` is `Default` only. Disabled × hover/active/focus cells are not built (a partial combination set). CSS still paints it with `:disabled`, and interactive rules exclude it (`:hover:not(:disabled)`).
- **`loading` is a flag, orthogonal to `status`.** Lifecycle is about the data (a course is 40% done); `loading` is about an operation in flight. An in-progress card can also be loading, so `loading` is never a `status` value.
  - **Button:** keeps its label and width, swaps the leading icon for a spinner, sets `aria-busy="true"` and `aria-disabled="true"` (not native `disabled`, so focus is kept), and ignores activation.
  - **Fetched content (skeleton):** the component renders its own skeleton internally (ADR-009 rule 3), sets `aria-busy="true"` on the root and hides the placeholder shapes from assistive technology. There is no `Skeleton` component; the fixed set stays closed. The skeleton mirrors the real layout so nothing shifts, and takes its colour from a semantic token (`color.background.skeleton`), never a raw value.
  - A component gets `loading` only when the app genuinely waits there. Metadata `states` lists it and a story shows it.
- **Derived is never a prop.** A component does not expose a prop whose only job is to set an `aria-*` attribute it could derive. Where it can't be derived (`aria-label` on `Icon`), the prop is `label`.

| Derived | From |
|---|---|
| `aria-pressed` | `pressed` |
| `aria-expanded`, `aria-controls` | `open` |
| `aria-selected` | container's `value` |
| `aria-current` | `current`, or position (Breadcrumb) |
| `aria-invalid`, `aria-describedby` | `error` (presence) |
| `aria-busy`, `aria-disabled` | `loading` |
| `aria-live`, `aria-atomic` | Internal (error message region) |
| `data-*` | Internal styling hooks (ADR-020) |

### Mapping reference

One row per state. **Type** is the TypeScript type of the prop. **Maps** says whether it exists in Figma: *both* means the same name and values, differing only in casing; *recorded* means both, with a mapping recorded in ADR-026. Props that are not states (`variant`, `size`, `label`, events, pass-through) are covered by the ADR-026 API proposal, not here.

| Example | Group · subgroup | Type | Code | Figma | Maps |
|---|---|---|---|---|---|
| Hover, focus ring | Interactive | none | CSS `:hover`, `:focus-visible` | `State=Hover` / `Focus` | Figma-only (preview) |
| Momentary press | Interactive | none | CSS `:active:not(:disabled)` | `State=Active` | Figma-only (preview) |
| `disabled` | Configured · flag | `boolean` | `disabled` | `Disabled` boolean, first | Both |
| `current` (NavItem) | Configured · flag | `boolean` | `current` | none today | Code-only until a Figma property exists |
| `loading` | Configured · flag | `boolean` | `loading` | `Loading` boolean | Both |
| `pressed` (Chip) | Configured · controlled | `boolean` | `pressed` | `Pressed` boolean | Both |
| `defaultPressed` | Configured · controlled | `boolean` | `defaultPressed` | none | Code-only |
| `onPressedChange` | Configured · controlled | `(pressed: boolean) => void` | handler | none | Code-only |
| `checked` (Checkbox) | Configured · controlled | `boolean` | native `checked` | `Checked` boolean | Both |
| `open` (Accordion) | Configured · controlled | `boolean` | `open` | `Open` boolean | Both |
| `onOpenChange` | Configured · controlled | `(open: boolean) => void` | handler | none | Code-only |
| `value` (Select) | Configured · controlled | `string` | `value` | `Has value` + `Value` text | Recorded |
| `onValueChange` | Configured · controlled | `(value: string) => void` | handler | none | Code-only |
| `progress` (CardVertical) | Configured · data-derived | `number` (0–100) | `progress`; completed is derived | `Status` variant | Recorded (Figma can't derive) |
| `status` (when not derivable) | Configured · data-derived | string union, e.g. `'notStarted' \| 'inProgress' \| 'completed'` | `status` | `Status` variant | Both |
| `error` (TextField) | Configured · content | `string` | `error`; presence means invalid | `Has error` | Recorded |
| `src` omitted (Image) | Configured · content | `string` (optional) | placeholder fallback | placeholder example | Both |
| `aria-pressed`, `aria-invalid`, `aria-busy` | Derived | none | computed in the component | none | Code-only |

The API proposal in `/component-scaffold` (ADR-026) uses these columns: each state row names its group and subgroup, its type, and its Figma status (both, recorded, code-only, Figma-only).

### Open question: locked controls

Native `disabled` removes a control from the tab order and from form submission. That is right for "not available", but wrong for "on, and you can't change it" (a checked checkbox included in a plan): screen reader users tabbing through never hear its state. HTML `readonly` does not apply to checkboxes. The usual pattern is `aria-disabled="true"` plus blocking the change, as Primer's `inactive` does. No component needs it yet. When one does, decide between a `readOnly` flag and reusing `disabled` with an `aria-disabled` mode, and amend this ADR.

### Consequences

- The state rule in `packages/components/AGENTS.md` is updated to the three groups. The detailed tables stay here.
- Figma components that currently preview disabled as `State=Disabled` move it to a `Disabled` boolean (ADR-026 amendment 2026-10-11 lists the sets). Until each set is migrated, its old mapping stands.
- `loading` is specified but no component has it yet. The first implementation (Button, then `CardVertical`) amends this ADR if the behaviour changes, and adds `color.background.skeleton` through `/tokens-author`.
- Rejected alternatives: grouping by "is it a prop" (hover is a prop in Figma, so the groups contradict the design tool); `disabled` as a `State` option (the majority of Figma kits, but it hides combinations like checked + disabled and pressed + disabled, and doesn't match code); five flat kinds, with "async" and "content" as groups of their own (the rules are the same prop rules, so subgroups carry them); a `status` value `loading` (can't combine with lifecycle); a `Skeleton` component (outside the fixed set, and it can't mirror each component's real layout); native `disabled` on a loading button (drops focus mid-request).

## ADR-026 amendment (append to 026)

## Amendment (2026-10-11) — `Disabled` leaves `State`

ADR-025 (amendment 2026-10-11) makes `disabled` a Configured flag. In Figma it becomes a `Disabled` boolean (default `false`, ordered first), a casing-only match with code's `disabled`, so it is no longer a recorded mapping. `State` keeps only `Default`/`Hover`/`Focus`/`Active`. The "Pseudo-classes ↔ `State` variant" row in the mapping table is unchanged, but it no longer covers `:disabled`.

Sets to migrate (each: split `State=Disabled` into `Disabled=true, State=Default`; build disabled only at `State=Default`; keep every instance's look, compared before and after):

- `Button` (`57:1265`) and `Button icon`
- `Checkbox` (`92:8772`): `Checked × Disabled`, both values
- `TextField` and `Select`: `Disabled` alongside `Has value` and `Has error`
- Any other set whose `State` has a `Disabled` value. Check the inventory first; `Chip` and `ButtonArrow` code accepts `disabled`, so confirm whether their sets preview it.

Until a set is migrated, it keeps `State=Disabled` as a pending exception.

## AGENTS.md replacement (packages/components/AGENTS.md)

A "state" belongs to one of three groups, named by who sets it; each has a different home. Never collapse them into one `state` prop.

| Group | Set by | Examples | Code | Figma |
|---|---|---|---|---|
| Interactive | User, at runtime | hover, focus, active | CSS pseudo-classes only, never a prop | `State` variant (preview only); nothing else goes in `State` |
| Configured | App, via props | controlled (`pressed`, `open`, `value`); flag (`disabled`, `current`, `loading`); data-derived (`progress` → completed, else a `status` enum); content (omitted prop → fallback, no `showX`/`empty`) | Controlled: `<x>` / `default<X>` / `on<X>Change`. Flag: bare boolean, default `false` | One property per prop, named like it (`Disabled` first, `Pressed`, `Status`), never a `State` value |
| Derived | Component | `aria-*`, `data-*` | Computed from props, never a prop. `aria-pressed` ← `pressed`, `aria-invalid` ← `error`, `aria-busy` ← `loading` | None (code-only) |

- **`disabled` is a flag, not interaction**: Figma `Disabled` boolean, built only at `State=Default`. **`loading` is a flag, orthogonal to `status`**: sets `aria-busy`; a skeleton is internal to the component, no `Skeleton` component. Full rules and the state mapping table: ADR-025 amendment 2026-10-11.
