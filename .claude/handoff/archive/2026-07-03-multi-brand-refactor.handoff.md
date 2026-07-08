---
status: done
created: 2026-07-03
completed: 2026-07-06
---

**Re-verified 2026-07-08 (reorg pass):** all three phases are complete and merged
to `main` (commits `93d06d0`, `d4ef04f`, `831279a`, `2e8fa32`, `b219b0b`, `cf08fd9`
— see ROADMAP.md's Phase 2/3 checkboxes, both `[x]`). The reorg handoff's T1 triage
table called this `active`/"Phase 2 WIP", which was stale by the time this pass ran
— corrected here. The `multi-brand/phase-2` branch is fully merged (nothing in it
that main lacks) and can be deleted by the developer whenever convenient; not done
here since branch deletion wasn't asked for.

# Multi-Brand Refactor — Handoff

Self-contained execution handoff for turning this single-brand design system into a multi-brand one (shared core + per-brand identity layer). Written 2026-07-03 after a planning session that verified every mechanic below against the live repo and the installed Style Dictionary. Execute as **three sequential phases, one fresh Claude session each** — each phase section is self-contained and ends with hard verification gates. Do not start a phase until the previous one's gates pass.

**Settled decisions — do not relitigate:**
- Runtime brand switching via a `data-brand` attribute mirroring the existing `data-theme` pattern.
- Brands may vary **color ramp mappings, font families, border-radius**. Everything else stays shared.
- Second brand is fictional, built from **existing primitive hues** (no new ramps).
- In scope: token build, `tokens.css`, Storybook brand toolbar, contrast check, `tokens-check.yml`, ADR + CLAUDE.md. **Out of scope (explicitly deferred): Airtable sync/schema, Figma variable push/audit, `figma-variables.json` shape.**
- Commit directly to the current branch per repo git workflow (no branches unless the user asks). One commit per phase.

## Target architecture (four layers)

```
primitives.json                     → primitives.css               :root
brands/upskill.json  (NEW, Phase 1) → brand.upskill.css            :root, [data-brand="upskill"]
brands/horizon.json  (NEW, Phase 2) → brand.horizon.css            [data-brand="horizon"]
theme/light.json  (reshaped, shared)→ theme.light.css (var() refs) :root, [data-theme="light"]
theme/dark.json   (reshaped, shared)→ theme.dark.css  (var() refs) [data-theme="dark"]
device/*.json                       → unchanged
```

The brand layer owns four color ramp slots (`brand`, `accent`, `neutral`, and a new `surface` slot for page/container tints), `font.family.*`, and `border-radius.*` (as **literal** values — a `{border-radius.sm}` alias at path `border-radius.sm` is a circular self-reference). Theme files become brand-agnostic shared semantics referencing brand slots or functional primitives, emitted as `var()` chains so one `theme.<mode>.css` serves every brand.

## Verified facts (do not re-derive; trust these)

1. **Style Dictionary is v5.4.4.** Build config is `packages/tokens/build.js` — CLAUDE.md's `style-dictionary.config.js` reference is stale (Phase 3 fixes it). The programmatic API in use is intact in v5.
2. **The core mechanic is live-tested:** `source: theme/<mode>.json` + `include: [primitives, brand file]` + `outputReferences: true` + a filePath filter emits all 102 theme tokens as per-hop `var(--ds-…)` chains (including font-family), never resolved hex.
3. **`log: { warnings: 'error' }` throws on that combo** ("filtered out token references" is a warning by design in SD v5). Brand/theme SD instances must run `warnings: 'warn'`; two post-build gates (Phase 1 §3) compensate.
4. **Hues with full light+dark ramps:** terracotta, gold, teal, sand, grey, amber. `cyan` has NO dark ramp — never map a brand slot to it.
5. Var naming: `--ds-` prefix, kebab-joined path. `color.brand.9` → `--ds-color-brand-9`; `font.family.body` → `--ds-font-family-body`; primitive `font.font-family.Roboto` → `--ds-font-font-family-roboto`. Alpha primitives are `rgba()`, solid are `#hex`.
6. `scripts/token-usage.js` and `scripts/sense.js` are directory-driven and need no changes. `scripts/token-diff.js` handles unknown files. Existing contrast waivers: exactly 2, both light-theme.
7. `@storybook/addon-themes` supports only ONE `withThemeByDataAttribute` instance — brand switching must be a custom `globalTypes` toolbar + decorator (Phase 2).

## Global risks to guard in every phase

- **Silent default-brand leak:** any theme ref SD fails to preserve gets upskill's value inlined into shared CSS, so every other brand silently renders upskill's color. The no-inlined gate is the permanent guard.
- **Cascade is source-order-dependent** at equal (0,1,0) specificity (`:root` vs `[data-brand=…]`). The `tokens.css` import order is a documented contract.
- **A missing brand token fails invisibly at runtime** (invalid custom property → inherit/initial, no console error). The shape gate is the guard.
- **Brands swap hues, not steps.** Semantic step choices are shared; a brand that fails contrast at a step needs a different hue mapping or a waiver with an issue — never a per-brand semantic override.

---

# Phase 1 — Brand layer extraction (single brand, zero visual change)

Files touched: `packages/tokens/src/brands/upskill.json` (new), `packages/tokens/src/theme/{light,dark}.json`, `packages/tokens/build.js`, `packages/tokens/package.json`, `packages/components/src/styles/tokens.css`, `scripts/token-contrast-check.js`, `scripts/token-contrast-waivers.json`, `.github/workflows/tokens-check.yml`.

## 1.0 Pre-flight (do first)

```
npm run tokens:build
cp -r packages/tokens/dist <SCRATCH>/base-dist   # <SCRATCH> = your session scratchpad dir
```
Keep `base-dist` untouched — the equivalence gate diffs against it. **Equivalence contract for this phase:** every built `--ds-*` custom property, resolved through the new var() chains, must equal its old built value exactly. Zero visual change.

## 1.1 Create `packages/tokens/src/brands/upskill.json`

Strict JSON, no trailing commas, no comments. Four color slots + fonts + radii:

- **`color.brand`** — `1`–`12` = `{color.terracotta.N}`, `dark.1`–`dark.12` = `{color.terracotta.dark.N}`, `default` = `{color.brand.9}`.
- **`color.accent`** — same pattern on `teal`, `default` = `{color.accent.9}`.
- **`color.neutral`** — same pattern on `sand`. No `default` (none exists today).
- **`color.surface`** (NEW slot) — `1`–`12` = `{color.gold.N}`, `dark.1`–`dark.12` = `{color.gold.dark.N}`. Dark theme won't reference surface (dark surfaces route via `neutral.dark`), but include the dark ramp so the shape gate holds and future brands can use it.
- All color entries `{"$type":"color","$value":"{...}"}`.
- **`font.family`** — copy verbatim from the theme files (identical in light and dark): `headline-default` = `{font.font-family.Roboto}`, `headline-serif` = `{font.font-family.Playfair Display}`, `body` = `{font.font-family.Roboto}`, `$type: "string"`.
- **`border-radius`** — LITERAL numbers copied from `primitives.json` (never aliases — circular): `"null"`=0, `xs`=4, `sm`=8, `md`=16, `lg`=24, `full`=50, each `{"$type":"number","$value":N}`. Duplicating the primitive values in the default brand *is* the override mechanism (brand CSS loads after primitives.css; later source wins at equal specificity).

## 1.2 Reshape `theme/light.json` and `theme/dark.json`

Delete from BOTH: the entire `color.brand`, `color.accent`, `color.neutral` ramp blocks and the `font.family` block. (Neither file has a `border-radius` block; keep the `clean-theme` parser as a defensive no-op.)

Re-point semantics per the exact tables below (LHS = token path under `color.`, RHS = new `$value`). **Anything not listed keeps its current `$value`** — feedback/award/alpha/black/white stay direct-primitive by design (`award.copper` and `feedback.error` keep `{color.terracotta.*}` on purpose: functional red, not brand).

### LIGHT — change only these (existing `{color.brand/accent/neutral.N}` refs already resolve correctly):

```
background.container.page       {color.gold.2}        -> {color.surface.2}
background.container.elevated   {color.gold.3}        -> {color.surface.3}
background.container.default    {color.gold.1}        -> {color.surface.1}
background.container.inverted   {color.sand.dark.2}   -> {color.neutral.dark.2}
background.button.ghost         {color.gold.1}        -> {color.surface.1}
background.button.outline.hover {color.gold.2}        -> {color.surface.2}
background.button.elevated      {color.gold.3}        -> {color.surface.3}
background.button.inverted      {color.sand.dark.2}   -> {color.neutral.dark.2}
background.button.default       {color.terracotta.11} -> {color.brand.11}
background.button.hover         {color.terracotta.12} -> {color.brand.12}
text.inverted.default           {color.sand.2}        -> {color.neutral.2}
text.accent.inverted            {color.teal.dark.11}  -> {color.accent.dark.11}
icon.brand                      {color.terracotta.9}  -> {color.brand.9}
```

### DARK — every extracted-ramp ref gains `.dark`, EXCEPT three deliberate light-carry-overs:

```
background.brand                {color.brand.9}       -> {color.brand.dark.9}
background.input                {color.neutral.3}     -> {color.neutral.dark.3}
background.button.default       {color.terracotta.11} -> {color.brand.11}      # light ramp on purpose
background.button.hover         {color.terracotta.12} -> {color.brand.12}      # light ramp on purpose
background.button.disabled      {color.neutral.8}     -> {color.neutral.dark.8}
background.container.page       {color.sand.dark.2}   -> {color.neutral.dark.2}
background.container.elevated   {color.sand.dark.2}   -> {color.neutral.dark.2}
background.container.inverted   {color.sand.dark.1}   -> {color.neutral.dark.1}
background.container.default    {color.sand.dark.1}   -> {color.neutral.dark.1}
background.button.ghost         {color.sand.dark.1}   -> {color.neutral.dark.1}
background.button.outline.hover {color.sand.dark.2}   -> {color.neutral.dark.2}
background.button.elevated      {color.sand.dark.2}   -> {color.neutral.dark.2}
background.button.inverted      {color.sand.dark.1}   -> {color.neutral.dark.1}
text.default                    {color.neutral.12}    -> {color.neutral.dark.12}
text.subtle                     {color.neutral.11}    -> {color.neutral.dark.11}
text.brand                      {color.brand.11}      -> {color.brand.dark.11}
text.selected                   {color.brand.11}      -> {color.brand.dark.11}
text.accent.default             {color.accent.11}     -> {color.accent.dark.11}
text.accent.inverted            {color.teal.dark.11}  -> {color.accent.dark.11}
text.interactive.default        {color.brand.11}      -> {color.brand.dark.11}
text.interactive.hover          {color.brand.12}      -> {color.brand.dark.12}
text.inverted.default           {color.sand.2}        -> {color.neutral.2}     # light ramp on purpose
text.inverted.subtle            {color.neutral.11}    -> {color.neutral.dark.11}
text.inverted.disabled          {color.neutral.5}     -> {color.neutral.dark.5}
text.disabled                   {color.neutral.8}     -> {color.neutral.dark.8}
border.input.default            {color.neutral.9}     -> {color.neutral.dark.9}
border.input.hover              {color.neutral.10}    -> {color.neutral.dark.10}
border.disabled                 {color.neutral.8}     -> {color.neutral.dark.8}
border.selected                 {color.brand.9}       -> {color.brand.dark.9}
border.brand                    {color.brand.default} -> {color.brand.dark.9}  # no dark.default slot exists
border.accent                   {color.accent.default}-> {color.accent.dark.9}
icon.subtle                     {color.neutral.10}    -> {color.neutral.dark.10}
icon.disabled                   {color.neutral.7}     -> {color.neutral.dark.7}
icon.strong                     {color.neutral.12}    -> {color.neutral.dark.12}
icon.inverted.disabled          {color.neutral.5}     -> {color.neutral.dark.5}
icon.brand                      {color.terracotta.dark.9} -> {color.brand.dark.9}
icon.default                    {color.neutral.11}    -> {color.neutral.dark.11}
```

DARK unchanged (stay direct-primitive): all `background.feedback.*`, `background.award.*`, `text.feedback.*`, `border.feedback.*`, `icon.feedback.*`, `background.neutral.*` (white alphas), `border.subtle/strong/inverted` (white alphas), `background.transparent`, `icon.inverted.default` = `{color.white.1}`.

BOTH themes: `border.default` = `{color.border.subtle}` stays — a theme-internal alias that becomes `var(--ds-color-border-subtle)` defined in the same theme file. **The no-dangling gate must allow same-file definitions or this false-fails.**

## 1.3 Restructure `packages/tokens/build.js`

Keep parsers, transforms, transform groups, formats, primitives build, device builds, JS build, and the device-combine tail **unchanged**. Replace only the light/dark theme instances and add the brand loop + gates:

```js
import { readdirSync } from 'fs'
const DEFAULT_BRAND = 'upskill'
const BRANDS = readdirSync('src/brands')
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', ''))

const brandShared = { usesDtcg: true, log: { warnings: 'warn', verbosity: 'default' } }

const brandBuilds = BRANDS.map(brand => new StyleDictionary({
  ...brandShared,
  include: ['src/primitives.json'],
  source: [`src/brands/${brand}.json`],
  platforms: { css: {
    transformGroup: 'upskill/css', prefix: 'ds', buildPath: 'dist/css/',
    files: [{
      destination: `brand.${brand}.css`,
      format: 'css/variables',
      filter: (t) => t.filePath.includes(`brands/${brand}.json`),
      options: {
        selector: brand === DEFAULT_BRAND
          ? `:root, [data-brand="${brand}"]`
          : `[data-brand="${brand}"]`,
        outputReferences: true,
      },
    }],
  }},
}))

const themeConfigs = { light: ':root, [data-theme="light"]', dark: '[data-theme="dark"]' }
const themeBuilds = Object.entries(themeConfigs).map(([mode, selector]) =>
  new StyleDictionary({
    ...brandShared,
    parsers: ['upskill/clean-theme'],
    include: ['src/primitives.json', `src/brands/${DEFAULT_BRAND}.json`],
    source: [`src/theme/${mode}.json`],
    platforms: { css: {
      transformGroup: 'upskill/css', prefix: 'ds', buildPath: 'dist/css/',
      files: [{
        destination: `theme.${mode}.css`,
        format: 'css/variables',
        filter: (t) => t.filePath.includes(`theme/${mode}.json`),
        options: { selector, outputReferences: true },
      }],
    }},
  })
)
```

Run order: primitives → brandBuilds → themeBuilds → deviceBuilds → device-combine. `warnings: 'warn'` applies ONLY to brand + theme instances; primitives/device/JS keep the original `shared` with `warnings: 'error'`.

**Post-build gates** (before the final console.log; throw on failure, print a one-line pass each):

- **(a) Shape gate** — flatten leaf `$value` paths of each `src/brands/*.json`; every brand's path-set must deep-equal the default brand's. (Trivially passes with one brand; guards Phase 2 and beyond.)
- **(b) No-inlined / no-dangling gate** — parse `--name: value;` from built `primitives.css`, each `brand.<b>.css`, and both theme CSS files:
  - *No-inlined:* every value in the theme files must match `/^var\(--ds-[\w-]+\)(\s*,.*)?$/`. A raw `#hex`/`rgba(` = SD inlined the default brand → FAIL.
  - *No-dangling:* every `var(--ds-…)` name referenced in theme/brand CSS must be defined by its allowed set — for a theme ref: `primitives ∪ (∩ of all brand defs) ∪ that theme file's own defs` (self-file clause REQUIRED, see §1.2); for a brand ref: `primitives ∪ that brand file's own defs`.

## 1.4 `packages/tokens/package.json`

Add to `exports` after `./css/primitives`, matching existing style:
```
"./css/brand.upskill": "./dist/css/brand.upskill.css",
```

## 1.5 `packages/components/src/styles/tokens.css`

```css
/* @import must precede all other rules. Order is load-bearing:
   primitives → brand (radius/font override at equal specificity, later source wins)
   → device → theme.light → theme.dark (last so [data-theme="dark"] wins). */
@import '@upskill/tokens/css/primitives';
@import '@upskill/tokens/css/brand.upskill';
@import '@upskill/tokens/css/device';
@import '@upskill/tokens/css/theme.light';
@import '@upskill/tokens/css/theme.dark';
```

## 1.6 `scripts/token-contrast-check.js` (layered resolver)

Keep `PAIRS`, `AMBIENT`, `roleOf`/`threshold`/`toDotPath`/`parseColor`/`compositeOver`/`relativeLuminance`/`contrastRatio` intact. Change only plumbing:
- `parseThemeCss` → generic `parseCss(file)` returning `{--name: value}`; broaden the var regex from `--ds-color-` to `--ds-[\w-]+` so chains resolve.
- Discover brands from `dist/css/brand.*.css` filenames.
- Per `(brand, mode)` combo: layered map = `{...primitives, ...brand, ...theme}` (theme wins).
- Add `resolve(name, map, seen = new Set())`: recurse through `var(--x)` values (strip any `, fallback`), cycle-guard via `seen` (throw on repeat), throw on undefined name. This doubles as a runtime dangling-ref check for exactly the vars components render.
- In `evaluateTheme`, resolve fg/bg via `resolve()` before `parseColor`; `baseCanvas` = resolved `--ds-color-background-container-default`.
- Loop brands × `['light','dark']`; waiver key → `${brand}|${theme}|${fg}|${bg}`; update `waiverMap`, stale-waiver check, and log lines; header `Brand: <b> · Theme: <mode>`.

## 1.7 `scripts/token-contrast-waivers.json`

Add `"brand": "upskill"` to BOTH existing entries (keep theme/foreground/background/reason/issue).

## 1.8 `.github/workflows/tokens-check.yml`

Add `packages/tokens/dist/css/brand.upskill.css` to the "Verify output files exist" list.

## Phase 1 verification gates (iterate until ALL pass)

1. `npm run tokens:build` succeeds and prints both gate pass lines.
2. `grep -E ':\s*#' packages/tokens/dist/css/theme.light.css packages/tokens/dist/css/theme.dark.css` → empty.
3. **Equivalence script** (throwaway in scratchpad): per mode, resolve every `--ds-*` fully from NEW `primitives.css + brand.upskill.css + theme.<mode>.css`; OLD map = flat vars from `base-dist/primitives.css + base-dist/theme.<mode>.css`. Old theme CSS contained the flattened brand-ramp vars (`--ds-color-brand-9` etc.) that now live in `brand.upskill.css` — compare the **union** of names. Diff resolved-new vs old on the intersection: must be **empty** for both modes; also assert no old `--ds-color-*`/`--ds-font-family-*` name is missing from the new union.
4. `npm run tokens:contrast-check` — passes with exactly the same 2 waived pairs (now `upskill|light|…`), no new failures, no stale waivers.
5. Root `npm run typecheck && npm run build` — components still build.
6. Sanity: `npm run sense` and the token-usage script run clean (no changes expected — directory-driven).

Do NOT touch in this phase: Storybook, second brand, docs/ADRs, JS build, device build, transforms.

---

# Phase 2 — Second brand + Storybook toolbar

> **STATUS (2026-07-03): implemented on branch `multi-brand/phase-2`, PAUSED on the contrast-triage decision (§2.4).** Everything in §2.1–2.3 is done and committed on that branch; gates 1 and 3 pass (shape gate green for both brands, typecheck + build green). Gate 2 is blocked: **teal as horizon's brand hue fails 15 contrast pairs** — teal.11 text at 4.33–4.45:1 (needs 4.5) on grey.1/grey.2 surfaces, teal.9 borders/backgrounds at 2.70–2.99:1 (needs 3.0), white-on-teal buttons at 2.92:1. Alternative brand hues were tested by remapping only `color.brand` (accent/neutral/surface unchanged): **gold, grey, and sand each fail exactly 1 borderline pair** (`border.selected` on `background.input`, ~2.91–2.93 vs 3.0 — same shape as the existing #21 waivers); **amber fails badly** (1.50:1 white-on-amber) and clashes with the accent. The user is testing hues in Figma before deciding (keep teal + waive 15, or swap the brand hue). Once decided: edit `color.brand` refs in `brands/horizon.json`, rebuild, re-run contrast check, waive any remaining pair with a GitHub issue, then run gate 4 (Storybook visual check) and commit. Upskill combos are unaffected (identical to Phase 1, existing 2 waivers intact). Gate 4 has not been run.

Files touched: `packages/tokens/src/brands/horizon.json` (new), `packages/tokens/package.json` (export), `packages/components/src/styles/tokens.css` (import), `packages/components/.storybook/preview.ts`, `.github/workflows/tokens-check.yml`, `scripts/token-contrast-waivers.json` (only if triage requires, each with an issue).

## 2.1 `brands/horizon.json`

Same shape as `upskill.json` — the Phase 1 shape gate enforces this. Mapping (name/palette swappable, but only hues with full dark ramps: terracotta, gold, teal, sand, grey, amber):
- brand → **teal**, accent → **amber**, neutral → **grey**, surface → **grey** (all decided by the user — do not change without asking)
- Note: amber also serves as the functional warning feedback color (feedback tokens stay brand-agnostic), so during the Phase 2 Storybook check, eyeball that accent elements and warning states remain distinguishable under horizon.
- `font.family.headline-default` → `{font.font-family.Playfair Display}` (promoted), `headline-serif` → Playfair Display, `body` → Roboto
- Sharper radii: `"null"`=0, `xs`=2, `sm`=4, `md`=8, `lg`=12, `full`=50

## 2.2 Wiring

- `package.json` exports: add `"./css/brand.horizon": "./dist/css/brand.horizon.css"`.
- `tokens.css`: add `@import '@upskill/tokens/css/brand.horizon';` AFTER `brand.upskill` (non-default brands after the default — its `:root` part always matches, so later non-default source must win under `[data-brand]`).
- `tokens-check.yml`: add `brand.horizon.css` to the files-exist list.

## 2.3 Storybook `.storybook/preview.ts`

Keep the existing `withThemeByDataAttribute` decorator unchanged (the addon supports only one instance). Add:

```ts
globalTypes: {
  brand: {
    description: 'Brand',
    toolbar: { title: 'Brand', icon: 'paintbrush', items: ['upskill', 'horizon'], dynamicTitle: true },
  },
},
initialGlobals: { brand: 'upskill' },
// decorator alongside the theme one:
(Story, context) => {
  document.documentElement.setAttribute('data-brand', context.globals.brand)
  return Story()
}
```

## 2.4 Contrast triage

teal/amber/grey have never been through the contrast gate — expect failures on horizon combos. Triage order: adjust horizon's hue *mapping* (brands swap hues, not steps); if a hue genuinely fails at a shared semantic's step, waive with an issue (same protocol as existing waivers). Never add per-brand semantic overrides to the theme files.

## Phase 2 verification gates

1. `npm run tokens:build` — shape gate passes for both brands.
2. `npm run tokens:contrast-check` — reports 4 combos (upskill/horizon × light/dark); upskill combos identical to Phase 1; horizon failures triaged or waived with issues.
3. Root `npm run typecheck && npm run build`.
4. `/run-storybook`: Button, Card, TextField under all four brand×theme toolbar combos — horizon shows teal buttons, grey surfaces, Playfair headlines, sharper radii; upskill is pixel-identical to before.

---

# Phase 3 — Docs

## 3.1 New ADR `docs/decisions/012-brand-layer-multi-brand.md`

New ADR, not an ADR-002 amendment (layer count changes 3→4). Follow `000-template.md`. Record:
- The four-layer model, resolution order, and the `data-brand` × `data-theme` cascade contract (import-order dependence at equal specificity).
- The `color.surface` slot discovery (page/container tints were gold — neither brand, accent, nor neutral).
- Feedback/award/alpha tokens staying brand-agnostic by design.
- The radius-literal rule (self-reference circularity).
- `outputReferences` + `include` mechanics; the `warnings:'warn'` downgrade on brand/theme instances and the two compensating build gates.
- `background.button.default/hover` intentionally using the light ramp in dark mode (pre-existing carry-over, revisit separately).
- "Brands swap hues, not steps" contrast rule; cyan-lacks-dark-ramp constraint for future brands.
- **Deferred section:** Airtable schema needs a brand dimension before sync resumes (light/dark value columns + `flattenSemantic` are two-theme-shaped); Figma-side branding would map to a brand collection with per-brand modes; `token-deprecation-pass` keys may need brand-qualifying.

Add a one-line pointer amendment at the bottom of ADR-002: brand layer now sits between primitives and theme, see ADR-012.

## 3.2 CLAUDE.md updates

- "Token architecture → Three-layer model" → four layers; add Brand row (`brands/*.json` — brand/accent/neutral/surface ramp mappings, font families, radii); re-scope Theme row to "brand-agnostic semantics referencing brand slots or functional primitives".
- "Primitive color scales": note the brand-slot mapping and that cyan lacks a dark ramp.
- "Style Dictionary build": brand loop, `brand.*.css` outputs, the two post-build gates, `data-brand` attribute; **fix the stale `style-dictionary.config.js` reference → `packages/tokens/build.js`**.
- "Storybook": brand toolbar.
- "Common tasks": add row — *Add a brand:* copy a `brands/*.json`, edit mappings (full-dark-ramp hues only), add package export + `tokens-check.yml` file check + Storybook toolbar item, run build + contrast check.
- "Figma sync": one line noting the brand layer is not yet mirrored to Figma (see ADR-012 Deferred).

## Phase 3 verification gates

1. `grep -ri 'three-layer' CLAUDE.md docs/` finds only historical/ADR-002 text.
2. CLAUDE.md references ADR-012; `npm run tokens:build` still green (no code touched).
