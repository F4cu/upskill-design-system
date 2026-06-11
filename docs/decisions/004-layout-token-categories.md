# ADR-004 — Layout Token Categories: `space.*` vs `grid.*`

**Date:** 2026-06-11
**Status:** `accepted`

## Context

The device layer contains two token groups that both reference spacing primitives and both affect layout: `space.*` (inline, stack, inset) and `grid.*` (margin, gutter, columns, screen-size). As components are built, contributors need a clear rule for which group to reach for — using the wrong one couples things that should be independent.

A secondary question: the `grid.*` group also contains non-spacing tokens (`grid.columns`, `grid.screen-size`). It is worth recording why they share a namespace with spacing-shaped values.

## Decision

**`space.*` tokens answer: "how much space goes here inside a component?"**

- `space.inset.*` — padding inside a component (all four sides equal, or uniform squish/stretch variants in future)
- `space.stack.*` — vertical gap between sibling elements in a flow
- `space.inline.*` — horizontal gap between sibling elements in a row

These are consumed by components. Every component that needs padding, gap, or margin reaches for a `space.*` token. The three sub-groups follow the Nathan Curtis spacing model: inset = padding, stack = vertical margin/gap, inline = horizontal gap.

**`grid.*` tokens answer: "how is the page grid structured at this breakpoint?"**

- `grid.margin` — space between the viewport edge and the content area
- `grid.gutter` — space between grid columns
- `grid.columns` — number of columns (a structural parameter, not a spacing value)
- `grid.screen-size` — the breakpoint width this grid is designed for (reference only; breakpoints live in code, not CSS)

These are consumed by exactly one place: the `.container` grid utility class. No component should ever reference a `grid.*` token directly.

**Cross-use is forbidden even when values coincide.**

A component's padding might happen to equal the grid margin at a given breakpoint. It must still use `space.inset.*`, not `var(--ds-grid-margin)`. The token names encode intent. If the grid margin changes, component padding must not change with it, and vice versa.

## Consequences

- **Components are grid-agnostic.** A component built with `space.inset.lg` will not reflow if the page grid is restructured. The grid margin changing is a layout decision; the component's internal padding is a component decision.
- **`grid.*` tokens have exactly one consumer.** This makes them easy to audit: if anything other than the `.container` utility class references a `grid.*` custom property, it is a bug.
- **`grid.columns` and `grid.screen-size` are structural parameters, not spacing.** They share the `grid.*` namespace because they describe the grid system, not because they are spacing values. `grid.columns` drives `grid-template-columns: repeat(var(--ds-grid-columns), 1fr)`. `grid.screen-size` is a documentation value — it records the design intention for this breakpoint but is not used directly in CSS layout.
- **New spacing needs go into `space.*`, not `grid.*`.** If a new semantic spacing concept is needed (e.g. `space.squish` for asymmetric padding), it belongs in `space.*` regardless of whether its value matches a grid token.
