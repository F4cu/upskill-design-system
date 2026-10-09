# UpSkill Design System

Tool-agnostic index for any coding agent (ADR-029, Tier 0). Invariants and pointers only, never procedures. Claude Code sessions also load `CLAUDE.md` (Claude-specific workflow on top of this file).

A learning-first, lite design system for a small SaaS product: a fixed, small component set, maintained by one person. Pipeline: Figma → token export → Style Dictionary build → CSS/JS outputs → coded components; Airtable is the governance layer, GitHub Actions the automation layer. Phase status: `ROADMAP.md`.

## Tokens

Four layers, resolved in this order (later overrides earlier), W3C DTCG format in `packages/tokens/src/`:

| Layer | Files | Holds |
|---|---|---|
| Primitives | `primitives.json` | Raw, context-free values. Single source of truth, hand-edited via PR (ADR-002). |
| Brand | `brands/<brand>.json` | Per-brand ramp mappings (`brand`, `accent`, `neutral`, `surface`), `font.family.*`, literal `border-radius.*` (ADR-012). |
| Theme | `theme/light.json`, `theme/dark.json` | Brand-agnostic semantic aliases to brand slots or functional primitives, never a brand's raw hue. |
| Device | `device/{desktop,tablet,mobile}.json` | Responsive spacing, grid, typography. Desktop ≥ 1440px, tablet ≥ 768px, mobile < 768px. |

- Runtime selection: `data-brand` and `data-theme` attributes. The import order in `tokens.css` (primitives → default brand → other brands → device → theme.light → theme.dark) is load-bearing for the cascade (ADR-012).
- DTCG: `$type`/`$value`, `{path.to.token}` aliases. Never commit `$extensions`; `$deprecated` is the exception (mirrored from Airtable).
- `npm run tokens:build` (`packages/tokens/build.js`) emits CSS custom properties and JS/TS constants. **Components consume only the built output** (`var(--ds-*)`, generated constants), never source JSON, and never raw values.
- Token conventions (scales, naming, line-heights, build detail): `.claude/rules/tokens.md`.

## Figma

- A **token** is a committed DTCG value (source of truth). A **variable** is its downstream mirror in a Figma collection.
- **Code is the source of truth, not Figma** (ADR-002 amendment). A value invented in Figma is a proposal until it lands in `primitives.json` via PR. Never overwrite primitives from Figma without diffing against current usage.
- Representational divergences are not drift: Figma can't store unitless values, so line-heights always differ. The brand layer is not mirrored; Figma holds the default brand only (ADR-012).

## Components

Code lives in `packages/components/src/components/<Name>/` (`index.tsx`, `<Name>.module.css`, `<Name>.stories.tsx`, `<Name>.metadata.json`, `<Name>.spec.json`). Per-component knowledge lives **only** in `metadata.json` / `spec.json`, validated by `packages/components/component.schema.json` and `component.spec.schema.json` (ADR-001). Never add a per-component rules file (ADR-029). Implementation conventions: `.claude/rules/components.md`.

**Fixed set.** Never add a component outside it unless the scope is explicitly expanded; compose existing ones instead.
- Core: `Box`, `Stack`, `Inline`, `Text`, `Heading`, `Icon`, `Button`, `TextField`, `Select`, `Checkbox`, `Card`.
- Phase 5b: `Avatar`, `AppHeader`, `Breadcrumb`, `Divider`, `ProgressBar`, `CardHorizontal`.
- Phase 5c: `CardVertical`, `Chip`, `VideoFrame`, `ButtonArrow`, `ScrollArea`.
- Phase 5d: `Accordion`, `Badge`, `Image`, `DropdownMenu`, `TextLink`; `Button` `transparent` variant (ghost, ADR-024); `useSlider` hook (no component).
- `Icon` wraps a small fixed set of inline SVGs (no icon library); glyphs use `currentColor` and size via `size.*` tokens.

**Before proposing a new component file (ADR-009):** (1) same semantic role → prop/variant on the existing component; (2) different role despite similar shape → new component; (3) single parent, no other consumer → element internal to the parent's CSS Module. Visual similarity alone never justifies creating or merging components. Parts (`<Parent.Part>`) are not new components (ADR-023).

## Layout grammar

Every page maps Figma structure to HTML landmarks (ADR-011). Validate with `npm run layout:validate <file>`.
- Exactly one `<Box as="main">` per route; every `<Box as="section">` has an accessible name (`aria-labelledby` → its `Heading`); every extra `<nav>` has a unique `aria-label`.
- **Inline styles** only for `.container`/`.grid` classNames. Column fill and size constraints use Box/Stack's `grow` / `minWidth` / `maxWidth` / `minHeight` / `maxHeight` props, never hand-written `style={{ flex: … }}`. Forbidden: raw color (use `<Text color=…>` / `<Heading>`), raw token values outside `var()`, arbitrary CSS that belongs in a CSS Module.
- Rely on device tokens for responsive spacing/typography; reflow via `.grid` or `Inline wrap`. Never hand-write `@media` in layout files.

## Code conventions

- No comments unless the why is non-obvious. Prefer explicit over clever.
- No defensive error handling for internal paths; validate only at external boundaries (Figma API responses, Airtable webhooks).
- Naming: token files lowercase, no spaces (`primitives.json`); scripts `kebab-case.js`/`.ts`; components `PascalCase/index.tsx` with co-located styles.

## Where to look

- **Decisions:** `docs/decisions/NNN-*.md`. Read the ADR that governs a thing before changing it.
- **Current state:** `.claude/STATUS_QUO.md`, `.claude/component-pipeline.json`, and `packages/tokens/{airtable-governance,token-usage,figma-variables}.json`. Read the committed files, never the live APIs. Regenerate with `npm run sense`.
- **Gates:** `npm run metadata:validate && npm run typecheck && npm run build && npm run a11y:coverage && npm run a11y:test`; `npm run lint`. CI (`components-check.yml`) runs them on every PR.
- **Human docs:** `docs/` (Starlight site) and Storybook.
