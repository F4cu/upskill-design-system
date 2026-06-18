# ADR-006 — Carousel as hook + pattern, not a DS component

**Date:** 2026-06-18
**Status:** `accepted`

## Context

The Homepage and Saved Courses sections require a horizontal carousel of `CardVertical` items paginated by `ButtonArrow`. The question was whether to ship a `Carousel` (or `CarouselContainer`) component or handle it differently.

Three approaches were considered:

1. **Full DS component** (`Carousel`) — owns layout, JS state, and markup. Similar to what Bootstrap and Ant Design ship.
2. **Hook + pattern** — a `useCarousel` hook encapsulates the offset state logic; layout and markup stay in the consuming page.
3. **Nothing** — document the pattern in a story; each developer writes their own state logic.

Prior art from major design systems:
- **Polaris, Atlassian, Radix, Chakra**: no carousel component. They provide primitives and document a composition pattern.
- **Carbon IBM.com, Ant Design, Bootstrap**: ship a `Carousel` component, but they are full product frameworks that accept the maintenance cost.
- **shadcn/ui**: ships `Carousel` by wrapping Embla Carousel — delegates interaction complexity to a tested external library.

A carousel component is heavier than it looks. Beyond offset state it requires: responsive visible-count, snap points, touch/swipe, keyboard navigation (arrow keys), and `aria-live` announcements. Owning all of that in a lite system is a maintenance liability without a clear forcing function.

## Decision

**`useCarousel` hook + layout pattern.** The hook (`packages/components/src/hooks/useCarousel.ts`) encapsulates only the shared logic that is error-prone to repeat: offset tracking, `canPrev`/`canNext` flags, `prev`/`next`/`reset` handlers. It is exported from the components package alongside the components.

Layout — the overflow clip container, the translate animation, the card widths — stays in the consuming code. The `Layout/Examples/Carousel` story is the canonical reference pattern.

Option 3 (nothing) was rejected because developers would inevitably diverge on the disabled-state logic and produce subtle off-by-one bugs (e.g. `offset >= maxOffset` vs `offset > maxOffset - 1`).

Option 1 (full component) was rejected because it would grow scope without a clear multi-page requirement, and it would force layout decisions (card width, visible count, snap behaviour) that vary per context.

## Consequences

- `useCarousel(itemCount, visibleCount)` is the one place where off-by-one errors and disabled-state logic are correct and tested. Developers import the hook; they own the layout.
- The `Layout/Examples/Carousel` story is the reference implementation. Divergence from it is intentional and visible in review.
- If the carousel pattern is used in 3+ distinct layouts with meaningfully different markup, or if accessibility requirements (keyboard nav, `aria-live`) are raised, this decision should be revisited and a `Carousel` component considered — at that point `useCarousel` becomes its internal hook rather than a throwaway.
- A `ScrollArea` primitive (see ADR-007 if created) would complement this pattern by standardising the overflow clip container, but is a separate concern.
