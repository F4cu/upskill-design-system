---
title: "ADR-023 — Subcomponents: preset + parts under a dot namespace"
---
# ADR-023 — Subcomponents: preset + parts under a dot namespace

**Date:** 2026-10-01
**Status:** `accepted`

## Context

Every component in the fixed set is a flat-props component: one function, one props object, no context, no sub-component assignment (`.claude/component-patterns.json` recorded this as the system-wide `architecturalStyle`). That has held because each component so far had one job and one layout.

`CardVertical` broke the pattern. It needs two new overlay actions: a favorite toggle and an overflow menu. A card can show one of them or neither, never both. It also needs consumer-specific content, such as an instructor row or a grouped "New · Updated this week" meta line. Done with flat props, that becomes `favorite`, `favorited`, `onFavoriteChange`, `menuItems`, `onMenuSelect`, `actionPosition`, `hideMeta`, `metaSlot`. Most of those only make sense in particular combinations, and nothing in the type system stops `favorite` and `menuItems` from being set together. Every new requirement adds another prop. That is configuration collapse.

The options were:

1. **Keep flat props.** Add the props above and document the invalid combinations as anti-patterns.
2. **Empty container.** Ship `CardVertical` as a styled shell that consumers fill and lay out themselves (the Chakra and Radix Themes Card model).
3. **Preset + parts.** Keep today's prop API as a preset, rebuilt from named parts that consumers can compose directly when the preset doesn't fit.

The approved proposal (2026-09-30, CardVertical subcomponents PoC) chose option 3. This ADR records it as a convention so the next component that needs parts follows the same rules.

## Decision

### When to split a component into parts

Parts are a response to a second real use case, not a starting design. Run the [ADR-009](009-extend-vs-new-vs-internal.md) three-question test on the new requirement first:

- If a prop or variant on the existing component covers it (question 1), add the prop. Parts are not justified.
- Split into parts only when the new requirement can't be a single prop without creating invalid prop combinations (mutually exclusive props, props that are only meaningful together, or escape-hatch `render*`/`*Slot` props), **and** the content is still the same component role.
- A part is never a new component. It doesn't enter the fixed set, has no folder of its own, and is declared in its parent's metadata (`composition.parts`).

"Make the common configurable, make the uncommon composable" ([ds101 — Component API design](https://f4cu.github.io/ds101/component-api-design/)). The preset serves the common case. The parts serve the uncommon one.

### Preset + parts

- `<Parent …props />` stays the **preset**. It is rebuilt from the parts and keeps its existing props, so adopting parts is never a breaking change. The preset gains new props only for common cases (for CardVertical, exactly one: `action`). A request for `metaSlot`, `hideX` or `renderX` is answered with parts, not another preset prop.
- Ready-made compositions are the safeguard against fragmentation: every supported arrangement ships as a named `usage.patterns` entry and a story, so consumers copy a documented composition instead of inventing one.

### Dot namespace and context guard

- Parts are attached to the preset with `Object.assign(Preset, { Root, Media, … })` and are reachable only as `Parent.Part`. They are not exported individually. Their prop types are exported. ([ds101 — Component composition in code](https://f4cu.github.io/ds101/component-composition-in-code/) describes the pattern.)
- `Root` provides a context with the state that parts share (for CardVertical: `size` and the title's `useId`). Every other part reads it through a guard hook that **throws** `"Parent.X must be rendered inside Parent.Root"` when the context is missing. A misplaced part fails loudly in development instead of rendering half a component.

### Part kinds

Each part has one of three kinds, declared in metadata:

| Kind | Children | Layout | Example |
|---|---|---|---|
| `fixed` | Content and state props only; no arbitrary children | Owned by the parent's CSS Module | `Media`, `Title`, `Favorite` |
| `slot` | Exactly one child from its `accepts` list | Owned by the parent's CSS Module | `Action` (one `Favorite` or one `Menu`) |
| `open` | Any number of children from its `accepts` list | Built on a layout primitive with fixed props | `Body` = `Stack gap="sm"`, `Meta` = `Inline gap="sm" wrap align="center"` |

`accepts` lists fixed-set component names and/or sibling part names. It is only valid on `slot` and `open` parts.

### Spacing ownership: no margins, no layout props on parts

- **The container owns the space between its children.** Space between parts comes from `Root` or from an open part's primitive. A part never sets an outer margin.
- **Open parts accept `children` only.** They don't forward `gap`, `align` or any other layout prop, so `<Parent.Body gap="lg">` is a TypeScript error. Custom spacing comes from nesting a `Stack` or `Inline` inside the open part.
- **The page layout owns the component's position.** Nothing inside the component reaches outward.

This is the system's existing spacing model applied one level down. [ADR-004](004-layout-token-categories.md) already replaced margin-based stacking with `gap` on `Stack`/`Inline`, and component CSS already sets no outer margins. External precedent: Braid (SEEK) ("spacing between elements is owned entirely by layout components") and React Spectrum's Dialog, where consumers pass semantic parts and the container decides placement and spacing.

### Naming contract with Figma

Code and Figma use the same names, values and defaults. Casing is the only permitted difference.

- Part names are Figma layer names. Figma's instance swap keeps overrides only when layer names match, so matching names is what keeps a swap from silently dropping content.
- A `slot` part maps to a Figma instance-swap property ([ds101 — Component composition in Figma](https://f4cu.github.io/ds101/component-composition-in-figma/): slot = swappable nested instance).
- Booleans name a state and default to `false` (`Pressed`, `Expanded`, `Certified`). An interaction state with no code prop (Menu `Expanded`) may exist in Figma only and is documented as design-only.

Scope: this contract applies to components with parts. The system-wide property-naming audit is a separate follow-up.

### Enforcement

- `component.schema.json`: optional `composition.parts[]` with `name`, `kind`, `description`, `builtOn`, `required`, `accepts`, `containedBy`.
- `scripts/validate-metadata.js` requires part names to be unique and not to collide with a component folder name. `accepts` is not allowed on `fixed` parts and is required on `slot`/`open` parts. Each `accepts` entry must be a component folder or a sibling part. Each `containedBy` entry must be a sibling part. `builtOn` must be a component folder or `null`.
- `scripts/validate-layout.js` allows `<Parent.Part>` only when `Parent` is in the fixed set and `Part` is declared in its metadata. It also enforces each part's `containedBy`, each open/slot part's `accepts` on direct children, the one-child rule for slots, and `required` parts inside their container.
- `scripts/generate-pattern-schema.js` counts `<Parent.Part>` as a use of `Parent`, never as a component of its own, and reports components that attach parts as `architecturalStyle: "compound"`.

## Consequences

- The fixed set stays the same size. Parts add API surface inside one component without adding a component, and the three-question test still gates new components.
- Composition becomes machine-checkable at the same level as page layouts: `/layout-generation` and the reviewer can verify a composed card against `accepts` and `containedBy` instead of reading prose.
- Consumers get two ways to render the same component. The preset must stay a pure composition of the parts: identical screenshot baselines before and after a component adopts parts are the proof.
- `Object.assign` statics are invisible to some tooling. Storybook needs `subcomponents` in the story meta to document part props.
- Fixed spacing inside open parts is a deliberate constraint. A consumer who wants different rhythm nests a primitive instead of overriding the part, which keeps every instance of the component on the same vertical rhythm.
- Only CardVertical has parts as of this ADR. A second component (CardHorizontal, Card) adopts parts only when its own second use case passes the test above.
