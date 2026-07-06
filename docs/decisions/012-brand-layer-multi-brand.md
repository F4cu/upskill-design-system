# ADR-012 — Brand Layer for Multi-Brand Tokens

**Date:** 2026-07-06
**Status:** `accepted`

## Context

The system needed to support more than one brand identity (color ramp mapping, font families, border radius) on top of the shared component set and shared light/dark semantics, without duplicating the theme layer per brand. ADR-002's three-layer model (primitives → theme → device) has no slot for "brand" — theme files directly referenced primitive ramps (`{color.terracotta.9}`), so adding a second brand would have meant forking every theme file.

Separately, the natural way to represent multiple brands in Figma is multiple variable collections/modes. The Variables REST API and Code Connect are Enterprise/Org-only (see ADR-002's 2026-06-17 amendment) — a constraint already established for token sync generally. Building brand-mode support into the Figma side would either require the Enterprise tier or a workaround (duplicate files, manually re-linked variables) that fights the tool rather than extending a real capability.

## Decision

Insert a **brand layer** between primitives and theme:

```
primitives.json                     → primitives.css
brands/<brand>.json (e.g. upskill,  → brand.<brand>.css   [data-brand="<brand>"]
         horizon)                                          (default brand also matches :root)
theme/light.json, theme/dark.json   → theme.<mode>.css     (brand-agnostic, var() chains)
device/*.json                       → unchanged
```

Each brand file owns four color ramp slots — `brand`, `accent`, `neutral`, and `surface` (page/container tints; discovered during extraction because those tints were mapped to `gold`, which is none of brand/accent/neutral) — plus `font.family.*` and `border-radius.*`. Radius values are **literal numbers**, not aliases: a brand-file `border-radius.sm` aliasing primitive `border-radius.sm` would be a circular self-reference, so the default brand's radius file duplicates the primitive values on purpose — the override mechanism is cascade (brand CSS loads after primitives CSS at equal specificity), not aliasing.

Theme files become brand-agnostic: they reference brand slots (`{color.brand.9}`) or functional primitives directly (feedback, award, alpha, black/white stay direct-primitive — these are not brand concepts). Style Dictionary emits every theme token as a `var()` chain (`outputReferences: true` + `include: [primitives, default-brand]`) so one `theme.<mode>.css` serves every brand; runtime brand selection is a `data-brand` attribute, mirroring the existing `data-theme` pattern. Import order in `tokens.css` is a load-bearing contract: primitives → default brand → non-default brands → device → theme.light → theme.dark, so that `[data-brand]` overrides win over `:root` and dark-theme wins over light at equal specificity.

Because `warnings: 'error'` throws on Style Dictionary's "filtered out token references" warning (which is expected for the brand/theme `include` + filter combo), brand and theme build instances run with `warnings: 'warn'`. Two build-time gates compensate: a **shape gate** (every brand's flattened token-path set must deep-equal the default brand's) and a **no-inlined / no-dangling gate** (theme CSS must contain only `var()` references, never a raw resolved value from the default brand leaking in; every `var()` name referenced must resolve to a defined primitive/brand/theme var).

**Contrast rule: brands swap hues, not steps.** The semantic step chosen for a role (e.g. "border uses step 9") is shared across brands — never overridden per brand. If a brand's chosen hue fails contrast at that shared step, the fix is a different hue mapping for that slot, or a waiver with a tracked issue (same protocol as existing token-contrast waivers) — never a per-brand semantic override in the theme files. Only primitive hues with a full light + dark ramp are eligible for a brand slot (`cyan` currently has no dark ramp and is excluded).

**Figma scope boundary (deferred, not a gap):** the brand layer is code-only for now. Figma has no automatable way to represent multiple brand "modes" without the Enterprise-gated Variables REST API — the same wall ADR-002 already documents for token sync generally. Rather than force a workaround, brand support is scoped out of the Figma mirror entirely: `/figma-variable-audit` and `/figma-variable-push` operate on the single default-brand token set, same as before this ADR. This is the same pattern already used for representational divergences (ADR-002's 2026-06-22 amendment, unitless line-heights) — a named, accepted limit of what the mirror can faithfully represent, not silent drift. Storybook (brand toolbar switching `data-brand` live) is the canonical demo surface for multi-brand, not Figma.

## Consequences

- **Adding a brand** means: a new `brands/<name>.json` with the same shape as an existing one (enforced by the shape gate), only hues with full light+dark ramps, a package export, a `tokens-check.yml` file-existence entry, and a Storybook toolbar item. No theme file changes.
- **Theme files are brand-agnostic by construction** — a bug in one brand's ramp cannot be masked by a per-brand theme override, because none exist. The shared-step contrast rule is enforced by review discipline, not tooling, so this ADR is the record to point back to.
- **Airtable sync and `token-deprecation-pass` are brand-unaware for now.** The governance sync (light/dark value columns, `flattenSemantic`) is two-theme-shaped, not brand-shaped; it needs a brand dimension before it can round-trip brand tokens. Deferred until that need is concrete.
- **Figma stays single-brand.** A reviewer or collaborator opening the Figma file sees only the default brand's variables. Multi-brand is demonstrable in code and Storybook, not in Figma, until an Enterprise-tier plan (or an equivalent tool) removes the gate — at which point this section should be revisited, not the four-layer model itself.
- **`background.button.default`/`hover` intentionally keep the light ramp value in dark theme** (a pre-existing carry-over predating this ADR) — noted here so it isn't mistaken for a brand-layer bug during future contrast triage.

## Amendment to ADR-002

Add a pointer at the bottom of ADR-002: the token model is now four layers (primitives → brand → theme → device); see ADR-012 for the brand layer.
