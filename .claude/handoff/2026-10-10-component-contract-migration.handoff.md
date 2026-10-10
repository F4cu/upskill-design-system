---
status: active
created: 2026-10-10
completed:
---

# Component API contract migration: remaining components

**Contract:** ADR-026 (prop vocabulary and Figma names, amended 2026-10-10: `Variant`, `Children` slot) + ADR-025 (state model, amended 2026-10-10: `active` = momentary press, `pressed` = toggle).

**Already migrated:** Button, Badge, Chip, CardVertical, Checkbox, TextField, Select.

**Scope:** vocabulary, state and Figma only. The ADR-027 spec rollout (a spec for every component, a generator) is a separate later track.

**PR shape:** one PR per tier. Figma edits are interactive and made after the tier's code merges; each tier is recorded as a dated ADR amendment.

## Tiers

| Tier | What | Branch | State |
|---|---|---|---|
| 0 | Audit: this matrix + Figma property read-back | — | done 2026-10-10 |
| 1 | Breaking renames (AppHeader `NavItem.active` → `current`; Accordion metadata states `collapsed/expanded` → `closed/open`; record `listRole` and `logoSrcDark` as new terms) | `refactor/contract-vocabulary-tier1` | todo |
| 2 | `:active` state on interactive components + ADR-025 "applied to" amendment | `feat/active-state-tier2` | todo |
| 3 | Figma alignment of linked sets + `Active` variants + `figmaNodeId` normalization | `chore/figma-contract-alignment` | todo |
| 4 | Close-out: ADR-026 table, sense, pattern schema (+ 3 `composedOf` mismatches), Airtable push, docs clocks, drift memory | last PR | todo |

## Decisions made during planning

- **AppHeader `onUserClick` stays.** It fires on every user-button click, with or without a menu, and the menu's open state is internal (`useMenuButton`). It is a discrete event that already follows `on<Part><Verb>`, not a controlled open state.
- **TextField and Select get no `:active`.** On a text input or native select it carries no feedback meaning. Record this in the ADR-025 amendment.

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
| ButtonArrow | `61:1228` | `State` Default/Disabled/Hover · `Direction` Right/Left (Left) | 34 | Add `State=Active`. Direction values are casing-only, OK. |
| CardHorizontal | `130:7289` | `Title`, `Duration`, `Author` text · `Certified` bool · `Has author` bool · `Variant` default/inverted · `Has progress` variant | 91 | `Variant` values lowercase while Badge uses `Outline/Filled`: pick one casing. `duration` is optional in code but has no `Has duration`. |
| DropdownMenu | `155:6261` | single component, no properties | 6 | OK as a preview container. |
| DropdownMenu/Item | `155:6236` | `State` Default/Hover | 28 | Add `State=Active`. **Decision:** how to preview the item matching `value` (vocabulary bans `selected` as an item prop; a Figma-only `Current` or `Checked` boolean?). |
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

- figma-cli truncates output at 20,000 characters. Read instance state in chunks.
- `clone()` drops `componentPropertyReferences`; re-wire cloned variants.
- Figma picks a set's default variant by canvas position (top-left).
