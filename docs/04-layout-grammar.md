---
sources:
  - scripts/validate-layout.js
  - .claude/commands/layout-generation.md
  - packages/components/src/styles/grid.css
  - docs/decisions/011-layout-landmark-grammar.md
  - docs/decisions/013-cross-component-pattern-schema.md
  - docs/decisions/016-layout-output-review-path.md
  - docs/decisions/004-layout-token-categories.md
  - docs/decisions/005-size-vs-space-primitives.md
  - docs/decisions/009-extend-vs-new-vs-internal.md
# clock reset 2026-07-12: commands gain visual-review step + adversarial/in-session path rename (#64 PR 2); stage-vocabulary sweep for this page follows in the dedicated docs PR
---
# Layout grammar

## What it is

Every page in `apps/showcase` follows a **fixed landmark grammar**: a one-to-one mapping from Figma's structural hierarchy (Page → Header → Section → Container → Column → Component → Footer) to sanctioned HTML landmarks and layout utilities ([ADR-011](decisions/011-layout-landmark-grammar.md)). The grammar is the mandatory first pass of the `/layout-generation` command — structure is locked before any component selection or spacing happens — and it is enforced [deterministically](08-glossary.md) by `npm run layout:validate <file>` for any layout file, hand-edited or generated.

## Why it's built this way

ADR-011 records three concrete failures that forced the decision:

1. **Improvised structure.** The `/layout-generation` skill worked at primitive-composition level (Stack/Inline/Box/Card) but had no rule for which construct mapped to which Figma wrapper — structure was re-derived from the brief every run, so output was inconsistent across runs.
2. **Wrong output target.** The skill emitted Storybook stories, but the actual goal is route pages in `apps/showcase`. Storybook documents components; it doesn't render full pages.
3. **Contradictory constraints.** The rulebook forbade all inline styles, yet the only existing full-page example used `.container`, `.grid`, `style={{ flex: 1 }}`, and `style={{ maxWidth }}`. The rulebook and the codebase disagreed.

The Figma Course Overview page (node 96:5854) served as the canonical reference and confirmed both the hierarchy and two distinct column patterns: CSS Grid for equal N-column card grids, wrapping flex for two-panel layouts that stack on mobile. The building blocks already existed unused — `Box` is polymorphic (it can render as any HTML element via its `as` prop, typed `as?: ElementType` — `<Box as="main">` → `<main>`), the `.container`/`.grid` utilities live in `packages/components/src/styles/grid.css`, and device tokens (`--ds-grid-columns`, `--ds-grid-margin`, `--ds-grid-gutter`) handle responsive reflow automatically.

## How it works, concretely

The grammar table from ADR-011 — one abstraction level per Figma wrapper:

| Figma level | Sanctioned code | Landmark / role | Rule |
|---|---|---|---|
| **Page** | `<Box as="main">` | `main` | exactly one per route |
| **Header** | `<Box as="header">` or `<AppHeader>` | `banner` / `navigation` | each `<nav>` gets a unique `aria-label` |
| **Section** | `<Box as="section" aria-labelledby={headingId}>` | `region` | must have an accessible name, `aria-labelledby` → its `Heading` |
| **Container** | `.container` className | presentational | max-width + grid margin; not a landmark |
| **Column (N-grid)** | `.grid` className (CSS Grid) | presentational | equal-width card grids (3–4+ items); column count reflows via `--ds-grid-columns` |
| **Column (two-panel)** | `Inline wrap` + `style={{ flex: '1 0 0', minWidth }}` | presentational | wrapping flex; `minWidth` sets the stack breakpoint |
| **Component** | fixed-set library component | per component | leaf |
| **Footer** | `<Box as="footer">` | `contentinfo` | one per page |

**The inline-style allowlist** replaced the prior blanket prohibition (the reconciliation of problem 3):

- **Allowed:** `.container` / `.grid` classNames; `style={{ flex: '1 0 0' }}` for column fill; `style={{ minWidth }}` for the wrapping threshold; `style={{ maxWidth }}` for content measure.
- **Forbidden:** raw color via inline style (use `<Text color=…>` or `<Heading>`); raw token values outside `var()`; arbitrary CSS that belongs in a component's CSS Module.

Responsiveness comes from the token layer, never from layout files: device tokens carry the per-breakpoint values, reflow happens via `.grid` or `Inline wrap`, and hand-written `@media` in a layout file is forbidden. Which spacing tokens a layout may touch is governed by [ADR-004](decisions/004-layout-token-categories.md) (`grid.*` is consumed only by `.container`; components use `space.*`) and [ADR-005](decisions/005-size-vs-space-primitives.md) (`space` for gaps, `size` for element dimensions).

The validator enforces the load-bearing invariants without judgment: exactly one `<main>`, every `<section>` named, every extra `<nav>` uniquely labelled, fixed-set component names only.

```bash
npm run layout:validate -- apps/showcase/src/pages/CourseOverview.tsx
```

The `/layout-generation` command's default output target is a route page in `apps/showcase/src/pages/<Name>.tsx` (a `--story` mode retains the old Storybook format for component-level review). Every structural choice it makes must cite a metadata rule — the `composition.accepts`/`containedBy` and `usage.patterns` fields required by the [metadata schema](02-component-lifecycle.md). It also reads `.claude/component-patterns.json`, the cross-component pattern aggregate ([ADR-013](decisions/013-cross-component-pattern-schema.md)), to pick canonical pattern implementations and state/callback prop names — a consumer input for layout/composition work *only*, never injected into component scaffolds (the accuracy harness measured a regression there). Whether a layout need justifies a new component at all goes through the [ADR-009](decisions/009-extend-vs-new-vs-internal.md) three-question test first.

Generated layout code never lands on `main` directly ([ADR-016](decisions/016-layout-output-review-path.md)): once validation and typecheck pass, it goes to a `layout/<kebab-name>` branch with a PR, reviewed in-session with `/code-review` by default — the same no-unreviewed-agent-code invariant as component scaffolds, at a cheaper review tier. A deeper pass by the read-only adversarial-reviewer subagent is opt-in, for full route pages only (never `--story` fragments).

No diagram here: the grammar table *is* the spatial mapping, and a flowchart would only restate it.

## Related

- ADRs: [011 — Layout landmark grammar](decisions/011-layout-landmark-grammar.md), [004 — `space.*` vs `grid.*`](decisions/004-layout-token-categories.md), [005 — `size` vs `space`](decisions/005-size-vs-space-primitives.md), [009 — Extend vs new vs internal](decisions/009-extend-vs-new-vs-internal.md), [016 — Layout output review path](decisions/016-layout-output-review-path.md)
- Commands: `/layout-generation` (in `.claude/commands/`)
- Scripts: `scripts/validate-layout.js` via `npm run layout:validate` — see the [npm scripts reference](07-npm-scripts-reference.md)
- Live examples: the five pages in `apps/showcase/src/pages/` — see [Start here](00-start-here.md)
