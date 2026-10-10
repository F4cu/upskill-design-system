# Accordion — API proposal (auto-approved, `--eval`)

Design input: brief + `reference.png` (no Figma node).

## Anatomy (top → bottom; names = Figma layer names)

- **Accordion** (root, `div`) — vertical list; provides `headingLevel` to its items via context.
  - **Item** (part `Accordion.Item`, kind `fixed` with free-form `children` content) — one collapsible section; bottom border separator; `container.elevated` background when open.
    - **Header** — `Heading` (`as` = `h{headingLevel}`, `size="title-small"`) wrapping a native `<button aria-expanded aria-controls>`.
      - **Title** — heading text.
      - **Subtitle** (optional) — `Text as="span" size="body-default" color="subtle"`.
      - **Chevron** — `Icon` `chevron-down` / `chevron-up`, `aria-hidden`, colour from `color.icon.subtle` on its wrapper; vertically centred on the whole item (matches reference open state).
    - **Panel** — `div role="region" aria-labelledby=<button id>`, `hidden` when closed; renders `children`.

## Props

### `Accordion`

| Prop | Concept | Kind | Type | Default | Figma property | Surface |
|---|---|---|---|---|---|---|
| `headingLevel` | Inner heading | native | `2 \| 3 \| 4 \| 5 \| 6` | `3` | — | code-only |
| `children` | Content | content | `ReactNode` (`Accordion.Item`s) | — | slot | both |
| `className`, `id`, other `div` attrs | — | native | `HTMLAttributes<HTMLDivElement>` | — | — | code-only |

### `Accordion.Item`

| Prop | Concept | Kind | Type | Default | Figma property | Surface |
|---|---|---|---|---|---|---|
| `title` | Content | content | `string` | — (required) | `Title` | both |
| `subtitle` | Content | content | `string` | — | `Has subtitle` + `Subtitle` | both |
| `children` | Content | content | `ReactNode` | — | `Content` | both |
| `open` | Controlled state (disclosure) | controlled state | `boolean` | — | `Open` | both |
| `defaultOpen` | Controlled state | controlled state | `boolean` | `false` | — | code-only |
| `onOpenChange` | Controlled state | event | `(open: boolean) => void` | — | — | code-only |

## Keyboard

Native `<button>`: Tab/Shift+Tab between headers, Enter/Space toggles. Plus the optional APG accordion keys: ArrowDown/ArrowUp move focus to next/previous header (wrapping), Home/End to first/last.

## Divergences

- `headingLevel` typed `2–6` (not 1): an accordion section title is never the page's `h1`.
- No Figma node: `figmaNodeId` omitted; Figma property names above are proposals following ADR-026 casing.
- Open-state background uses `color.background.container.elevated`; in dark theme that token equals canvas, so the open state is carried by the chevron + content only there.
- Multiple items may be open at once; there is no container-level `value` (each section owns its own `open`, the canonical disclosure name), so no single-open mode.
