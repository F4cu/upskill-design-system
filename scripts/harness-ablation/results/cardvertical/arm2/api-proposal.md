# CardVertical — API proposal (auto-approved, `/add-component --eval`)

Design input: brief + `reference.png` (no Figma node). Top row of the reference = `size="lg"` (catalog grid, 340px thumbnail), bottom row = `size="sm"` (saved-courses carousel, 180px thumbnail). Columns, left to right: not started · in progress · completed (the last one also certified).

## Anatomy (top to bottom)

1. **Thumbnail** — `Image`, fills the card width; height `size.thumbnail.lg` (lg) or `size.thumbnail.md` (sm). No `thumbnailSrc` → Image's placeholder glyph.
2. **Progress** — `ProgressBar`, only when `progress` is set; named by the title (`aria-labelledby`).
3. **Title** — `Heading` `headline-serif`, wraps (no truncation).
4. **Meta** — `Inline` row: duration (`Text metadata subtle`), Certified marker (`badge-check` icon + "Certified"), Completed marker (`check` icon + "Completed"). Row omitted when it would be empty.

## Props

| Prop | Concept | Kind | Type | Default | Figma property | Surface |
|---|---|---|---|---|---|---|
| `size` | Size | variant axis | `'sm' \| 'lg'` | `'lg'` | `Size` | both |
| `title` | Content | content | `string` | — (required) | `Title` | both |
| `thumbnailSrc` | Image (prefixed by part) | content | `string` | — (placeholder) | `Thumbnail` | both |
| `thumbnailAlt` | Image (prefixed by part) | content | `string` | `''` | — | code-only |
| `duration` | Content (one prop per datum) | content | `string` | — | `Duration` / `Has duration` | both |
| `certified` | Boolean | content | `boolean` | `false` | `Certified` | both |
| `progress` | Lifecycle (data prop; `status` derived) | lifecycle | `number` (0–100) | — | `Status` (`notStarted`/`inProgress`/`completed`) | both |
| `headingLevel` | Inner heading | native | `'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6'` | `'h3'` | — | code-only |
| `className`, native div attrs | — | native | `Omit<HTMLAttributes<HTMLDivElement>, 'role' \| 'children' \| 'aria-labelledby' \| 'title'>` | — | — | code-only |

Lifecycle (ADR-025) is derived, never a prop: `progress` undefined → `notStarted`; `0 ≤ progress < 100` → `inProgress` (bar); `progress ≥ 100` → `completed` (full bar + Completed marker).

## Divergences / decisions

- **Single component, no parts.** ADR-023/024/026/028 describe an earlier CardVertical with `.Favorite`/`.Menu`/`.Media` parts. The brief explicitly asks for one component configured by props, and the reference has no overlay actions, so no parts ship. Those ADR references stay historical; adding parts later is additive (preset + parts, ADR-023).
- **Completed keeps the bar.** The brief says a finished course "shows a completed marker instead"; the reference shows a full bar *and* a "✓ Completed" marker. Following the reference: the marker replaces the partial bar state, not the bar.
- **`size` values `sm`/`lg`** (no `md`): only the two steps exist (vocabulary: "only the steps it has").
- **`headingLevel`** is the vocabulary term; added so the card isn't locked to h3 (the CardHorizontal anti-pattern).
- **`title` omitted from native attrs** so the string prop doesn't collide with the HTML `title` tooltip attribute.
- Figma `Status` is a Figma-only preview of the derived lifecycle (ADR-025 naming), no code prop.
