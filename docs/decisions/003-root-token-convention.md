# ADR-003 — `$root` as the Default Token Convention

**Date:** 2026-06-11
**Superseded:** 2026-06-14
**Status:** `superseded`

## Supersession note

The semantic token naming audit (2026-06-14) reversed this decision. Research confirmed that the W3C DTCG community and tooling ecosystem (Tokens Studio, Style Dictionary) converge on **`.default`** as the group-default convention — not `$root`. The `$root` → `root` CSS transform required a custom preprocessor to work around Style Dictionary's `$`-prefix handling, produced meaningless `-root` suffixes in CSS output, and was non-standard in Figma. All `$root` keys have been renamed to `default` in source JSON, the custom preprocessor removed from `build.js`, and Figma variables updated in place. The cleanup items documented below were completed as part of that audit.

## Context

Several token groups need a "default" value — the most common choice within the group, the one you reach for when no modifier is needed. Two ad-hoc conventions appeared in `theme/light.json`:

- **`$root`** — e.g. `color.brand.$root`, `color.text.$root`, `color.background.container.$root`
- **`.default`** — e.g. `color.text.default`, `color.background.button.default`

In some cases both exist in the same group (`color.text` has both `default` and `$root`, where `$root` aliases to `default`). In others, `default` was used as a variant name with a distinct semantic meaning (not "default of the group" but "background for the default/ghost button state"), sitting alongside `$root` in the same group.

Two options were considered:

| Option | Example path | CSS output | Notes |
|---|---|---|---|
| **`$root`** | `color.brand.$root` | needs transform | W3C DTCG reserved name, Figma exports this natively |
| **`.default`** | `color.brand.default` | `--color-brand-default` | Human-readable but verbose in CSS; `.default` is a valid token name not a spec keyword |

## Decision

**Use `$root` as the sole convention for group default tokens.** Remove `.default` as a synonym. Where `.default` currently appears as a variant name with a distinct meaning (not "default of the group"), rename it to a more specific key that describes the actual intent.

`$root` is the W3C DTCG 2025.10 stable spec's reserved name for this purpose. It cannot conflict with user-defined token names because the spec forbids `$`-prefixed user keys. Figma exports it natively. Using `.default` alongside `$root` creates two aliases to the same value and ambiguity when `default` also exists as a meaningful variant name.

**Style Dictionary handling:** A custom name transform will strip `$root` from the CSS variable output so `color.brand.$root` emits `--color-brand`, not `--color-brand-root`. This keeps source paths spec-compliant while CSS output stays clean.

## Consequences

- `$root` is the canonical path for all group defaults — both in token source files and in component metadata `tokens` arrays
- `.default` as a token key is removed from all theme files; where it was a variant name with distinct meaning it is renamed to something unambiguous
- Style Dictionary config must include a name transform to drop `$root` from CSS variable names before the build step is wired up
- Three inconsistencies in `theme/light.json` need cleanup before the next token export (see below)

---

## Cleanup required in `theme/light.json`

### 1 — `color.text` has both `default` and `$root` (redundant alias)

`$root` currently aliases to `default`, making two paths resolve to the same value.

**Fix:** Remove `color.text.default`. Any component or alias referencing `color.text.default` should be updated to `color.text.$root`.

```json
// before
"text": {
  "default": { "$type": "color", "$value": "{color.neutral.12}" },
  "$root":   { "$type": "color", "$value": "{color.text.default}" }
}

// after
"text": {
  "$root": { "$type": "color", "$value": "{color.neutral.12}" }
}
```

---

### 2 — `color.background.button.default` is a variant name, not a group default

The `button` group has both `$root` (primary/brand fill) and `default` (page-background fill used for the ghost/outlined button). These are different semantic values — `default` here is not the default of the group, it is a distinct variant.

**Fix:** Rename `color.background.button.default` to `color.background.button.ghost` to make the intent explicit.

```json
// before
"button": {
  "outlined-hover": { "$value": "{color.gold.2}" },
  "default":        { "$value": "{color.gold.1}" },   // ambiguous
  "elevated":       { "$value": "{color.gold.3}" },
  "inverted":       { "$value": "{color.sand.dark.2}" },
  "$root":          { "$value": "{color.brand.$root}" }
}

// after
"button": {
  "outlined-hover": { "$value": "{color.gold.2}" },
  "ghost":          { "$value": "{color.gold.1}" },   // ghost/outlined button background
  "elevated":       { "$value": "{color.gold.3}" },
  "inverted":       { "$value": "{color.sand.dark.2}" },
  "$root":          { "$value": "{color.brand.$root}" }
}
```

---

### 3 — Button background states are split across two hierarchy levels

`button-hover` and `button-disabled` live as flat siblings of the `button` group, while `button.outlined-hover` is nested inside it. Related tokens should be consistently nested.

**Fix:** Move `button-hover` and `button-disabled` inside the `button` group and rename to match the pattern.

```json
// before (flat siblings)
"background": {
  "button-hover":    { "$value": "{color.brand.10}" },
  "button-disabled": { "$value": "{color.neutral.8}" },
  "button": { ... }
}

// after (all button states nested)
"background": {
  "button": {
    "outlined-hover": { "$value": "{color.gold.2}" },
    "ghost":          { "$value": "{color.gold.1}" },
    "elevated":       { "$value": "{color.gold.3}" },
    "inverted":       { "$value": "{color.sand.dark.2}" },
    "hover":          { "$value": "{color.brand.10}" },
    "disabled":       { "$value": "{color.neutral.8}" },
    "$root":          { "$value": "{color.brand.$root}" }
  }
}
```
