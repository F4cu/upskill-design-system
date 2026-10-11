---
status: active
created: 2026-10-10
completed:
---

# Component API contract migration: remaining components

**Contract:** ADR-026 (prop vocabulary and Figma names, amended 2026-10-10: `Variant`, `Children` slot) + ADR-025 (state model, amended 2026-10-10: `active` = momentary press, `pressed` = toggle; amended 2026-10-11 in PR #139: three groups named by who sets the state (Interactive / Configured / Derived), and `disabled` leaves Figma `State` for its own `Disabled` boolean).

**Already migrated:** Button, Badge, Chip, CardVertical, Checkbox, TextField, Select. Button (and `Button icon`), Checkbox, TextField and Select come back in Tier 3 for the `Disabled` split only (ADR-026 amendment 2026-10-11).

**Merge order:** #138 before #139, so ADR-025's amendments stay in date order. #139 then merges main and keeps both sides in ADR-025, `packages/components/AGENTS.md` (#139's state block + #138's TextField/Select exemption on the `active` line; re-run `npm run claudemd:check`), and the clock comments in `docs/00-start-here.md` and `docs/09-context-engineering.md`.

**Scope:** vocabulary, state and Figma only. The ADR-027 spec rollout (a spec for every component, a generator) is a separate later track.

**PR shape:** one PR per tier. Figma edits are interactive and made after the tier's code merges; each tier is recorded as a dated ADR amendment.

## Tiers

| Tier | What | Branch | State |
|---|---|---|---|
| 0 | Audit: this matrix + Figma property read-back | — | done 2026-10-10 |
| 1 | Breaking renames (AppHeader `NavItem.active` → `current`; Accordion metadata states `collapsed/expanded` → `closed/open`; record `listRole` and `logoSrcDark` as new terms) | `refactor/contract-vocabulary-tier1` | merged, PR #137 (2026-10-10) |
| 2 | `:active` state on interactive components + ADR-025 "applied to" amendment | `feat/active-state-tier2` | PR #138 (2026-10-10) |
| — | ADR-025 state groups; `Disabled` leaves Figma `State` (ADR-026 amendment) | `adr-025-state-kinds` | merged, PR #139 (2026-10-11) |
| 3 | Figma alignment of linked sets + `Active` variants + `State=Disabled` → `Disabled` boolean split + `figmaNodeId` normalization | `chore/figma-contract-alignment` | done in Figma 2026-10-11; PR #140 |
| 4 | Close-out: CardVertical.Root `completion` → `Value`, Checkbox checked-hover cell, sense, pattern schema (+ 3 `composedOf` mismatches), Airtable push, docs clocks, drift memory | last PR | todo |

## Tier 3 result (2026-10-11)

The full record is in the ADR-026 amendment "Component contract migration, Tier 3" and the ADR-025 amendment "Mapping reference after the Figma alignment". Every set's instances were snapshotted (shared plugin data `upskill/tier3-snap*` on each set) and verified after: same main component and size, 0 differences across 526 checks.

- Variable `color/background/on-media/active` pushed (`VariableID:2934:438`). Theme 115 → 116.
- `Disabled` split on all six sets that had `State=Disabled`, including the nested `_TextField/Input` (`92:8005`) and `_Select/Trigger` (`92:8030`), where the TextField and Select axes actually live.
- `State=Active` on ButtonArrow, DropdownMenu/Item, Accordion and Checkbox. Accordion closed Hover changed to `overlay/hover`; its missing-font layers fixed.
- Linked and renamed: Avatar, ProgressBar, AppHeader, Breadcrumb, `_Breadcrumb/Link`, `_AppHeader/NavItem`, Show more link, DropdownMenu/Item `Selected`, CardHorizontal `Variant` casing.
- `figmaNodeId` is a node id or `none`, enforced by the schema pattern.

**Decided 2026-10-11 (developer):** the preview boolean is `Selected`; the CardHorizontal values are `Default/Inverted`; the breadcrumb current label is darkened to `text/default` to match code.

**Carried to Tier 4:** CardVertical.Root `completion` → `Value` (matches ProgressBar); Checkbox has no `Checked=true, State=Hover`; the ADR-025 mapping `current` row is already done (moved out of Tier 4).

## Decisions made during planning

- **AppHeader `onUserClick` stays.** It fires on every user-button click, with or without a menu, and the menu's open state is internal (`useMenuButton`). It is a discrete event that already follows `on<Part><Verb>`, not a controlled open state.
- **TextField and Select get no `:active`.** On a text input or native select it carries no feedback meaning. Recorded in the ADR-025 amendment.
- **Tier 2 choices (2026-10-10):** Checkbox gets `:active` (an `overlay.active` image layer over either fill, orthogonal to `checked`). Accordion also gets the missing `:hover` (`overlay.hover` layer). TextLink's active state is `text.default` (the brand text ramp ends at hover). New token `color.background.on-media.active` (`black.alpha.6`) for CardVertical's on-media actions. Its Figma variable push belongs to Tier 3.
- **Tier 3 `State=Active` previews needed for:** Accordion item, ButtonArrow, DropdownMenu/Item, `_Breadcrumb/Link`, `_AppHeader/NavItem`, and Checkbox if a set gets linked. Values are in the ADR-025 Tier 2 table.
- **Tier 3 `Disabled` split (ADR-025/026 amendments 2026-10-11):** each set with a `State=Disabled` value gets a `Disabled` boolean (default `false`, ordered first), built only at `State=Default`; disabled × hover/active/focus cells are not built. Every instance's look is compared before and after. Sets: `Button` (`57:1265`), `Button icon`, `Checkbox` (`92:8772`, both `Checked` values), `TextField`, `Select` (alongside `Has value`/`Has error`), `ButtonArrow` (`61:1228`, Tier 0 read-back shows `State=Disabled`). Check `Chip`'s set first. As each set is migrated, drop it from the ADR-026 pending list (Tier 4).
- **`Current` booleans:** adding `Current` to `_Breadcrumb/Link` and `_AppHeader/NavItem` matches ADR-025 (`current` is a Configured flag). Once they exist, ADR-025's mapping row for `current` changes from "code-only" to "both" (Tier 4).

## Code matrix (from the props types, 2026-10-10)

| Component | Vocabulary drift | `:active` needed | Figma set |
|---|---|---|---|
| Accordion | metadata states `collapsed`/`expanded` | trigger | `29:1153` |
| AppHeader | `NavItem.active` (means current page) | nav link, user button | none recorded |
| Avatar | — | — | none recorded |
| Breadcrumb | — | links | none recorded |
| ButtonArrow | — | yes | `61:1228` |
| Card | — | — | none recorded |
| CardHorizontal | — | — | `130:7289` |
| Checkbox | — | **confirm** (no `:active` rule today) | `92:8772` (done) |
| Divider | — | — | none recorded |
| DropdownMenu | `listRole` → recorded new term | item | `155:6261` |
| Icon | — | — | `96:11108` |
| Image | — | — | `92:16895` |
| ProgressBar | — | — | none recorded |
| ScrollArea | — | — | `""` (layout) |
| TextLink | — | yes | missing field |
| VideoFrame | — | — | "note: …" |
| Box, Stack, Inline, Text, Heading | — | — | layout / text styles (no set by design) |

## Figma matrix (Tier 0 read-back, 2026-10-10, figma-cli)

Linked sets:

| Set | Node | Properties (values, default) | Inst. | Gaps vs contract → Tier 3 action |
|---|---|---|---|---|
| Accordion | `29:1153` | `Open` true/false (false) · `State` Default/Hover | 80 | Add `State=Active` (after Tier 2). |
| ButtonArrow | `61:1228` | `State` Default/Disabled/Hover · `Direction` Right/Left (Left) | 34 | Split `State=Disabled` into a `Disabled` boolean (first, only at `State=Default`), then add `State=Active`. Direction values are casing-only, OK. |
| CardHorizontal | `130:7289` | `Title`, `Duration`, `Author` text · `Certified` bool · `Has author` bool · `Variant` default/inverted · `Has progress` variant | 91 | `Variant` values lowercase while Badge uses `Outline/Filled`: pick one casing. `duration` is optional in code but has no `Has duration`. |
| DropdownMenu | `155:6261` | single component, no properties | 6 | OK as a preview container. |
| DropdownMenu/Item | `155:6236` | `State` Default/Hover | 28 | Add `State=Active`. **Decision (narrowed by ADR-025 2026-10-11):** in code the selected look is Derived (`aria-selected` from the container's `value`), so it is never an item prop. Figma needs a preview-only boolean, recorded as a mapping in ADR-026. Only its name is open (`Selected` mirrors the ARIA attribute; `Current` would collide with `aria-current`). |
| Icon | `96:11108` | a SECTION, not a set (frames + vectors) | — | `figmaNodeId` points at a section. Check whether icons are components; probably record it as "no set". |
| Image | `92:16895` | `Size` Small/Large/Medium (Small) | 217 | Already recorded as Figma-only. No change. |

Unlinked candidates (exist in Figma; metadata says "no set"):

| Code | Figma | Node | Properties | Inst. | Tier 3 action |
|---|---|---|---|---|---|
| Avatar | Avatar | `95:16289` | `Size` Small/Medium/Large | 38 | Link; `Size` → `sm/md/lg` (Button precedent). |
| ProgressBar | Progress bar | `54:1259` | `completion` 0/10/20/50/80/100 (100) | 223 | Link; rename set `ProgressBar`; `completion` → `Value` (record as a preview mapping of the numeric `value`). |
| Breadcrumb | Breadcrumb (component) | `86:3211` | none | 16 | Link. |
| Breadcrumb link (part) | breadcrumb link | `130:8323` | `State` Active/hover/Current (**Active is the resting state**) | 51 | Split into `Current` bool (aria-current) × `State` Default/Hover/Active. This is the exact collision ADR-025 warns about. Rename to `_Breadcrumb/Link`. |
| AppHeader | Header main | `82:2242` | `headerLayout` Desktop/Tablet/Mobile | 16 | Link, rename set `AppHeader`; `headerLayout` → `Device` (Figma-only preview, record it). |
| AppHeader nav link (part) | Nav item | `130:8676` | `Property 1` Default/Variant2 | 22 | Check what Variant2 shows (probably current). Rename to `Current` bool × `State`; set `_AppHeader/NavItem`. |
| Accordion list (Figma-only) | Show more link | `86:3505` | `state` collapsed/expanded/state3/state4 · `Property` Default/hover | 8 | Same treatment as the Accordion item: `Open` × `State`. It is Figma-only (inside Accordion list). |
| Card | Card Small (Mockups page) | `20:5845` | none | 5 | A mock-up, not the Card set. Record Card as "no set". |

Not found: Divider, TextLink. Record them as "no set".

## Pitfalls

- `clone()` on a variant puts the copy on the **current page**, not in the set, and a failed eval doesn't roll back. Move the copy in with `set.appendChild` and make the script idempotent. `appendChild` fails if the clone has a missing font.
- figma-cli truncates output at 20,000 characters. Read instance state in chunks.
- `clone()` drops `componentPropertyReferences`; re-wire cloned variants.
- Figma picks a set's default variant by canvas position (top-left). The `Disabled` split re-grids a set, so check the default afterwards (`Button icon` precedent, ADR-026).
