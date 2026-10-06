---
title: "ADR-024 — Button variants name an absolute weight; context decides the rank"
---
# ADR-024 — Button variants name an absolute weight; context decides the rank

**Date:** 2026-10-02
**Amended:** 2026-10-06
**Status:** `accepted`

## Context

Button shipped four variants: `default` (brand fill), `outlined`, `ghost`, and `elevated`. The names had three problems:

1. **They described appearance, not intent.** `outlined`, `ghost`, and `elevated` say how the button looks; `default` says nothing at all. Neither a person nor an agent running `/layout-generation` could pick a variant from its name — the meaning lived only in metadata prose.
2. **The fallback was the loudest option.** A bare `<Button>` rendered as the brand-fill primary, so forgetting the prop produced an extra competing call to action. The `hero-cta` pattern already relied on that implicit default.
3. **Two unrelated questions shared one prop.** `default`/`outlined`/`ghost` were an emphasis ranking; `elevated` meant "this sits on a photo" — a statement about the background, not about importance.

The metadata also told consumers to use `default` for destructive actions, which makes delete look identical to the page's main call to action.

### Why not `primary` / `secondary` / `tertiary`

The obvious rename — and what Carbon, Polaris, and Primer (partially) use — is a rank. But rank is a property of the *group of buttons*, not of one button, and it changes with the container: in a dialog footer the lead action is genuinely primary, while in a card the same lead action is visually a secondary, because the page around the card already has its primary — and twelve cards in a grid would otherwise render twelve primaries. Rank names hide that dependency, so the large systems compensate with a prose rule ("one primary per view") taught through docs and review. Material 3 avoided the problem by naming absolute styles (filled, tonal, outlined, text) and documenting each one's emphasis level.

### Alternatives considered for the over-media case

| Option | Verdict |
|---|---|
| Keep `elevated` as a public variant (opaque surface) | Rejected. One consumer (`CardVertical`'s Favorite and Menu), it's context rather than emphasis, and the name collides with Material 3's "Elevated" emphasis level. |
| Spectrum-style `staticColor` / `onMedia` modifier prop | Deferred. Right shape if a second consumer appears; premature for one. |
| Transparent button with only a hover tint (Braid-style) | Rejected on its own. Hover doesn't fix resting contrast: WCAG 1.4.11 is judged at rest, touch has no hover, and a user has to find the button before hovering it. Braid's `transparent` relies on knowing the background (`customLight`/`customDark`); a photo is neither. |
| Scrim gradient on the thumbnail | Viable, but changes the image treatment and needs a Figma pass. |
| **Transparent button + icon halo, owned by CardVertical** | **Chosen.** The glyph carries its own contrast at rest on any image; no change to Button's API. |

## Decision

**Button `variant` names an absolute visual weight. Which weight an action gets is decided by its container, and that decision lives in metadata patterns and a deterministic check — never in the variant name.**

| Variant | Weight | Replaces |
|---|---|---|
| `accent` | Highest — brand fill, inverted text | `default` |
| `neutral` | **Fallback** — bordered, neutral text | `outlined` |
| `transparent` | Lowest — no background or border, link text | `ghost` |
| `danger` | Destructive — error fill, inverted text | *(new)* |

`elevated` is removed from Button.

- **Fallback is `neutral`.** The failure mode of a missing prop becomes a calm button, not a competing primary (Primer, Atlassian, Polaris, and Fluent all fall back to their secondary/neutral button).
- **Context rules** (Button `usage.patterns`): decision-region footer → `neutral` + `accent`; destructive confirmation → `neutral` + `danger`; card or other repeated item → `neutral` + `transparent`, never `accent`; hero → one `accent`.
- **Enforced, not just documented.** `npm run layout:validate` fails on `<Button variant="accent">` inside `CardVertical`/`CardHorizontal` or a `.map()` callback, and on more than one `accent` per `<section>`. Plain `Card` is deliberately not covered: it is also used as a single form panel, which is a legitimate decision region.
- **Over-media actions are CardVertical's** (ADR-009 rule 3). Favorite and Menu render `variant="transparent"` with a CardVertical CSS Module class that sets the glyph to `color.icon.on-media.default`, adds a `drop-shadow` halo (`color.icon.on-media.halo`, two stacked shadows of radius `size.halo` — one was too faint on a near-white image), and a `color.background.on-media.hover` tint. The class is doubled (`.onMedia.onMedia`) so it outranks Button's single-class variant rules regardless of stylesheet order, without touching Button's private `--_bg`/`--_text` properties. The on-media tokens are theme-invariant: a photo doesn't change with the theme.
- **`accent` vs the `accent` brand slot.** The variant is API; the token it reads is named for its color source. `accent` fills from the `brand` slot (`color.background.button.default` → `{color.brand.11}`), not from the `accent` (teal) slot. The token is not renamed in this change; see Consequences.

### Precedent for the names

`accent` follows Spectrum's `accent`; `neutral` follows Braid's and Atlassian's neutral tone; `transparent` follows Fluent and Braid; `danger` follows Primer and Carbon.

## Consequences

- **Breaking prop change.** Every `variant="default|outlined|ghost|elevated"` call site was renamed in the same change; TypeScript flags any missed value. A `<Button>` with no `variant` now renders neutral, which TypeScript can't flag. Every bare primary call site (Layout, SettingsForm and FooterHighlights stories) was given an explicit `variant="accent"`, the `Card` story's in-card action an explicit `neutral`, and the `hero-cta` and `content-card` pattern trees were made explicit. When migrating, search for bare `<Button` as well as old variant values.
- **New tokens:** `color.background.button.danger.{default,hover}` (`red.11`/`red.12`, mirroring the accent fill's `11`/`12` steps; same raw-ramp caveat in dark mode as the accent fill, issue #22), `color.icon.on-media.{default,halo}`, `color.background.on-media.hover`, and `size.halo` (device alias of `size.050`). Danger pairs added to the contrast gate; the on-media pairs can't be checked against photo pixels, so the `ActionsOnLightAndDarkMedia` CardVertical story is the visual check.
- **Follow-ups, not done here:**
  - ~~Retire `color.background.button.{elevated,ghost}`~~ — done 2026-10-02 together with `button.inverted` (also unread): `Status = deprecated` in Airtable with no successor, mirrored to `$deprecated: true` by `airtable:pull:governance`. Zero usages, so no `/token-deprecation-pass` migration was needed. Leaves deleted from source 2026-10-06, together with `button.{default,hover}` and `button.outline.hover` (all unread after the accent/neutral/transparent renames). That reverses the earlier "wait for Figma" order: code is the source of truth (ADR-002), so source leads and the next `/figma-variable-audit` reports the Figma variables as extras to unbind and remove. Airtable rows are deleted rather than deprecated.
  - ~~Rename `color.background.button.{default,hover,disabled}` to `button.accent.*`~~ — done 2026-10-06 for `default`/`hover` → `button.accent.{default,hover}` (old names: deprecate in Airtable with these successors). `button.disabled` stays a shared state token, because accent and danger disable to the same fill. It now aliases a new generic `color.background.disabled`, which Checkbox reads instead of borrowing Button's token.
  - Figma: rename the Button `Style` variant values (`Default`/`Outlined`/`Ghost`/`Elevated` → `Accent`/`Neutral`/`Transparent`/`Danger`), switch CardVertical's overlay buttons to the halo treatment, and push the new variables (`/figma-variable-push`). Interactive, developer-present.
- **Trade-off accepted.** `primary/secondary` is the vocabulary most designers expect; Figma labels and Storybook will read differently from convention, so the Button docs lead with the "weight, not rank" rule.
- **Rank stays expressible.** Nothing prevents two `neutral` buttons where one is "more important" — when that matters, the container's pattern decides, and a new pattern goes in Button's metadata rather than a new variant.

## Amendment (2026-10-06) — `transparent` is a ghost button, not a link-styled one

`transparent` shipped link-styled: link text color, no inline padding, and a text-color-only hover. That made it two things at once — a ghost button (Close, icon buttons) and a button that looks like a link ("Show more"). A hover fill and a flush, link-like alignment pull against each other: the fill needs padding, and padding pushes the label in from the content edge.

**Decision:** `transparent` is a ghost button. It keeps the interactive text color, gains the size's standard inline padding, and fills on hover with a new `color.background.button.transparent.hover`. There is no separate `link` variant. "Show more" uses `transparent`; `TextLink` stays `<a>`, for navigation only.

**Alternatives considered:**

| Option | Verdict |
|---|---|
| Separate `link` variant (Polaris `plain`, Primer `link`, Chakra v2 `link`) | Deferred. Only justified by flush alignment; add it when a real layout shows the indent looks wrong. |
| Opt-in negative-margin `bleed` prop (Braid) | Deferred, for the same reason. If needed it lives on Button, never in layout files: the layout rules forbid arbitrary CSS there, and parts never set outer margins. |
| `TextLink` rendering as a `<button>` (MUI `Link component="button"`) | Rejected. It breaks `TextLink`'s "always `<a>`, `href` required" contract. |
| **Accept the indent (Material 3 text buttons)** | **Chosen.** Simplest; the label sits inset from the content edge by the size padding. |

The touch target was never the reason to add padding. Button's height (32/40/48px) already gives every variant a WCAG 2.5.8-compliant hit area.

**Tokens:** a variant reads only its own tokens. `color.background.button.outline.hover` was named for the retired `outlined` variant, so it is replaced by `color.background.button.neutral.hover`, and `button.transparent.hover` aliases it. The old value (`surface.2`) was the canvas color itself, so neutral's hover fill had never been visible. The resting-state screenshot baselines can't catch that. The new value is a tint (`black.alpha.1` light / `white.alpha.1` dark, the same values as `background.overlay.hover`), which shows on any surface a ghost button sits on. Trade-off accepted: transparent's brand-11 text on the light tint is 4.46–4.47:1 while hovered. That is the same near-miss as `text.brand` on `overlay.hover`, waived under issue #96. It passes at rest. The alias keeps the two fills identical today and lets them diverge later without touching CSS. `outline.hover` follows the same governance flow as the `elevated`/`ghost` cleanup: deprecated in Airtable with successor `button.neutral.hover`, mirrored by `airtable:pull:governance`, and its leaf removed once Figma no longer binds it.
