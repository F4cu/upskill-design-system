# ADR-002 — Three-Layer Token Model

**Date:** 2026-06-11
**Status:** `accepted`

## Context

A design token system needs to serve three distinct concerns simultaneously:

1. **Syncing with Figma** — raw values (hex colours, px sizes) exported from Figma variables must be stored somewhere without modification, so re-exports are a clean replacement.
2. **Supporting multiple colour modes** — light and dark mode require the same semantic token names to resolve to different underlying values. This cannot live in a single flat file.
3. **Adapting to breakpoints** — typography scales, spacing, and grid values differ per viewport. Desktop, tablet, and mobile are distinct enough to warrant separate token sets rather than one-size-fits-all values.

A single flat file satisfies none of these cleanly. A two-layer model (primitives + semantic) handles colour modes but conflates responsive layout decisions with colour semantics, and pollutes the primitives file with Figma-sync noise.

## Decision

Tokens resolve in three ordered layers. Later layers override earlier ones and may only reference tokens from earlier layers via `{path.to.token}` alias syntax — never raw values.

| Layer | Files | Responsibility |
|---|---|---|
| **Primitives** | `primitives.json` | Raw, context-free values. Single source of truth. Synced directly from Figma. Never hand-edited. |
| **Theme** | `theme/light.json`, `theme/dark.json` | Semantic colour aliases. Maps intent (`color.background.brand`) to a primitive (`{color.terracotta.9}`). Switching theme files switches the entire colour mode. |
| **Device** | `device/desktop.json`, `device/tablet.json`, `device/mobile.json` | Responsive spacing, grid, and typography per breakpoint. Breakpoints: desktop ≥ 1440 px, tablet ≥ 768 px, mobile < 768 px. |

Alias references use curly-brace syntax (`{color.brand.9}`) and resolve depth-first. The deepest available primitive path is always preferred (`{color.terracotta.9}` not `{color.terracotta}`).

Token format follows W3C DTCG: every token carries `$type` and `$value`. The `$extensions` block is stripped on Figma export — it must never be committed.

## Consequences

- **Primitives are Figma-owned.** Re-exporting from Figma replaces `primitives.json` entirely. Hand-edits to this file will be overwritten. All intentional value changes must happen in Figma first.
- **Theme files are code-owned.** The mapping from primitives to semantic names (`color.background.button.$root → color.brand.$root`) is a design decision made in code, not exported from Figma.
- **Device files are the responsive contract.** Components reference device-layer tokens for layout-sensitive values (font size, spacing, grid). The same component file works across breakpoints because the underlying custom property values change via media queries.
- **Style Dictionary must resolve all three layers** in order: primitives first, then theme, then device. Alias chains that cross layer boundaries (e.g. a device token aliasing a theme token aliasing a primitive) are valid and expected.
- **Style Dictionary CSS output strategy for device tokens:** `device/desktop.json` emits to `:root` (the desktop-first baseline at ≥ 1440 px). `device/tablet.json` and `device/mobile.json` emit inside `@media` blocks that override the same custom property names. The result is a single CSS file — no per-breakpoint imports required in components.

  ```css
  :root {
    --font-size-body-default: 16px;
    --space-stack-md: 16px;
  }
  @media (max-width: 1439px) {   /* tablet */
    :root { --font-size-body-default: 15px; --space-stack-md: 12px; }
  }
  @media (max-width: 767px) {    /* mobile */
    :root { --font-size-body-default: 14px; --space-stack-md: 8px; }
  }
  ```

  This requires a custom Style Dictionary platform config — the default CSS platform does not wrap outputs in media queries. See roadmap Phase 1.5.

- **Adding a new colour mode** (e.g. high-contrast) requires only a new `theme/` file — no changes to primitives or device layers.
- **Adding a new breakpoint** requires only a new `device/` file and a new media query block in the Style Dictionary config — no changes to primitives or theme layers.
