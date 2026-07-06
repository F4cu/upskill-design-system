---
description: Generate a page or section layout as a React tree using only library components and tokens, with each structural choice justified by component metadata relationships. Use when starting a new page or section from a one-paragraph brief, a Figma file URL, or both.
---

# Layout generation

**Trigger:** Developer, when starting a new page or section layout.

**When to use:** You have a layout brief (one paragraph describing the page intent and key content areas), a Figma file URL pointing to the design, or both. The skill works from either input; a Figma reference improves fidelity significantly.

## First step — clarify inputs before doing any work

Before reading metadata or drafting any structure, determine which inputs are available:

1. **If a Figma URL or node ID was provided** — call `get_design_context` immediately and use the resulting layout, spacing values, and sub-element details as the primary source. The brief (if also provided) sets intent and fills gaps the Figma output leaves ambiguous.

2. **If only a text brief was provided** — ask the developer one question before proceeding:

   > "Do you have a Figma prototype or design file I can reference? A URL or node ID gives me exact spacing, avatar images, icon placements, and other sub-elements that are invisible from a text description alone. If not, I'll generate from the brief only."

   If the developer says no (or doesn't reply with a URL), proceed from the brief alone.

3. **If both are provided** — Figma is the layout authority for structure and spacing; the brief is the authority for intent and content labels when they conflict.

## Inputs (read all before starting)

- All component metadata files in `packages/components/src/` (`*.metadata.json`) — focus on `composition.accepts`, `composition.containedBy`, `usage.patterns`, `composition.layoutBehavior`
- `.claude/component-patterns.json` — the cross-component pattern aggregate (ADR-013). Read it whole; it fits in context. Use `patterns.*.implementedBy` to pick between components that implement the same interaction pattern, `state.props` for each pattern's canonical state/callback prop names, and the `drift` array to avoid guessing a prop name by analogy — when two components name the same axis differently (e.g. Accordion `onOpenChange` vs Select `onValueChange`), always use the prop name listed for the component you are composing. This file is a consumer input for layout/composition work only — do not inject it into component scaffolding (ADR-013 records why).
- Device grid tokens and `packages/components/src/styles/grid.css` utilities — these are part of the layout vocabulary
- Layout brief — provided by the developer in the prompt (intent, key content areas, constraints)
- Figma design context — from `get_design_context` when a URL or node ID is provided; captures exact structure, spacing tokens, and every visible sub-element

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

**Figma-to-code translation rules** (when the Figma MCP output is the reference — follow exactly):
- **Translate variable names directly.** The Figma output includes explicit CSS variable names (e.g. `gap-[var(--space/inline/md, 16px)]`). The segment after `--space/` maps directly to our gap token name — `inline/md` → `gap="md"`, `stack/xs` → `gap="xs"`. Never substitute a different scale step; never use the fallback px value as a guide.
- **Match the Figma DOM structure.** Do not introduce wrapper elements (e.g. a nested `<Inline>`) that do not appear in the Figma layout. Extra wrappers add an undesigned gap and override the parent's spacing. If two items are siblings in the Figma flex row, keep them as siblings in the code.

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
- **Map every visible Figma sub-element to a prop** — do not only read the text labels. Images, icons, badges, chevrons, and avatar circles each correspond to a prop. A missing prop silently omits the element with no error at build or runtime. For composite components (AppHeader, CardHorizontal, Breadcrumb), cross-check the emitted props against the component's Storybook `Default` story to confirm all required props are present.

### Pass 3: Spacing and responsive tokens

Apply spacing tokens to the structure — never raw values:

- Section vertical rhythm: `paddingY` on `<Box as="section">` (e.g. `paddingY="xl"`)
- Container padding: handled by the `.container` class (uses `--ds-grid-margin` automatically)
- Column gaps: `gap` via device token (`.grid` uses `--ds-grid-gutter`; `Inline` uses a `gap` prop mapped to a token step)
- Responsive column reflow: `.grid` auto-reflows by `--ds-grid-columns` (12→8→4); `Inline wrap` reflows via `minWidth`.

## Recurring patterns (use these exact shapes — do not reinvent)

### Fonts
Fonts are referenced via CSS tokens (`--ds-font-family-body`, `--ds-font-family-headline-serif`) but the typefaces must be loaded. Check `apps/showcase/index.html` — if the Google Fonts `<link>` for Roboto / Playfair Display is missing, add it before generating the page. Without it the browser falls back to a system serif.

### Column inset padding
When the Figma frame for a column (or card-like region) has an **inset** padding token (all four sides), apply it as `<Box padding="…">` wrapping that column's content. Do not omit column-level padding just because the parent section already has `paddingY` — section rhythm and column inset are independent. Keep the `style={{ flex, minWidth }}` on the `Box`, put the layout primitive (`Stack`/`Inline`) inside it.

### Text color on inverted (dark) backgrounds
On any section with `background: var(--ds-color-background-container-inverted)`:
- **Primary body text** (the main paragraph, descriptions) → `var(--ds-color-text-inverted-default)` — full-brightness inverted white.
- **Secondary / supporting text** (captions, metadata, legal copy) → `var(--ds-color-text-inverted-subtle)` — muted inverted.

Never apply `inverted-subtle` to the main descriptive paragraph. When in doubt, check the Figma variable name on the text layer — `color/text/inverted/default` vs `color/text/inverted/subtle` maps directly to these token names.

### Logos / static assets
Logos live in `apps/showcase/public/` (served as `/logo.svg`, `/logo-dark.svg`). Do not use string paths like `/logo.png` unless the file already exists in that folder. Pass these paths to `AppHeader`'s `logoSrc`/`logoSrcDark` props exactly as the Storybook story does (`AppHeader.stories.tsx`). For a dark-background footer use `/logo-dark.svg`.

### AppHeader
`AppHeader` manages its own inner container — do **not** wrap it in a `.container` div. Place it directly under `<Box as="main">`. The component's inner width is aligned to the `.container` max-width (90 rem); extra wrappers break alignment.

**Figma-to-props mapping (read this every time you use AppHeader from a Figma reference):**

When the Figma design context shows an AppHeader, map every visible sub-element to a prop — not just the text labels. Use the Storybook `Default` story (`AppHeader.stories.tsx`) as the canonical reference for the full prop set.

| Figma element | Prop to emit | Notes |
|---|---|---|
| Logo mark (light) | `logoSrc="/logo.svg"` | Always include |
| Logo mark (dark/mono) | `logoSrcDark="/logo-dark.svg"` | Include when a second logo variant is visible |
| Nav link labels | `navItems={[{ label, href, active }]}` | Set `active: true` on the highlighted link |
| **Avatar / profile photo** | **`userAvatarSrc="…"`** | **Always emit when an avatar circle is visible, even if it is a placeholder.** Use a placeholder URL (e.g. `https://placehold.co/24x24/D15D50/ffffff?text=S`) when the Figma image is a generic photo. Missing this prop silently omits the avatar. |
| User name text | `userName="…"` | Emit alongside `userAvatarSrc` — never one without the other when both are visible in Figma |
| Chevron-down next to user name | `userMenuItems={[…]}` | A chevron in Figma means a dropdown menu exists. Emit sensible defaults: `My Profile`, `Settings`, `Log out`. |

**Checklist before leaving AppHeader:** logo ✓ · nav items ✓ · `userAvatarSrc` ✓ · `userName` ✓ · `userMenuItems` ✓ (when chevron visible).

### Accordion with show-more
When the design has an accordion list with a "Show more / Show less" trigger, use the CourseModuleList pattern (`Layout/Examples/CourseModuleList` in Storybook):
- Keep the full data array outside the component.
- Add `const [showAll, setShowAll] = useState(false)` (import `useState` from `'react'`).
- Slice: `const visible = showAll ? ALL : ALL.slice(0, DEFAULT_COUNT)`.
- Render only `visible` items inside `<Accordion>`.
- Below the accordion, render a `<Button variant="ghost" size="sm" trailingIcon={…} onClick={…}>` whose label and icon reflect the toggle state.
- Wrap the `<Accordion>` + button in a `<div>` (not `<Stack>`) so button indentation via `marginLeft` isn't overridden.

### Card carousel with arrows
When the design shows a horizontal row of cards that paginate with left/right arrows — **or when Figma design context contains a component named "Carousel", "carousel", or a scrollable card row with navigation arrows** — use this pattern exactly:

```tsx
import { useCarousel } from '@upskill/components'

const CARD_WIDTH = 280   // adjust to fit ~VISIBLE_COUNT cards in the container
const VISIBLE_COUNT = 4

const carousel = useCarousel(items.length, VISIBLE_COUNT)

<Stack gap="md">
  {/* Box owns the clip; .carousel-outer only overrides to native scroll on mobile */}
  <Box overflow="hidden" className="carousel-outer">
    <div
      style={{
        display: 'flex',
        gap: 'var(--ds-grid-gutter)',
        transform: `translateX(calc(-${carousel.offset} * (${CARD_WIDTH}px + var(--ds-grid-gutter))))`,
        transition: 'transform 300ms ease',
      }}
    >
      {items.map((item) => (
        <div key={item.title} style={{ flexShrink: 0, width: `${CARD_WIDTH}px`, scrollSnapAlign: 'start' }}>
          <CardVertical … />
        </div>
      ))}
    </div>
  </Box>
  {/* .hide-on-mobile: arrows hidden on mobile — user scrolls with finger instead */}
  <Inline gap="sm" justify="end" className="hide-on-mobile">
    <ButtonArrow direction="left" disabled={!carousel.canPrev} onClick={carousel.prev} aria-label="Previous" />
    <ButtonArrow direction="right" disabled={!carousel.canNext} onClick={carousel.next} aria-label="Next" />
  </Inline>
</Stack>
```

**Rules:**
- **Always** import `useCarousel` from `@upskill/components` — never use page-based `useState` for carousel navigation.
- No counter (no "X of Y" text) — arrows only, right-aligned via `justify="end"`.
- `CARD_WIDTH` is a px constant; set it so ~`VISIBLE_COUNT` cards fit the container.
- Use `<Box overflow="hidden" className="carousel-outer">` — `overflow="hidden"` (Box prop) clips the track on desktop; `.carousel-outer` only overrides to `overflow-x:auto` + scroll-snap on mobile (`global.css`).
- Use `className="hide-on-mobile"` on the arrow row — mobile users scroll with their finger.

**Figma signal checklist** — treat any of these as a carousel trigger:
- A Figma component or frame named "Carousel" or "carousel".
- A horizontally scrollable frame with multiple same-type cards and arrow/chevron buttons.
- A card row where the outer frame has `overflow: hidden` and the inner track slides.

## Output

### Default: route page component

Emit the layout as a route page component into `apps/showcase/src/pages/<Name>.tsx`. This is the primary output.

```tsx
// apps/showcase/src/pages/CourseOverview.tsx

import { useState } from 'react'
import { Box, AppHeader, useCarousel } from '@upskill/components'

// Pass 1 skeleton annotated with grammar level
// Pass 2 components annotated with metadata justification
// Pass 3 spacing tokens applied

export default function CoursePage() {
  // stateful patterns (show-more, carousel) declared here
  return (
    // Page — grammar: one <main> per route
    <Box as="main">
      {/* Header — AppHeader goes directly under <main>, no .container wrapper */}
      <AppHeader logoSrc="/logo.svg" logoSrcDark="/logo-dark.svg" … />

      {/* Section — grammar: named region, aria-labelledby → section Heading id */}
      <Box as="section" aria-labelledby="overview-heading" paddingY="xl">
        <Box className="container">
          {/* … */}
        </Box>
      </Box>

      {/* Footer — grammar: one <footer> per page; use /logo-dark.svg on dark backgrounds */}
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
npm run layout:validate apps/showcase/src/pages/<Name>.tsx
```

The validator checks landmark structure (one `<main>`, named sections, labelled navs), fixed-set usage, and the inline-style reconciliation rules. Fix any violations before declaring the layout done.

## Success signal

- `npm run layout:validate` exits 0.
- The JSX builds without errors (`npm run typecheck`).
- The page renders in `apps/showcase` via `npm run dev -w @upskill/showcase` at desktop (≥1440px), tablet (≥768px), and mobile (<768px) in both light and dark themes with **zero manual restructuring** after generation. If restructuring was needed, fix the grammar or metadata before scaling up — the skill's success signal is no-touch generation.
