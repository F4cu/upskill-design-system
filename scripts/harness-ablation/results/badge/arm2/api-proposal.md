# Badge — API proposal (auto-approved, `--eval`)

Source: brief + `reference.png` (two badges side by side: bordered on a transparent fill, and a light-grey fill with a slightly stronger border; both use subtle grey body text and small rounded corners, not a pill).

## Anatomy

- **Badge** (root, `<span>`, inline-flex): border, background, corner radius, inset padding
  - **Label** (`<Text as="span" size="body-default" color="subtle">`): the text

No icon slot, no parts (ADR-023 does not apply), and no interactive states: the badge is static and never focusable.

## Props

| Prop | Concept | Kind | Type | Default | Figma property | Surface |
|---|---|---|---|---|---|---|
| `variant` | Visual weight/style | variant axis | `'outlined' \| 'filled'` | `'outlined'` | `Style` (recorded mapping `variant` ↔ `Style`) | both |
| `children` | Content (label) | content | `string` | — (required) | `Text` (recorded mapping: label `children` ↔ `Text`) | both |
| `className` | — | native | `string` | — | — | code-only |
| `...rest` | — | native | `Omit<HTMLAttributes<HTMLSpanElement>, 'children' \| 'color' \| 'onClick' \| 'role' \| 'tabIndex' \| 'aria-label' \| 'aria-labelledby'>` | — | — | code-only |

Values name the look (ADR-024): `outlined` = border only, `filled` = tinted background. `default` is not used since this is a style axis, not a surface/context axis.

## Tokens

| Property | outlined | filled |
|---|---|---|
| background | `transparent` | `color.background.overlay.subtlest` |
| border (1px) | `color.border.default` | `color.border.strong` |
| text | `color.text.subtle` (via `Text color="subtle"`) | same |
| radius | `border-radius.sm` | same |
| padding | `space.inset.xxs` (block) · `space.inset.xs` (inline) | same |

## Divergences

- No Figma node: the design input is `reference.png` (eval mode), so `figmaNodeId` is omitted.
- Type-enforced anti-patterns: `onClick`, `role`, `tabIndex` and `color` are removed from the spread type so a badge can't be made clickable/focusable or recoloured directly.
- No new vocabulary terms.

## Post-review amendments

- `children` narrowed to `string` (text-only is type-enforced); `aria-label`/`aria-labelledby` omitted (naming the generic role is prohibited); `background-clip: padding-box` so the filled tint doesn't darken the border; the empty `.outlined` rule removed.
- Filled background moved from `overlay.subtle` to `overlay.subtlest`: `text.subtle` on `overlay.subtle` failed `tokens:contrast-check` (3.98–4.48:1); `overlay.subtlest` is closer to the reference fill and is an already-curated passing pair.
