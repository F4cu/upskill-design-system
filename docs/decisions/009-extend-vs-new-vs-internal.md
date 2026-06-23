# ADR-009 — When to extend a component, create a new one, or absorb as a molecule-internal element

**Date:** 2026-06-23
**Status:** `accepted`

## Context

As the component set grows and new pages surface new UI patterns, the same visual shape recurs in different semantic roles. The risk is surface proliferation (a new component for every minor variant) or the opposite — stretching one component to cover cases that differ in meaning, not just appearance.

Three concrete cases that prompted this decision:

- **Ghost button + trailing icon (ShowMoreLink pattern):** text + trailing chevron, same link-colour action semantics as the existing ghost Button. Added as a `trailingIcon` prop on Button.
- **ButtonArrow vs accordion expand trigger:** both are 28–32px circular icon buttons, but ButtonArrow is a navigation control (prev/next, always bordered, has a disabled state) while the accordion trigger is a disclosure toggle (borderless at rest, hover fill only, up/down axis). Kept as separate things.
- **Accordion expand trigger:** the disclosure toggle only ever lives inside Accordion. No other component in the fixed set needs it. Implemented as a styled `<button>` inside `Accordion.module.css`.

## Decision

Use the following three-question test in order:

### 1. Same semantic role — extend the existing component

Add a prop or variant when the new use case shares the **same role, interaction model, and visual family** as an existing component and differs only in a containable presentational detail (icon position, icon choice, size step, colour token swap).

Signal: the new prop fits naturally in the existing component's JSDoc and metadata `variants` block without requiring a caveated "only use this when…" warning that contradicts another option.

*Example: `trailingIcon` on Button. The ghost variant already carries action semantics and link colour. Trailing icon placement is a presentational detail — same role, same grammar.*

### 2. Different semantic role — create a new component

Create a new component when the element has a **different role or interaction model** even if it looks visually similar to an existing one. Key signals:

- **Different chrome at rest:** a border or persistent background signals a distinct affordance. Removing it is not a style tweak — it changes what the user understands the element to be.
- **Different icon axis:** left/right implies navigation; up/down implies disclosure. These are not interchangeable without confusing the user.
- **Different states:** a navigation button has `disabled`; a disclosure toggle has `open/collapsed`. If the state model doesn't match, the components are different things.
- **Different ARIA role or keyboard contract:** a nav control uses `aria-label="Previous"`, a disclosure toggle uses `aria-expanded`. These cannot share a single component without a prop that rewires semantics — a smell that the abstraction is wrong.

*Example: ButtonArrow (nav, bordered, disabled state, left/right) vs accordion trigger (disclosure, borderless, open/collapsed, up/down). They share a circular shape but nothing else load-bearing.*

### 3. Single parent, not reused — absorb as a molecule-internal element

If the element only ever lives inside one parent molecule and no other component in the fixed set has a plausible need for it, implement it as a plain `<button>` or `<span>` styled inside the parent's CSS Module. Do not extract it into `src/components/`.

Signal: you cannot name a second consumer from the current fixed component set without inventing a hypothetical.

*Example: the accordion expand trigger. It is internal to Accordion in the same way `<summary>` is internal to `<details>`. Extracting it would create a component with exactly one consumer and no reuse benefit.*

### Summary table

| Situation | Action |
|---|---|
| Same role, same chrome, presentational difference only | Add prop or variant to existing component |
| Different role, different chrome or state model, similar shape | New component |
| One parent, no other consumer in the fixed set | Molecule-internal styled element |

## Consequences

- The fixed component set stays small. Visual similarity alone is not a reason to merge two components.
- Agents scaffolding new components should run this test before proposing a new file in `src/components/` — if the answer is "extend" or "internal", no new component is created.
- When a molecule-internal element later gains a second consumer, extract it then (YAGNI). The CSS Module is the right starting point; promotion to a component is a one-way door with a clear trigger.
- This rule applies to the fixed set only. It does not constrain consuming product code.
