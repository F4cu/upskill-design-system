# UpSkill Design System

## Project purpose

A learning-first, **lite agentic** design system for a small SaaS product. Lite means: a fixed, small component set (layout primitives, typography, Button, form inputs, Card — nothing more), and economic maintenance — recurring automation is scripts + GitHub Actions with direct REST calls; MCP servers are for one-off interactive tasks only; agent involvement is limited to four defined moments (see "Agentic moments"). One person must be able to maintain the whole system.

Pipeline: Figma → token export → Style Dictionary build → CSS/JS outputs → coded components, with Airtable as the governance layer and GitHub Actions as the automation layer. See `ROADMAP.md` for phase status and exit conditions.

## Repository layout

npm workspaces monorepo.

```
upskill-design-system/
├── packages/
│   ├── tokens/       @upskill/tokens — W3C DTCG JSON → Style Dictionary → CSS + JS/TS outputs
│   └── components/   @upskill/components — React + Vite + TS, Storybook, CSS Modules
├── scripts/          airtable-sync.js and other repo-level automation
├── .mcp.json         MCP server config (see "MCP tools" before using any of them)
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

## Style Dictionary build (built)

`npm run build:tokens` transforms DTCG source into:
- CSS custom properties — dimensions converted to `rem`; desktop device tokens land in `:root`, tablet/mobile are wrapped in `@media` blocks in a single CSS file
- JS/TS constants

Config: `packages/tokens/style-dictionary.config.js`. Custom transforms in place: px→rem, font-weight string→numeric, `$root` rename, media query combiner. When changing token structure, run the build and check both outputs before committing — components only ever consume the built output, never source JSON.

## Figma sync

Primitives are exported from Figma variables. The cleanup step:
- Strips `$extensions` blocks entirely
- Converts Figma sRGB component objects → hex strings
- Preserves alias references in `{path.to.token}` format

Do not commit `$extensions` to source. If a Figma export lands them in, strip before committing. Before replacing `primitives.json`, run the Figma token audit (see "Agentic moments") — never overwrite primitives without diffing against current usage.

## Integrations

| Tool | Role | Status |
|---|---|---|
| **Style Dictionary** | Build system: DTCG JSON → CSS custom properties, JS/TS constants. Custom transforms for rem, font-weight, `$root`, media queries. | Built |
| **Storybook** | Component documentation, token showcase (MDX stories: colors, spacing, typography, radii), light/dark via `addon-themes` + `data-theme`. | Built |
| **GitHub Actions** | Token build check on PR (`tokens-check.yml`); Airtable sync on merge to main (`sync-tokens.yml`). | Built |
| **Airtable sync (code → Airtable)** | `scripts/airtable-sync.js` upserts primitives/semantic/device tokens to three tables via REST. One-directional. Runs in CI on merge. | Built |
| **Airtable governance (Airtable → code)** | `status` (`active`\|`deprecated`) / `owner` / `successor` (dot-path, e.g. `color.terracotta.9`; nullable) / `notes` fields per token, pulled to `governance.json` by script. Run `scripts/airtable-pull.js` manually before deprecation work until Phase 6 automates it. | Planned (Phase 2) |
| **Figma → code flow** | Variables export + audit before replacing primitives; Code Connect mappings for components. | Planned (Phases 4, 7) |
| **PR token diff comment, changelog** | Deterministic scripts in Actions. | Planned (Phase 6) |
| **Component metadata** | JSON schema + example file exist; consumed by agentic moments. | Schema built; consumers planned |

## MCP tools — when to use vs when to avoid

General rule: MCP calls are for **interactive, one-off tasks with the developer present**. Anything recurring, scheduled, or CI-bound uses a script with direct REST calls. Never put an MCP call inside a GitHub Action or a loop over many records.

| MCP | Use it for | Do NOT use it for |
|---|---|---|
| **Figma** | (1) Reading variables/design context during the Figma token audit. (2) Code Connect mapping and design context when scaffolding a component. | Recurring token export — that's the Variables REST API via script. Bulk-reading many nodes. |
| **Airtable** | (1) One-off schema changes (adding governance fields). (2) Ad-hoc inspection of a few records when debugging sync. | Token sync (use `scripts/airtable-sync.js`). Reading governance state in tasks — read the committed `governance.json` instead. Bulk record operations. |
| **GitHub** | Rarely — cross-repo searches the `gh` CLI handles awkwardly. | Everything else. Prefer `gh` CLI for PRs, issues, API calls; it's already authenticated and scriptable. |
| **Google Drive** | Fetching a spec or brief the user explicitly links. | Anything recurring; storing or syncing project docs. |
| **Notion** | Fetching planning notes the user explicitly links. | A documentation target — docs live in Storybook (components) and Airtable (tokens). |

If a task could be done with a committed file, a script, or the `gh` CLI, do it that way even when an MCP tool is available.

## Agentic moments

The only scenarios where invoking Claude with MCP context is worth the cost. All developer-triggered, defined as prompts in `.claude/commands/`. Everything else is a script or a GitHub Action.

1. **Figma token audit** — before replacing `primitives.json` with a fresh Figma export. Read Figma variables (MCP) + committed tokens + token usage report; produce a diff report (removed/renamed tokens with usages, broken aliases, scale mixing, naming violations), then the cleaned export as a PR.
2. **Token deprecation pass** — after tokens are marked deprecated in Airtable. Read `governance.json` + token usage report + component metadata (no MCP needed); produce a migration PR replacing usages with the `successor` token.
3. **Component scaffold** — when starting a new component from the fixed set. Read the metadata schema + an existing component as template + Figma design context (MCP); produce the component folder (index, CSS Module, stories, metadata) and a Code Connect mapping.
4. **Layout generation** — when starting a new page or section. Read all component metadata files (`relationships.accepts`, `relationships.containedBy`, `relationships.compositionPatterns`, `relationships.layoutBehavior`) + a one-paragraph layout brief; produce a React component tree using only library components and tokens, with each structural choice annotated by the metadata rule or compositionPattern that justified it. No MCP needed. Success signal: the tree passes structural validation (accepts/containedBy constraints), builds, and renders in Storybook without manual restructuring.

If asked to set up a continuous agent loop, scheduled agent run, or always-on watcher: push back — that contradicts the lite-agentic constraint. Propose a script or one of these moments instead.

## Storybook

Storybook lives in `packages/components` — it is the documentation layer for coded components, not a separate package. Installed: React + Vite framework, `@storybook/addon-themes` toggling `data-theme` (activates `theme/light` vs `theme/dark` token sets), MDX token showcase stories (colors by hue, spacing, typography, radii). Pending: `storybook-design-token` wired to SD CSS output, visual regression baseline (Chromatic or equivalent).

### Purpose in this system

- **Component development environment** — isolated rendering during build
- **Living documentation** — stories are the canonical usage examples, not a README
- **Token visualization** — the MDX showcase stories make tokens visible and reviewable in the browser
- **Visual regression baseline** — screenshots per story for CI diffing (planned)

### Story conventions

- One story file per component: `ComponentName.stories.tsx` co-located with the component
- Always export a `Default` story; add named variants for meaningful states (not every prop permutation)
- Use `args` + `argTypes` so controls work — no hard-coded prop values in stories
- Dark mode must switch the `data-theme` attribute that activates `theme/dark.json` tokens, not just Storybook's background

## Coding conventions

### Token JSON
- Keys use `kebab-case` for multi-word names (`border-radius`, `font-size`, `line-height`)
- Numeric scale steps use plain numbers as string keys (`"1"` through `"12"`, `"100"` through `"800"`)
- No trailing commas (strict JSON)
- Aliases always prefer the deepest available primitive path (`{color.terracotta.9}` not `{color.terracotta}`)

### CSS Modules (components package)
- One `.module.css` file per component, co-located with the component
- Only reference SD-output custom properties (`var(--token-name)`) — never raw values
- Class names use `camelCase` inside the module (e.g. `.primaryButton`)
- No global styles in component modules — globals (reset, base typography, grid) live in `packages/components/src/styles/`

### JavaScript / TypeScript (components package, scripts)
- No comments unless the why is non-obvious
- No defensive error handling for internal paths — only validate at external boundaries (Figma API responses, Airtable webhooks)
- Prefer explicit over clever

### File naming
- Token source files: lowercase, no spaces (`primitives.json`, `light.json`)
- Scripts: `kebab-case.js` or `.ts`
- Components: `PascalCase/index.tsx` with co-located styles

### Component scope
The component set is fixed: `Box`, `Stack`, `Inline`, `Text`, `Heading`, `Icon`, `Button`, `TextField`, `Select`, `Checkbox`, `Card`. Do not add components outside this list without the user explicitly expanding the scope — compose existing ones instead. `Icon` wraps a small fixed set of inline SVGs (no icon-library dependency); glyphs use `currentColor` and size via `size.*` tokens.

## Common tasks

### Add a new primitive token
Edit `packages/tokens/src/primitives.json`. Follow the existing structure for the category (`color`, `space`, `font`, etc.). Add `$type` and `$value`. Run `npm run build:tokens` and verify the CSS and JS outputs.

### Add a semantic alias
Edit the appropriate `theme/` or `device/` file. Use `{path.to.primitive}` syntax. Do not add raw values to these files — they should only alias primitives.

### Re-export tokens from Figma
1. Run the Figma token audit (agentic moment 1) to diff the export against committed tokens and current usage
2. Run the cleanup script to strip `$extensions` and convert colors
3. Replace `packages/tokens/src/primitives.json`
4. Rebuild and verify no alias references broke

### Add a coded component
Only from the fixed set above. Work in `packages/components/src/components/ComponentName/`. Use `Button` as the template for interactive components, `Box` for layout primitives, `Text` for typography. Every component requires four files:

1. **`index.tsx`** — typed props matching `variants.options` and `states` in the metadata schema. Use a `cssVars` object to pass prop-driven values as CSS custom properties (`--_name`). Spread `...rest` for native HTML attributes. No hard-coded design values — all values through tokens.
2. **`ComponentName.module.css`** — one rule per variant + state combination; only `var(--ds-*)` custom properties from the SD output; class names in `camelCase`. Private CSS vars (`--_*`) for prop-driven overrides; token vars (`--ds-*`) for fixed design values.
3. **`ComponentName.stories.tsx`** — export `meta` with `title`, `component`, `argTypes`. Export a `Default` story using `args`. Add one named story per meaningful visual state (disabled, error, etc.). Dark mode switches via `data-theme` on the story container, not Storybook background.
4. **`ComponentName.metadata.json`** — fill every field from the schema (`component.schema.json`). `figmaNodeId` is the Figma component set node ID if one exists, or a note if the component uses text styles or Code Connect is unavailable (requires Figma Enterprise). `relationships.accepts`/`containedBy` and `compositionPatterns` are required for the layout-generation agentic moment.

After creating the files: `npm run build` and `npm run storybook` must both pass with no manual changes. Verify the component renders in both light and dark themes.

### Add a story for a component
Create `ComponentName.stories.tsx` next to the component file. Export `meta` with `title`, `component`, and `argTypes`. Export at least a `Default` story using `args`. Add a named story per meaningful visual state (error, disabled, loading).

### Modify the Style Dictionary build
Edit `packages/tokens/style-dictionary.config.js`. Custom transforms live alongside it (px→rem, font-weight, `$root` rename, media query combiner). After any change, rebuild and diff the CSS output — transform changes can silently rename custom properties that components depend on.

### Sync tokens to Airtable
Run `scripts/airtable-sync.js` (requires the Airtable API key in env). It upserts to the three token tables via REST. Do not replicate this with Airtable MCP calls.

### Pull governance state from Airtable
Run `scripts/airtable-pull.js` (requires the Airtable API key in env) to update `packages/tokens/governance.json`. Do this before any deprecation work — the file is the source of truth for token status, owner, and successor that agents and CI read. The `successor` field uses a dot-path to the replacement token (e.g. `color.terracotta.9`); it is nullable when a deprecated token has no direct replacement. Do not read governance state via Airtable MCP — always read the committed file.

### Add a GitHub Action
Place workflow YAML in `.github/workflows/`. Actions call scripts and REST APIs directly — never MCP tools and never Claude. If a proposed Action seems to need judgment rather than a deterministic check, it belongs in "Agentic moments" instead.
