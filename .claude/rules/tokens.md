---
paths:
  - packages/tokens/**
---

# Token rules

Loaded only when working under `packages/tokens/`. The four-layer model, source-of-truth rule, and Figma sync policy stay in CLAUDE.md; the authoring procedure is `/tokens-author`.

## Token format (W3C DTCG)

Every token uses `$type` and `$value`. Aliases use curly-brace syntax. No `$extensions` — strip them on export.

```json
{ "$type": "color", "$value": "#D15D50" }          // concrete value
{ "$type": "color", "$value": "{color.terracotta.9}" }  // alias
```

## Token JSON conventions

- Keys use `kebab-case` for multi-word names (`border-radius`, `font-size`, `line-height`)
- Numeric scale steps use plain numbers as string keys (`"1"` through `"12"`, `"100"` through `"800"`)
- No trailing commas (strict JSON)
- Aliases always prefer the deepest available primitive path (`{color.terracotta.9}` not `{color.terracotta}`)

## Primitive color scales

Each hue has three sub-scales. Don't mix scales on the same token:
- `1–12` — light-mode scale (backgrounds → text)
- `dark-1` through `dark-12` — dark-mode scale
- `alpha-1` through `alpha-12` — transparent variants of the mid-tone

Current hues: `terracotta`, `cyan`, `gold`, `teal`, `sand`, `grey`, `black`, `white`, `amber`, `red`. A brand's `color.brand`/`accent`/`neutral`/`surface` slots each alias one of these hues — e.g. `upskill` maps `brand → terracotta`, `surface → gold`; `horizon` maps `brand → cyan`, `neutral`/`surface → grey`. Only hues with a full light + dark ramp are eligible for a brand slot (ramp-regeneration history: ADR-014).

## Line-height convention

Line-heights are **unitless ratios** (`1`, `1.25`, `1.4`, `1.5`, `1.75`). Never use fixed px values — the ratio adapts to any font size automatically. Figma cannot store unitless variables, so these are entered there as fixed values and are an accepted code↔Figma divergence, not drift (see CLAUDE.md → Figma sync).

## Style Dictionary build detail

Config and custom transforms (px→rem, font-weight string→numeric, `$root` rename, media-query combiner) live in `packages/tokens/build.js`. Dimensions build in `rem`; desktop device tokens in `:root`, tablet/mobile in `@media` blocks.

Each `brands/<brand>.json` builds to its own `brand.<brand>.css` (`data-brand` selector; the default brand also matches `:root`). Theme files build with `outputReferences: true` against `include: [primitives, default-brand]`, so every theme token emits as a `var()` chain rather than a resolved value — one `theme.<mode>.css` serves every brand. Because that `include` + filter combination triggers Style Dictionary's "filtered out token references" warning by design, brand and theme build instances run with `warnings: 'warn'` (primitives/device/JS instances keep `warnings: 'error'`); two post-build gates compensate — a **shape gate** (every brand's flattened token-path set must match the default brand's) and a **no-inlined/no-dangling gate** (theme CSS must contain only resolvable `var()` references, never a leaked default-brand value). See ADR-012.

Contrast gate: `npm run tokens:contrast-check` runs on every PR touching token source (`tokens-check.yml`); tracked failures live in `scripts/token-contrast-waivers.json`, a shrinking ledger — never silently drop or force a failure through a token change.

## Figma reconciliation cleanup

When reconciling values brought over from Figma:
- Strip `$extensions` blocks entirely
- Convert Figma sRGB component objects → hex strings
- Preserve alias references in `{path.to.token}` format

Never overwrite primitives without running `/figma-variable-audit` first.

## Adding a brand

Copy an existing `brands/*.json`, remap its `brand`/`accent`/`neutral`/`surface` slots to hues with a full light+dark ramp, set `font.family.*` and literal `border-radius.*`. Add the package export, a `tokens-check.yml` file-existence entry, and a Storybook toolbar item. Run `npm run tokens:build && npm run tokens:contrast-check` — waive any shared-step failure with a tracked issue, never a per-brand theme override (ADR-012).
