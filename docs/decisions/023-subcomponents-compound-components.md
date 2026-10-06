---
title: "ADR-023 — Subcomponents: preset + parts under a dot namespace"
---
# ADR-023 — Subcomponents: preset + parts under a dot namespace

**Date:** 2026-10-01
**Amended:** 2026-10-06
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

- Part names are Figma layer names. When you swap an instance or select a variant, Figma preserves an override only if the layer names match ([Figma Help — Apply changes to instances](https://help.figma.com/hc/en-us/articles/360039150733-Apply-changes-to-instances), "Change preservation"). Matching names is what keeps a swap from silently dropping content. A swap from the Assets panel preserves text overrides only, whatever the names.
- A `slot` part maps to a Figma instance-swap property whose preferred instances are the part's `accepts`. Instance swap is the Figma tool for a fixed piece with at most one instance in a fixed place ([ds101 — Component composition in Figma](https://f4cu.github.io/ds101/component-composition-in-figma/), "Choosing variants, instance swap, or slots"). An optional slot needs a separate visibility boolean, because an instance swap has no empty option. Code's `slot` kind is not a Figma native slot.
- An `open` part is not a Figma native slot on the preset: the preset keeps fixed layers carrying its text and boolean properties (Amendment 2026-10-01). It is a native slot on the separate `Parent.Root` component (Amendment 2026-10-06).
- Each part with its own Figma component (`Favorite`, `Menu`) owns its properties. The parent exposes them through "expose properties from nested instances" and does not redefine them. Base components are built first.
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

## Amendment (2026-10-01) — Figma mirrors the preset; open parts are not Figma slots

The first version cited ds101 for "slot = swappable nested instance". That page now describes the swappable nested instance as the workaround from before Figma had native slots. It separates the three tools by how much the consumer may change: variants for states, instance swap for one fixed piece, native slots for freeform content. The `slot` → instance-swap mapping still holds under that guidance. The open parts needed their own decision.

**Decision.** In Figma, CardVertical mirrors the **preset**, not the composable parts. `Body` and `Meta` stay fixed layers. Figma doesn't allow component properties on layers inside a native slot, so turning `Body` into a slot would cost the `Title`/`Duration` text properties and the `Certified` boolean. Those properties cover the common case. That is "common configurable, uncommon composable" applied to the Figma file.

**Alternatives considered.** Mirroring the parts (`Body`/`Meta` as native slots, with preferred instances from `accepts`) would follow the code more literally. It gives up the preset's properties, and the Plugin API's support for creating slots through figma-cli is unverified.

**Revisit when** a designer needs a composed layout in Figma (the `instructor-row` or `grouped-meta` pattern) and would otherwise detach. Then add a native slot for the open part, with preferred instances from its `accepts`. A slot might live on a separate composed component so the preset keeps its properties.

## Amendment (2026-10-02) — One prop per datum; separators belong to the component

CardHorizontal's second use case (promotional footer cards that show an author) arrived as a merged string: `duration="Jon Kabat-Zinn · 2 hours, 15min"`, mirrored in Figma by an author name typed into the old "Lessons" text layer. That breaks the naming contract in a way the property names alone don't show. The name says `duration`, but the value holds two kinds of data and a hand-typed separator.

**Decision.**
- **One prop holds one kind of data.** A new piece of content gets its own prop named for what it is (`author`), never a prefix on an existing one. Figma mirrors it with its own text property and an `Has <x>` visibility boolean (default `false`), following the `Has action` precedent.
- **The component draws separators.** Consumers pass plain values. The component decides where separators go and renders them `aria-hidden`, so they never reach the accessible name. In Figma, each separator's visibility is bound to its neighbour's boolean.
- **Applying the test above:** an optional `author` creates no invalid prop combination, so CardHorizontal stays flat props (ADR-009 question 1), not parts. The two usages (started courses; footer promotion) are documented as `usage.patterns`, not as a mode variant.

**Alternatives considered.** A generic `subtitle` prop would accept topics, authors or anything else, which is the same ambiguity under a vaguer name. A `usage="promo"` variant would bundle content choices into a mode and block reasonable combinations (a promoted course that is also certified).

## Amendment (2026-10-06) — Figma gets a composed `Root` with native slots; one example per pattern

The 2026-10-01 amendment's revisit trigger arrived: ADR-025 added a Completed state, and the `custom-meta`, `instructor-row`, `grouped-meta` and `title-only` patterns had no Figma counterpart, so a designer had to detach to draw them. figma-cli now verifiably drives native slots: `ComponentNode.createSlot()`, a `SLOT` component property with preferred values, and adding or removing slot content inside an instance. The one setting the Plugin API doesn't expose is "Only allow preferred instances".

**Decision.** Figma mirrors both of code's entry points, as two components:

| Code | Figma |
|---|---|
| Preset `<Parent …props />` | The existing component set. It keeps its text, boolean and variant properties, and stays the default for the common case. |
| Parts under `<Parent.Root>` | A `Parent.Root` component with the preset's structural properties (size, action) and its `open` parts as native slots. |

How each part kind maps to Figma:

| Part kind | Figma construct |
|---|---|
| `fixed` | A nested layer or instance with its own properties, exposed on the parent (`Progress` → `completion`, `Favorite` → `Pressed`) |
| `slot` | An instance-swap property with a `Has <x>` visibility boolean (unchanged) |
| `open` | A native slot on `Parent.Root` only. Its auto-layout gap is bound to the same spacing variable as the code primitive, and that gap is fixed in the main component, which mirrors "no layout props on open parts". |

- **Part components exist only for slot content.** A part that can go into a slot (`Title`, `Meta`, `Duration`, `Certified`, `Completed`) becomes a component named `Parent.Part`, and its instances in slots carry the plain part name as the layer name. The preset uses part instances only where that doesn't cost its properties. A parent can't bind its own text property to a text layer inside a nested instance, and replacing a layer drops existing instance overrides. So text-property parts (`Title`, `Duration`) stay text layers in the preset, with the same text style and variables as the part. (In CardVertical, 47 placed cards had their own title text and 14 had their own duration text.)
- **Preferred instances = `accepts` where a Figma component exists.** `Stack`, `Inline` and `Text` are auto-layout frames and text layers in Figma, not components. "Only allow preferred instances" is therefore left off. The fixed slot gap still enforces the spacing rule that matters.
- **Derived state stays with the preset.** ADR-025's derived `Status` controls the derived marker (`Completed`) only in the preset. On `Root` the marker is consumer-placed slot content, the same responsibility the parts API carries in code.
- **One example per pattern.** Every `usage.patterns` entry that isn't a page layout gets an example frame named with the exact pattern id, captioned with its story and description. The frames go in a `<Parent> examples` section and are built only from instances, never detached: preset patterns from the component set, parts compositions from `Root`. Carousel and page patterns belong on the Layout Examples page.

**Alternatives considered.** Making `Body` a slot on the preset itself would lose the preset's properties, the cost the 2026-10-01 amendment rejected. Making the examples components would add Figma components with no code counterpart, which breaks the one-to-one inventory, so they stay frames that designers copy.

**Consequences.** `Root` has no interaction (`State`) variant until a composition needs a hover preview. A component that adopts parts later gets the same pair, a preset set plus `Parent.Root`, built in that order.

