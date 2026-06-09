# UpSkill Design System

## Project purpose

A learning-first design system. The goal is hands-on experience with the full token pipeline stack: Figma → token export → Style Dictionary build → CSS/JS outputs → coded components. Secondary goals include integrating GitHub automation, Airtable as a token dictionary / documentation layer, and eventually agentic loops that keep tokens, docs, and components in sync.

The roadmap has three phases:
1. **Infrastructure** — token pipeline, Style Dictionary, monorepo wiring, CI/CD skeleton, Figma/Airtable integrations
2. **Automation** — GitHub Actions for token sync, Airtable webhooks, PR bots, changelog generation
3. **Agentic loops** — Claude-driven flows for token drift detection, documentation generation, component scaffolding

## Repository layout

npm workspaces monorepo. Two packages today, more may follow.

```
upskill-design-system/
├── packages/
│   ├── tokens/       @upskill/tokens  — W3C DTCG JSON, Style Dictionary build (planned)
│   └── components/   @upskill/components  — coded components, depends on tokens
└── package.json      workspace root, shared scripts
```

Run `npm install` from the root. Scripts are workspace-aware (`npm run build:tokens`).

## Token architecture

### Three-layer model

Tokens resolve in this fixed order — later layers override earlier ones:

| Layer | Files | Purpose |
|---|---|---|
| Primitives | `primitives.json` | Raw, context-free values. Single source of truth. Synced from Figma. |
| Theme | `theme/light.json`, `theme/dark.json` | Semantic color aliases. Reference primitives via `{path.to.token}`. |
| Device | `device/desktop.json`, `device/tablet.json`, `device/mobile.json` | Responsive spacing, grid, typography per breakpoint. |

Breakpoints: desktop ≥ 1440px, tablet ≥ 768px, mobile < 768px.

### Token format (W3C DTCG)

Every token uses `$type` and `$value`. Aliases use curly-brace syntax. No `$extensions` — strip them on export.

```json
{ "$type": "color", "$value": "#D15D50" }          // concrete value
{ "$type": "color", "$value": "{color.terracotta.9}" }  // alias
```

### Primitive color scales

Each hue has three sub-scales. Don't mix scales on the same token:
- `1–12` — light-mode scale (backgrounds → text)
- `dark-1` through `dark-12` — dark-mode scale
- `alpha-1` through `alpha-12` — transparent variants of the mid-tone

Current hues: `terracotta` (brand), `cyan`, `gold`, `teal`, `sand`, `grey`, `black`, `white`, `amber`.

### Line-height convention

Line-heights are **unitless ratios** (`1`, `1.25`, `1.4`, `1.5`, `1.75`). Never use fixed px values — the ratio adapts to any font size automatically.

## Style Dictionary build (planned)

The `@upskill/tokens` build step will use Style Dictionary to transform DTCG tokens into:
- CSS custom properties (dimensions converted to `rem`)
- JS/TS constants
- Tailwind theme extension

Config will live at `packages/tokens/style-dictionary.config.js`. Until then, `npm run build:tokens` prints a placeholder.

## Figma sync

Tokens are exported from Figma variables (Variables REST API or plugin). The cleanup step:
- Strips `$extensions` blocks entirely
- Converts Figma sRGB component objects → hex strings
- Preserves alias references in `{path.to.token}` format

Do not commit `$extensions` to source. If a Figma export lands them in, strip before committing.

## Integrations (planned)

| Tool | Role |
|---|---|
| **Figma** | Source of truth for primitives. Export → clean → commit. |
| **Airtable** | Token inventory and governance layer. Each token gets a record tracking ownership, status, usage guidelines, and change history. Distinct from Style Dictionary — Airtable is for people (who owns this token, is it deprecated?), not for builds. |
| **GitHub Actions** | CI for token validation, automated Airtable sync on merge, PR comments with token diffs. |
| **Style Dictionary** | Build system: DTCG JSON → CSS, JS, Tailwind. |
| **Storybook** | Component documentation, visual playground, token showcase, and visual regression baseline. |

## Storybook

Storybook lives in `packages/components` — it is the documentation layer for coded components, not a separate package.

### Purpose in this system

- **Component development environment** — isolated rendering during build
- **Living documentation** — stories are the canonical usage examples, not a README
- **Token visualization** — a dedicated story (or addon) shows the full token palette, spacing scale, and typography ramp
- **Visual regression baseline** — screenshots captured per story for CI diffing (Chromatic or equivalent, planned)

### Recommended addons

| Addon | Why |
|---|---|
| `@storybook/addon-docs` | Auto-generates docs pages from JSDoc + controls |
| `@storybook/addon-a11y` | Accessibility audit per story |
| `@storybook/addon-themes` | Toggle light/dark theme via toolbar — maps to `theme/light` vs `theme/dark` token sets |
| `storybook-design-token` | Renders token groups as visual swatches directly in Storybook |

### Story conventions

- One story file per component: `ComponentName.stories.tsx` co-located with the component
- Always export a `Default` story; add named variants for meaningful states (not every prop permutation)
- Use `args` + `argTypes` so controls work — no hard-coded prop values in stories
- Dark mode toggle should switch the CSS class/data attribute that activates `theme/dark.json` tokens, not just Storybook's background

### Token showcase story

A `packages/components/src/tokens/Tokens.stories.tsx` file should render the full token inventory — color swatches grouped by hue and scale, spacing scale, typography ramp, border radii. This story has no component to test; its only job is to make tokens visible and reviewable in the browser.

## Coding conventions

### Token JSON
- Keys use `kebab-case` for multi-word names (`border-radius`, `font-size`, `line-height`)
- Numeric scale steps use plain numbers as string keys (`"1"` through `"12"`, `"100"` through `"800"`)
- No trailing commas (strict JSON)
- Aliases always prefer the deepest available primitive path (`{color.terracotta.9}` not `{color.terracotta}`)

### JavaScript / TypeScript (components package, scripts)
- No comments unless the why is non-obvious
- No defensive error handling for internal paths — only validate at external boundaries (Figma API responses, Airtable webhooks)
- Prefer explicit over clever

### File naming
- Token source files: lowercase, no spaces (`primitives.json`, `light.json`)
- Scripts: `kebab-case.js` or `.ts`
- Components: `PascalCase/index.tsx` with co-located styles

## Common tasks

### Add a new primitive token
Edit `packages/tokens/src/primitives.json`. Follow the existing structure for the category (`color`, `space`, `font`, etc.). Add `$type` and `$value`. Rebuild tokens if Style Dictionary is wired up.

### Add a semantic alias
Edit the appropriate `theme/` or `device/` file. Use `{path.to.primitive}` syntax. Do not add raw values to these files — they should only alias primitives.

### Re-export tokens from Figma
1. Export using the Variables REST API or a plugin
2. Run the cleanup script to strip `$extensions` and convert colors
3. Replace `packages/tokens/src/primitives.json`
4. Rebuild and verify no alias references broke

### Add a coded component
Work in `packages/components/src/`. Import tokens from `@upskill/tokens` (once the build is wired). Components should not hard-code any design values — everything comes through tokens.

### Wire up Style Dictionary
Install `style-dictionary` in `@upskill/tokens`. Write `style-dictionary.config.js` with a DTCG-compatible parser and three output platforms (CSS, JS, Tailwind). Replace the placeholder `build` script.

### Add a GitHub Action
Place workflow YAML in `.github/workflows/`. For token validation, run Style Dictionary build as a check. For Airtable sync, trigger on merge to main using the Airtable REST API.

### Set up Storybook
Install Storybook in `packages/components` with `npx storybook@latest init`. Choose the framework matching the component library (React + Vite is the default choice). Add `@storybook/addon-themes` and configure it to toggle a `data-theme` attribute so stories switch between the light and dark token sets. Add `storybook-design-token` and point it at the Style Dictionary CSS output so token swatches render automatically.

### Add a story for a component
Create `ComponentName.stories.tsx` next to the component file. Export `meta` with `title`, `component`, and `argTypes`. Export at least a `Default` story using `args`. If the component has meaningful visual states (error, disabled, loading), add a named story per state.

### Add the token showcase story
Create `packages/components/src/tokens/Tokens.stories.tsx`. Import the CSS token file (once Style Dictionary is wired) and render swatches by iterating over CSS custom properties or the JS constants export. Group by category: colors (grouped by hue), spacing, typography, border radii.
