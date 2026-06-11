# ADR-005 — `size` vs `space` Primitives

**Date:** 2026-06-11
**Status:** `accepted`

## Context

The primitive layer has two numeric scales that both affect layout: `space` and `size`. They share the same underlying grid unit (multiples of 4px) and their values overlap. Without a clear rule, contributors building components face an ambiguous choice: does a button's height come from `space` or `size`?

A secondary issue: the original `size` primitive keys used T-shirt names (`xs`, `sm`, `md`, `lg`, `xl`, `xxl`) while `space` uses a numeric scale (`050`, `100`, `200`…). This inconsistency made the two scales feel unrelated even though they share the same base unit.

## Decision

**`space.*` is for empty space — the absence of content.**
It answers: "how much distance goes between or around things?"
Used for: gap, padding, margin — in component CSS Modules via semantic aliases (`space.inset.*`, `space.stack.*`, `space.inline.*`).

**`size.*` is for filled elements — the presence of content.**
It answers: "how big is this element?"
Used for: width, height, min-width, min-height of component elements like icons, avatars, badges, and control heights.

These are semantically distinct even when their pixel values coincide. `size.300 = 24px` and `space.300 = 24px` are the same raw value but different intents — one describes an avatar's diameter, the other describes a gap between siblings. The token name carries that intent across the entire system.

**Numeric keys on `size` match the `space` scale.**

`size` primitive keys are now numeric and mirror the corresponding `space` keys (`size.200 = 16`, `size.300 = 24`, etc.). The `size` scale only covers the values meaningful for component dimensions — it does not include `000` (0) or `050` (4px) because no filled component has a dimension of 0 or 4px.

| `size` key | value | matching `space` key |
|---|---|---|
| `size.200` | 16px | `space.200` |
| `size.300` | 24px | `space.300` |
| `size.400` | 32px | `space.400` |
| `size.500` | 40px | `space.500` |
| `size.600` | 48px | `space.600` |
| `size.800` | 64px | `space.800` |

**T-shirt names belong at the semantic layer, not the primitive layer.**

When a component needs size variants, a semantic alias is defined in the theme layer that maps a named size to a `size.*` primitive:

```json
// theme/light.json (future — added when the component is built)
"icon": {
  "size": {
    "sm": { "$type": "number", "$value": "{size.200}" },
    "md": { "$type": "number", "$value": "{size.300}" },
    "lg": { "$type": "number", "$value": "{size.400}" }
  }
},
"avatar": {
  "size": {
    "sm": { "$type": "number", "$value": "{size.300}" },
    "md": { "$type": "number", "$value": "{size.400}" },
    "lg": { "$type": "number", "$value": "{size.600}" }
  }
}
```

`icon.size.sm` and `avatar.size.sm` are both "small" but resolve to different primitives — because smallness is relative to the component type. The semantic layer is where that judgment is encoded.

## Consequences

- **Component CSS Modules reference semantic size aliases, never raw `size.*` primitives directly.** `var(--ds-icon-size-md)` is correct; `var(--ds-size-300)` in a component is a smell that the semantic alias is missing.
- **Cross-use is a bug.** Using `space.*` for a component's width or height, or using `size.*` for a gap or padding, misrepresents intent. Linters or ADR-based code review should catch this.
- **New fixed-dimension needs add a `size.*` key only if the value doesn't already exist.** If a new component needs a 56px dimension, add `size.700` — don't repurpose an existing key.
- **Semantic size aliases are added component-by-component** as components are built in Phase 1.7, not pre-emptively.
