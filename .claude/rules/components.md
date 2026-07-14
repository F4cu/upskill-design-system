---
paths:
  - packages/components/**
---

# Component rules

Loaded only when working under `packages/components/`. Cross-cutting policy (component scope, agentic moments, git workflow) stays in CLAUDE.md.

## CSS Modules

- One `.module.css` file per component, co-located with the component
- Only reference SD-output custom properties (`var(--token-name)`) — never raw values
- Class names use `camelCase` inside the module (e.g. `.primaryButton`)
- No global styles in component modules — globals (reset, base typography, grid) live in `packages/components/src/styles/`

## Component implementation rules (scaffold and layout generation)

- **Typography:** Any string prop that renders as visible UI text (title, subtitle, label, description, and similar) must be passed through `<Text>` or `<Heading>` — never rendered as a raw string, `<span>`, or `<p>`. Use `as` on the typography component to adjust the semantic element when needed. The exact `size` and `color` values are component-specific — read the component's `usage.antiPatterns` in its metadata for the correct values.
- **Icon color:** `<Icon>` inherits its color via `currentColor`. Never set a color prop or inline style directly on `<Icon>`. Apply the semantic color token on the ancestor element that owns the color context. The specific token is documented in the composing component's `usage.antiPatterns`.
- **Component-specific rules:** Before generating a component's JSX, read its `usage.antiPatterns` — they capture both usage mistakes and implementation constraints (e.g. which library component to use for a prop, which token to apply to a specific element).
- **Type-enforced anti-patterns:** When a component's metadata documents a hard constraint (e.g. "never pass onClick", "never set color directly"), the prop type must make the violation a TypeScript error, not just a documented anti-pattern — narrow the spread native-attributes type (e.g. `Omit<HTMLAttributes<...>, 'onClick' | 'color' | ...>`) to exclude the attributes the component already owns or forbids, rather than only excluding `children`.

## Storybook setup and story conventions

Storybook lives in this package — it is the documentation layer for coded components. Installed: React + Vite framework, `@storybook/addon-themes` toggling `data-theme` (activates `theme/light` vs `theme/dark` token sets), a custom brand toolbar (global `brand`, toggling `data-brand` — `@storybook/addon-themes` only supports one `withThemeByDataAttribute` instance, so brand switching is a separate `globalTypes` + decorator in `.storybook/preview.ts`), MDX token showcase stories (colors by hue, spacing, typography, radii), visual regression baselines (ADR-019: each component's canonical `--default` story in light+dark, committed PNGs in `packages/components/screenshots/`, perceptual diff via `npm run screenshot:check` / re-baseline with `npm run screenshot:approve` or `npm run screenshot:approve -- --component <Name>` after intentional visual change).

- One story file per component: `ComponentName.stories.tsx` co-located with the component
- Always export a `Default` story; add named variants for meaningful states (not every prop permutation)
- Use `args` + `argTypes` so controls work — no hard-coded prop values in stories
- Dark mode must switch the `data-theme` attribute that activates `theme/dark.json` tokens, not just Storybook's background

## Component metadata model

This convention is shared by `/component-scaffold`, `/layout-generation`, and metadata validation. `*.metadata.json` is validated against `component.schema.json` by `scripts/validate-metadata.js`. Variants are modelled as **named axes**: `variants` is an object keyed by axis name (`variant`, `size`, `shape`, …), each axis holding `{ options, default, purpose }`. A component with a single visual axis uses one key named `variant`; `default` may be `null` for an axis that is off unless set (e.g. Button `shape`). `tokens` keys are fixed: `color`, `spacing`, `typography`, `borderRadius`, `other`. `component.category` ∈ `atom|molecule|organism|layout`, `component.type` ∈ `interactive|display|container|input`, `component.status` ∈ `beta|ready|deprecated`. `composition.accepts`/`containedBy` and `usage.patterns` are required for layout generation.

After scaffolding or editing a component, `npm run metadata:validate`, `npm run typecheck`, `npm run build`, `npm run a11y:coverage`, and `npm run a11y:test` must all pass with no manual changes, and it must render in both light and dark themes in Storybook (`components-check.yml` runs these on every PR). Following the pattern needs no ADR; a deviation — a new variant-axis convention, a token category the schema lacks, or a change to the schema itself — requires recording or amending an ADR before merging.

## Two-tier a11y (ADR-008), plus a third token-level check (ADR-008 amendment)

Tier 1 is static `jsx-a11y` lint (`npm run lint`), default for all components. Tier 2 is a **behavioral** a11y test — a co-located `<Name>.a11y.test.tsx` (Vitest + Testing Library + `vitest-axe`, jsdom) asserting the dynamic ARIA contract (state attributes toggling, focus, keyboard) plus an axe scan — required **only for interactive components**. `scripts/a11y-coverage.js` derives interactivity from metadata (`component.type ∈ {interactive, input}`, an interactive ARIA `role`, or a keyboard contract beyond plain Tab / native scroll) and fails if an interactive component lacks its test. Non-interactive components (display/landmark, e.g. `Badge`, `Divider`) need none. Model new tests on `Button/Button.a11y.test.tsx`; disable axe's `color-contrast` rule (jsdom can't judge layout/colour). `scripts/a11y-backlog.json` is a shrinking ledger waiving pre-existing interactive components pending backfill; never add a new component to it.

The color-contrast gap that leaves open (jsdom can't compute it) is covered separately and automatically: `npm run tokens:contrast-check` (`scripts/token-contrast-check.js`) computes WCAG relative-luminance contrast ratios against the **built** `dist/css/theme.{light,dark}.css`, for a hand-curated set of foreground/background pairs reflecting how components actually render (not every token combination that could theoretically occur — see the file's header comment for why an automated CSS-co-occurrence derivation was tried and rejected). Wired into `tokens-check.yml` on every PR touching token source. Add a pair to the curated `PAIRS` list when a component changes what text/icon/border color renders against what background. Known, tracked failures live in `scripts/token-contrast-waivers.json` (same shrinking-ledger convention as the a11y backlog) rather than being silently dropped or silently forced through a token change.
