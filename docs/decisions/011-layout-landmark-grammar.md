# ADR-011 — Layout landmark grammar for `/layout-generation`

**Date:** 2026-06-28
**Status:** `accepted`

## Context

The `/layout-generation` skill existed but produced inconsistent output across runs because it had no formal mapping from Figma's structural hierarchy to HTML landmarks and layout utilities. Three specific problems forced this decision:

1. **Improvised structure.** The skill worked at primitive-composition level (Stack/Inline/Box/Card) but had no rule for which construct mapped to which Figma wrapper (Page, Section, Container, Column, Component). Structure was re-derived from the brief every run.

2. **Wrong output target.** The skill emitted Storybook stories into `packages/components/src/stories/`. The actual goal is route pages in `apps/showcase` — a separate Vite + React app. Storybook is for component documentation, not full-page rendering.

3. **Contradictory constraints.** The skill's rulebook forbade all inline styles, yet the only existing full-page example (`Layout.stories.tsx`) used `.container`, `.grid`, `style={{ flex: 1 }}`, and `style={{ maxWidth }}`. The rulebook and the codebase disagreed.

The Figma Course Overview page (node 96:5854) was used as the canonical design reference during planning and confirmed the hierarchy: `Desktop → Header main → Section (×3) → Container → Columns → Components`. It also revealed two distinct column patterns: CSS Grid (equal N-column cards) and wrapping flex (two-panel layouts that stack on mobile).

The building blocks were already present and unused by the skill:
- `Box` supports `as?: ElementType`, making it a polymorphic landmark renderer (`<Box as="section">` → `<section>`, `<Box as="main">` → `<main>`)
- `.container` and `.grid` global CSS utilities exist in `packages/components/src/styles/grid.css`
- Device tokens (`--ds-grid-columns`, `--ds-grid-margin`, `--ds-grid-gutter`) handle responsive reflow automatically

## Decision

Encode a **fixed landmark grammar** that maps one abstraction level per Figma wrapper. The grammar is the mandatory first pass of the skill; component selection and spacing follow only after the structure is locked.

| Figma level | Sanctioned code | Landmark / role | Rule |
|---|---|---|---|
| **Page** | `<Box as="main">` | `main` | exactly one per route |
| **Header** | `<Box as="header">` or `<AppHeader>` | `banner` / `navigation` | each `<nav>` inside gets a unique `aria-label` |
| **Section** | `<Box as="section" aria-labelledby={headingId}>` | `region` | must have accessible name; `aria-labelledby` → section Heading id preferred |
| **Container** | `.container` className | presentational | max-width + grid margin; not a landmark |
| **Column (N-column grid)** | `.grid` className (CSS Grid) | presentational | equal-width card grids (3–4+ items); column count reflows via `--ds-grid-columns` |
| **Column (two-panel)** | `Inline wrap` with `style={{ flex: '1 0 0', minWidth }}` | presentational | two-column wrapping flex; `minWidth` sets the stack breakpoint |
| **Component** | fixed-set library component | per component | leaf |
| **Footer** | `<Box as="footer">` | `contentinfo` | one per page |

The skill's **inline-style reconciliation** replaces the prior blanket prohibition:

- **Allowed:** `.container` / `.grid` classNames; `style={{ flex: '1 0 0' }}` for column fill; `style={{ minWidth }}` for wrapping threshold; `style={{ maxWidth }}` for content measure.
- **Forbidden:** raw color via inline style → use `<Text color=…>` or `<Heading>`; raw token values outside `var()`; arbitrary CSS properties that belong in a component's CSS Module.

The skill's default output target changes from a Storybook story to a route page in `apps/showcase/src/pages/<Name>.tsx`. A `--story` mode retains the prior Storybook-story format for component-level review.

A `scripts/validate-layout.js` script (`npm run layout:validate`) enforces the grammar deterministically (one `<main>`, named sections, labelled navs, fixed-set component names only). It gates the skill: the validator must exit 0 before the output is declared done. Deterministic checks stay in scripts per the lite-agentic charter.

## Consequences

**Benefits:**
- Layout generation is repeatable: the same brief produces the same structural skeleton across runs.
- Landmark rules are correct by construction (one `<main>`, named regions) — no post-hoc a11y fix needed.
- The two distinct column patterns (CSS Grid vs wrapping flex) are now explicit, matching the Figma design intent.
- The validator catches structural violations before they reach the developer's browser, replacing the informal manual `accepts`/`containedBy` step.

**Trade-offs accepted:**
- The grammar is opinionated; a brief that genuinely needs a non-standard structure requires explicit annotation to explain the deviation.
- `Inline wrap` with `style={{ flex: '1 0 0', minWidth }}` is the one place inline styles are accepted — this is a layout primitive concern, not a color/typography concern, so it does not violate the spirit of the typography rule.
- `apps/showcase` must exist as a local Vite app before the skill can produce runnable output; see workstream D of the hardening plan.

**Related ADRs:** ADR-004 (layout token categories), ADR-005 (space vs size token split), ADR-009 (extend vs new vs internal component decision).
