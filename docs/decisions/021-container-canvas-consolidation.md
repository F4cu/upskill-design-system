# ADR-021 — Consolidate container.default/page into container.canvas

**Date:** 2026-08-06
**Status:** `accepted`

## Context

`color.background.container` carried four values: `default` (→ `surface.1`), `page` (→ `surface.2`), `elevated` (→ `surface.3`), `inverted`. An audit found `default` was a false friend — no `Box` in the app or Storybook ever set `background="default"`; the only real consumer was `Card`'s resting-state variant. Everything that wanted "the page's own surface color" reached for `page`, but `Box`'s `background` prop never exposed `page` at all — it only offered `default | inverted | transparent | elevated`. The gap was papered over by a hand-rolled `.pageSurface` utility class in `utilities.module.css`, duplicating what `Box` should have done natively.

Separately, `page` as a prop value read ambiguously against `Box`'s structural `as="main"` prop — `background="page"` looks like it's describing a layout role (the page wrapper) when it's actually a color role (this surface matches the page's background). `background.neutral.*` (subtle/subtlest/hover) is a distinct, already-separate token family for alpha-tinted fills (Badge, Chip, ButtonArrow, ProgressBar), not part of this surface-level ramp — conflating the two was a source of confusion but not a structural problem.

## Decision

- Merge `container.default` and `container.page` into a single token, `container.canvas`, keeping `page`'s value (`surface.2` / `neutral.dark.2`) — the color already live everywhere via `reset.css` and `.pageSurface` — since `default` (`surface.1`/`#FEFDF9`) had no real caller.
- Expose it as `Box`'s `background="canvas"`, replacing the `.pageSurface` workaround. `Box`'s `background` union is now `canvas | elevated | inverted | transparent` — every value has exactly one job and no false friends.
- Name it `canvas`, not `page`, to keep the color axis (`background`) and the structural axis (`as="main"`) unambiguous in code.
- Card's default variant and every other `container-default`/`container-page` CSS reference now points at `container-canvas`.

## Consequences

- One fewer token in the surface ramp (4 → 3 named container levels, plus `transparent`), matching common-practice surface hierarchies (canvas → surface → elevated) rather than a wider, unused set.
- The contrast checker's "base canvas" composite target moved from the effectively-unrendered `surface.1` to the real `surface.2`, surfacing two genuine near-miss pairs (`text.selected`/`text.brand` on `neutral.subtlest`/`neutral.hover`, ~4.46–4.47:1 vs 4.5:1) that were never actually checked against their true rendering context before. Tracked as waivers, issue #96 — not a regression from this change, the check becoming accurate.
- Figma's variable is still named "Page" under Color > Background > Container; propagating the `canvas` rename there is a `/figma-variable-push` follow-up, not done as part of this change (code is the source of truth per ADR-002).
- `background.neutral.*` is unchanged — confirmed as intentionally separate from the container/surface ramp, not folded in.

## Amendment (2026-08-06)

`background.neutral.*` was renamed to `background.overlay.*` in a follow-up pass — "neutral" named a hue family, but these tokens (`subtle`/`subtlest`/`hover`, all alpha-transparent) are functionally overlay/scrim tints, not a resting surface color. Pure rename, no value changes; all CSS/metadata usages and the contrast-waivers ledger were updated to match. Doesn't affect the `container.canvas` decision above.
