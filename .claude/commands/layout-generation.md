---
description: Generate a page or section layout as a React tree using only library components and tokens, with each structural choice justified by component metadata relationships. Use when starting a new page or section from a one-paragraph brief.
---

# Layout generation

**Trigger:** Developer, when starting a new page or section layout.

**When to use:** You have a one-paragraph brief describing what the layout needs to do and what content it contains. No Figma input required — this moment works entirely from metadata and the brief.

## Inputs (read all before starting)

- All component metadata files in `packages/components/src/` (`*.metadata.json`) — focus on `composition.accepts`, `composition.containedBy`, `usage.patterns`, `composition.layoutBehavior`
- Device grid tokens and `packages/components/src/styles/grid.css` utilities — these are part of the layout vocabulary
- Layout brief — provided by the developer in the prompt (intent, key content areas, constraints)

## Layout grammar (mandatory — apply this before choosing components)

Every generated page must follow this fixed hierarchy. One abstraction level per Figma wrapper. Deviate only when the brief explicitly requires it, and annotate why.

| Figma level | Sanctioned code | Landmark / role | Rule |
|---|---|---|---|
| **Page** | route page root: `<Box as="main">` | `main` | exactly one `<main>` per route |
| **Header** | `<Box as="header">` or `<AppHeader>` | `banner` / `navigation` | each `<nav>` inside gets a unique `aria-label` |
| **Section** | `<Box as="section" aria-labelledby={headingId}>` + `paddingY` rhythm | `region` | must have accessible name; prefer `aria-labelledby` pointing to the section `Heading`; use `aria-label` only when there is no visible heading |
| **Container** | `.container` global class applied via `className` | presentational | centers content; max-width + grid margin; never a landmark |
| **Column (N-column card grid)** | `.grid` global class (CSS Grid, column count auto-reflows via `--ds-grid-columns`) | presentational | use for equal-width card grids (3–4+ items) |
| **Column (two-column wrapping)** | `Inline wrap` with `style={{ flex: '1 0 0', minWidth }}` on each child | presentational | use for two-panel layouts that stack on mobile; `minWidth` sets the breakpoint |
| **Component** | library component from the fixed 26 set | per component | leaf — cite the metadata rule that placed it |
| **Footer** | `<Box as="footer">` | `contentinfo` | one per page |

**Inline-style reconciliation** (replaces the blanket "no inline styles"):

- **Allowed:** `.container` and `.grid` global classNames; `style={{ flex: '1 0 0' }}` for column fill; `style={{ minWidth }}` for column wrapping threshold; `style={{ maxWidth }}` for content measure.
- **Forbidden:** raw color via inline style (e.g. `style={{ color: '#d15d50' }}`) — use `<Text color=…>` or `<Heading>` with a token-backed prop; any raw token value outside `var()`; arbitrary CSS properties that belong in a component's CSS Module.

## Constraints (enforce strictly)

- Only use components from the fixed 26-component set (see CLAUDE.md "Component scope").
- Every structural choice must cite the metadata rule that justifies it:
  - `accepts` — a component can only contain what its metadata says it accepts
  - `containedBy` — a component can only appear inside what its metadata says allows it
  - `usage.patterns` — prefer named patterns over ad-hoc composition when one fits
  - `layoutBehavior.widthBehavior` — determines whether a component fills its container or hugs its content
- **Responsive rule:** rely on device tokens for spacing/typography (device CSS auto-applies media queries). Use `.grid` or `Inline wrap` for column→stack reflow. Never write `@media` queries by hand.

## Steps

Complete these three passes in order. Do not skip ahead to components before the structure pass is done.

### Pass 1: Structure

Map the brief to the landmark grammar above. For each distinct content region in the brief:

1. Identify whether it is Page / Header / Section / Container / Column / Footer.
2. Assign the correct code construct (Box as, .container className, .grid className, Inline wrap, or component).
3. Give each `<Box as="section">` a stable heading id for `aria-labelledby` (derive from the section's heading text, e.g. `id="recommended-heading"`).
4. Verify: exactly one `<Box as="main">` in the tree; every `<Box as="section">` has an accessible name; every extra `<nav>` has a unique `aria-label`.

Output the structure skeleton before proceeding to Pass 2.

### Pass 2: Component selection

For each content area identified in Pass 1, select the appropriate library component. For every leaf node:

- Cite the `when` or `usage.patterns` field from that component's metadata that justifies the choice.
- Check `accepts`/`containedBy` — the parent must accept the child, the child must allow being contained by the parent.
- Apply the CLAUDE.md typography rules: any visible text must go through `<Text>` or `<Heading>`, never a raw string, `<span>`, or `<p>`.

### Pass 3: Spacing and responsive tokens

Apply spacing tokens to the structure — never raw values:

- Section vertical rhythm: `paddingY` on `<Box as="section">` (e.g. `paddingY="xl"`)
- Container padding: handled by the `.container` class (uses `--ds-grid-margin` automatically)
- Column gaps: `gap` via device token (`.grid` uses `--ds-grid-gutter`; `Inline` uses a `gap` prop mapped to a token step)
- Responsive column reflow: `.grid` auto-reflows by `--ds-grid-columns` (12→8→4); `Inline wrap` reflows via `minWidth`.

## Output

### Default: route page component

Emit the layout as a route page component into `apps/showcase/src/pages/<Name>.tsx`. This is the primary output.

```tsx
// apps/showcase/src/pages/CourseOverview.tsx

import { Box } from '@upskill/components'
import { AppHeader } from '@upskill/components'
import styles from './CourseOverview.module.css'

// Pass 1 skeleton annotated with grammar level
// Pass 2 components annotated with metadata justification
// Pass 3 spacing tokens applied

export default function CourseOverview() {
  return (
    // Page — grammar: one <main> per route
    <Box as="main">
      {/* Header — grammar: <header> landmark */}
      <Box as="header">
        <AppHeader … />
      </Box>

      {/* Section — grammar: named region, aria-labelledby → section Heading id */}
      <Box as="section" aria-labelledby="overview-heading" paddingY="xl">
        <Box className="container">
          {/* … */}
        </Box>
      </Box>

      {/* Footer — grammar: one <footer> per page */}
      <Box as="footer">
        {/* … */}
      </Box>
    </Box>
  )
}
```

Annotate every structural node with the grammar level and every leaf node with the metadata rule that placed it. A reader should be able to audit the tree without opening any metadata file.

### Optional: `--story` mode

When the developer passes `--story`, emit a Storybook story file instead, following the existing story format (`packages/components/src/stories/<Name>.stories.tsx`). Use this for component-level review, not for full route pages.

## Final step

After generating the file, run:

```
npm run validate:layout apps/showcase/src/pages/<Name>.tsx
```

The validator checks landmark structure (one `<main>`, named sections, labelled navs), fixed-set usage, and the inline-style reconciliation rules. Fix any violations before declaring the layout done.

## Success signal

- `npm run validate:layout` exits 0.
- The JSX builds without errors (`npm run typecheck`).
- The page renders in `apps/showcase` via `npm run dev` at desktop (≥1440px), tablet (≥768px), and mobile (<768px) in both light and dark themes with **zero manual restructuring** after generation. If restructuring was needed, fix the grammar or metadata before scaling up — the skill's success signal is no-touch generation.
