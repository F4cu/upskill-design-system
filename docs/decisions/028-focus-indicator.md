---
title: "ADR-028 — One focus indicator: a token-bound outline ring"
---
# ADR-028 — One focus indicator: a token-bound outline ring

**Date:** 2026-10-07
**Status:** `accepted`
**Amended:** 2026-11-13

## Context

No token defined a focus indicator (issue #119). Each component handled focus its own way:

- Only Select styled `:focus-visible`. It removed the outline and changed its border to `color.border.selected`.
- TextField removed the outline on its input and relied on the same border change on `:focus`.
- Button and every other interactive component showed the browser's default ring. That ring varies by browser, follows neither brand nor theme, and nobody had checked its contrast against the accent and danger fills or the dark-theme surfaces.

The Button pilot spec (ADR-027) recorded the gap in its `focus-visible` state.

Two treatments were considered:

1. **An outline ring on every focusable element**, with an offset so it sits on the surface around the control.
2. **A border-colour change**, extending Select's approach. Accent, danger and transparent buttons have no visible border to change, so they would need a second treatment anyway. A 1px colour change is also a weak indicator.

## Decision

Option 1.

- **One global rule** in `packages/components/src/styles/reset.css`:
  ```css
  :focus-visible {
    outline: var(--ds-size-focus-width) solid var(--ds-color-border-focus);
    outline-offset: var(--ds-size-focus-offset);
  }
  ```
  `:focus-visible` shows the ring for keyboard focus and not for mouse clicks on buttons. Browsers show it on text inputs either way.
- **Tokens:**
  - `color.border.focus`: `{color.brand.11}` in light, `{color.brand.dark.11}` in dark. It is the same step as `text.interactive.default`, so the ring reads as "interactive" in the brand's hue.
  - `size.focus.width` and `size.focus.offset`: both `{size.025}`, a new 2px primitive.
- **Why brand.11:** the ring sits on the surface around the control, not on its fill, because of the offset. Against canvas and elevated surfaces it measures 4.60–9.24:1 across both brands and both themes. The candidates that failed: `brand.9` (2.92:1 on Horizon dark) and the existing `border.selected` (3.33:1 on Upskill dark, close to the 3:1 floor).
- **Components never remove the outline.** Select and TextField no longer set `outline: none`. Their focus border change stays as an extra cue alongside the ring.
- **Contrast is gated.** `scripts/token-contrast-check.js` checks `border.focus` against canvas and elevated at 3:1 (WCAG 1.4.11).

**Exception: menu items.** DropdownMenu items keep `outline: none` and show focus with `background.overlay-hover`. This is the usual menu-item pattern in the WAI-ARIA APG, and a ring with an offset would overlap neighbouring items in the tight panel.

## Consequences

- Every focusable element in the library, the showcase and Storybook gets the same visible indicator, with no per-component CSS. A new component inherits it for free.
- The ring follows brand and theme through tokens, and CI checks its contrast.
- **Known limitation:** controls placed over media (CardVertical's Favorite and Menu) show the ring on top of the image, so its contrast depends on the pixels underneath. This is the same problem the on-media halo solves for the glyph (ADR-024). Revisit if keyboard testing on real photos shows the ring getting lost.
- The showcase's `PipelineDag` keeps its own `:focus-visible` rule (`border.selected`), which overrides the global one. Aligning it is optional.
- Figma: `color/border/focus` and the size variables need `/figma-variable-push`. Focus previews in component sets (a `State=Focus` variant) can then bind to them.

## Amendment 2026-11-13: a relocated ring for stretched-link cards

CardVertical and CardHorizontal gained an optional `href`: the `<a>` sits inside the title heading and its `::after` covers the card (a stretched link). The global ring would draw around one line of title text. These cards have no border, so that ring wouldn't tell a keyboard user that the whole card is the target.

An opacity change on the thumbnail alone was considered and rejected. A 0.8 fade is hard to see on dark photos and on the placeholder (WCAG 2.4.7), and it would drop the contrast gate.

**Decision:** a second exception, narrower than the menu-item one. The ring is **relocated**, not removed:

- The card's title link sets `outline: none` on `:focus-visible`.
- The card draws the same ring on its thumbnail with `:has(.titleLink:focus-visible)`: `size.focus.width` solid `color.border.focus`, offset `size.focus.offset`. The thumbnail also fades to 0.8 opacity, as on hover.
- The thumbnail is the card's one clear edge, and the ring sits on the surface around it, so the existing `border.focus` contrast pairs still apply. CardHorizontal's inverted variant adds `border.focus` on `background.container.inverted` to the gate.

The rule for every other component stays the same: never remove the ring. A relocated ring needs its own amendment here.


**Known limitation:** the relocated ring sits about `size.focus.width + size.focus.offset` outside the thumbnail, which is the card's outer edge. Containers that clip overflow (`.carousel-outer`, ScrollArea) cut off that side of the ring. The ring stays visible on its other sides. Reserving room in those containers is open.
