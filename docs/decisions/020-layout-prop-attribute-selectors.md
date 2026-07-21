# ADR-020 — Enum layout props render as data-attributes, not inline CSS custom properties

**Date:** 2026-07-21
**Status:** accepted

## Context

`Stack`, `Inline`, `Box`, and `Card` translated their enum-valued layout props (`gap`, `align`, `justify`, `padding`/`paddingX`/`paddingY`) into private CSS custom properties written through the `style` attribute — e.g. `style="--_gap: var(--ds-space-inline-lg); --_align: flex-start;"`, consumed by the CSS Module as `gap: var(--_gap, 0)`. The developer noticed this in the browser DOM (via `Homepage.tsx`'s `<Inline wrap align="start" gap="lg">`) and asked whether it was good practice.

The values themselves were never a violation — always `var(--ds-*)` token references from a fixed enum, never raw pixels, so the CSS Modules rule ("only reference SD-output custom properties, never raw values") held. But the technique put a per-instance `style` attribute on every layout primitive in the DOM, purely to select between a small closed set of token values — something CSS can do natively with attribute selectors, without any runtime string building.

`grow`/`minWidth`/`maxWidth`/`minHeight`/`maxHeight` (`Box`, `Stack`) are a different case: those are continuous, per-instance values (not a pick from an enum), and ADR-011 already sanctions raw inline styles for that layout-primitive concern specifically. This decision does not touch them.

## Decision

Enum-valued layout/spacing props are set as `data-*` attributes on the element (`data-gap="lg"`, `data-align="start"`, `data-justify="space-between"`, `data-px="md"`, `data-py="md"`, `data-padding="lg"`), and the CSS Module owns the mapping to token values via attribute selectors:

```css
.stack[data-gap="lg"] { gap: var(--ds-space-stack-lg); }
.stack[data-align="start"] { align-items: flex-start; }
```

This replaces the `--_gap`/`--_align`/`--_justify`/`--_box-px`/`--_box-py`/`--_card-inset` custom-property-via-`style` pattern in `Stack`, `Inline`, `Box`, and `Card`. It also deletes the JS `alignMap`/`justifyMap` objects in `Stack`/`Inline` — the friendly-name-to-CSS-value mapping now lives once, in CSS, instead of once in CSS (fallback values) and once in JS (the maps).

Continuous values (`grow`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `overflow`) stay as raw inline `style` per ADR-011 — they are not enums and have no fixed set of CSS rules to attribute-select against.

**Going forward:** any new component prop with a small, closed set of string options that maps to a CSS Module rule should default to this `data-*` + attribute-selector pattern, not a `--_` custom property threaded through `style`.

## Consequences

- No `style` attribute appears on `Stack`/`Inline`/`Box`/`Card` instances unless the consumer passes their own `style` prop or a continuous-value prop (`grow`, `minWidth`, etc.) — cleaner DOM, easier Storybook/devtools inspection, no inline-style CSP friction.
- The full gap/align/justify/padding enum is enumerated once in each CSS Module (six `data-gap` rules, five `data-align` rules, etc.) rather than computed at render time — slightly more CSS module lines, zero runtime cost, and the enum is self-documenting from the stylesheet alone.
- Verified with `npm run typecheck`, `npm run build`, `npm run metadata:validate`, `npm run a11y:coverage`, `npm run a11y:test`, and `npm run screenshot:check` (54/54 shots at 0.000% diff — the change is purely markup/CSS-selector, not visual) — all clean, plus a manual Storybook DOM inspection and a Homepage screenshot on the showcase app to confirm the real-world two-panel layout is unaffected.
- Deliberately did not touch `ProgressBar`, `Avatar`, `Image`, `Button`, `Icon` (also `--_`-var users) — those custom properties carry continuous or component-specific computed values (e.g. `ProgressBar`'s percentage), not picks from a small closed enum, so the same rationale doesn't apply. If a future review finds one of them is actually enum-shaped, convert it under this same ADR rather than opening a new one.
