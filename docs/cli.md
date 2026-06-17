# CLI reference

These are the npm scripts available at the repo root. They cover the full maintenance loop for this design system: building tokens into CSS/JS outputs, developing and documenting components, and keeping Airtable in sync with the committed token source.

None of these require an LLM. For tasks that do need judgment — drift reconciliation with Figma, token deprecation, component scaffolding, layout generation — see the agentic moments defined in `.claude/commands/`.

Airtable commands require `AIRTABLE_API_KEY` in your environment. Copy `.env.example` to `.env` and fill it in for local runs; CI reads it from repository secrets.

---

## Build

| Command | What it does |
|---|---|
| `npm run build` | Full build: tokens then components (in dependency order) |
| `npm run build:tokens` | Style Dictionary only — transforms DTCG JSON into CSS custom properties and JS/TS constants |
| `npm run typecheck` | TypeScript check on the components package (no emit) |

Run `build:tokens` after any change to `packages/tokens/src/` and before committing — components consume the built output, not the source JSON.

---

## Development

| Command | What it does |
|---|---|
| `npm run storybook` | Start Storybook at `localhost:6006` — component dev environment and token showcase |
| `npm run build:storybook` | Static Storybook build (used in CI for visual regression baseline) |

---

## Airtable sync

Airtable is the governance layer — it holds ownership, status, and successor fields per token. These scripts are one-directional: they push from the committed JSON source into Airtable, or pull governance state back into `governance.json`.

| Command | What it does |
|---|---|
| `npm run sync:tokens:push` | Upsert primitive tokens (`primitives.json`) to Airtable |
| `npm run sync:semantic:push` | Upsert semantic tokens (`theme/light.json`, `theme/dark.json`) |
| `npm run sync:device:push` | Upsert device tokens (`device/*.json`) |
| `npm run sync:all:push` | All three in sequence — use after a token build that changes multiple layers |
| `npm run governance:pull` | Pull governance state from Airtable → `packages/tokens/governance.json` |
| `npm run governance:setup` | One-off: create the governance fields in Airtable (run once per new base) |

`governance:pull` should be run before any deprecation work — `governance.json` is what CI and agents read for token status, owner, and successor. Do not read governance state via the Airtable MCP; always use the committed file.

---

## Validation and analysis

| Command | What it does |
|---|---|
| `npm run validate:metadata` | Validate all `*.metadata.json` files against `component.schema.json` |
| `npm run token-usage` | Report which design tokens are referenced in component CSS |

`validate:metadata` and `typecheck` run automatically in `components-check.yml` on every PR. Run them locally before pushing a new component.
