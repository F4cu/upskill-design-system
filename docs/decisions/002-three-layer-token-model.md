# ADR-002 — Three-Layer Token Model

**Date:** 2026-06-11
**Amended:** 2026-06-17
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

## Amendment (2026-06-17) — Source of truth is the repo, not Figma

The original decision declared primitives "Figma-owned": `primitives.json` was to be replaced wholesale by Figma re-exports, never hand-edited, with all intentional value changes happening in Figma first. That direction is reversed. **The committed DTCG JSON in `packages/tokens/src/` is now the single source of truth; Figma is a downstream mirror and design-exploration surface.**

The three-layer model itself is unchanged — only which side is canonical, and the sync direction, change.

### Why

Automated Figma→code sync is impossible on the available Figma plan, so the original "Figma is upstream" model could never be automated and silently required a manual re-export on every token change — directly at odds with the lite-agentic, one-maintainer, CI-friendly goals.

- **Variables REST API** (`GET /v1/files/:key/variables/local`) — Enterprise org only.
- **Code Connect** — Organization/Enterprise only.
- **Token Studio GitHub sync** — available on lower tiers, but the free plan syncs a *single* file. This architecture is deliberately multi-file (primitives + `theme/light`+`dark` + `device/desktop`+`tablet`+`mobile`); collapsing it to fit the tool would invert the dependency the wrong way.

The only automatable sync direction available is code→Figma (push via the Figma plugin/MCP, interactively). Code-first is therefore not merely preferable — it is the only model that supports any automation, and it aligns with the governance layer (Airtable, PR review) which already treats committed files as canonical.

### Consequences of the reversal

- **Primitives are now code-owned and hand-editable.** `primitives.json` is authored and changed via PR, like the theme and device layers. The "never hand-edited / will be overwritten" warning on the Primitives row above no longer applies.
- **Figma changes are proposals, not the source.** A value invented in Figma is not "real" until it lands in `primitives.json` via PR. For a one-maintainer system this is a governance feature, not a limitation.
- **The Figma token audit (agentic moment 1) is retargeted from an import gate to a drift/reconciliation check** — "does Figma still match canonical code?" It still reads Figma variables via the Figma MCP (`get_variable_defs`), which works without the Enterprise REST API because it reads Dev Mode, not the REST endpoint.
- **`$extensions` stripping and sRGB→hex conversion still apply** to any values brought over from Figma during reconciliation — that cleanup guidance is unchanged.
