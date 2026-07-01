# CLI reference

Every npm script available at the repo root, grouped by what it's for. These cover the full maintenance loop: building tokens into CSS/JS outputs, developing and documenting components, keeping local snapshots fresh, validating, and syncing Airtable with the committed token source.

None of these require an LLM. For tasks that need judgment — Figma drift reconciliation, token deprecation, component scaffolding, layout generation — see the agentic moments in `.claude/commands/` (indexed in `CLAUDE.md`).

**Composite scripts** (marked 🔶) just chain other scripts in order — the "Runs" note lists the children so you can trace them without opening `package.json`. Everything else is a primitive that runs one script.

Airtable commands require `AIRTABLE_API_KEY` in your environment. Copy `.env.example` to `.env` and fill it in for local runs; CI reads it from repository secrets.

> **Naming note:** the script namespace currently mixes two grammars (`sync:tokens:push` vs `validate:metadata`), and `component:sync` (refresh *local* snapshots) is unrelated to the `sync:*` Airtable pushes despite the shared word. A namespace-first rename is deferred to its own pass; until then, this doc is the source of truth for what each name actually does.

---

## Build

| Command | What it does |
|---|---|
| `npm run build` 🔶 | Full build in dependency order. **Runs:** `build:tokens` → components build. |
| `npm run build:tokens` | Style Dictionary only — transforms DTCG JSON into CSS custom properties and JS/TS constants. |
| `npm run typecheck` | TypeScript check on the components package (no emit). |

Run `build:tokens` after any change to `packages/tokens/src/` and before committing — components consume the built output, not the source JSON.

---

## Development

| Command | What it does |
|---|---|
| `npm run storybook` | Start Storybook at `localhost:6006` — component dev environment and token showcase. |
| `npm run build:storybook` | Static Storybook build (used in CI for the visual regression baseline). |

---

## Tokens → Airtable sync

Airtable is the governance layer — it holds ownership, status, and successor fields per token and per component. These scripts are one-directional: they **push** from the committed JSON source into Airtable, or **pull** governance state back into committed files.

| Command | What it does |
|---|---|
| `npm run sync:tokens:push` | Upsert primitive tokens (`primitives.json`) to Airtable. |
| `npm run sync:semantic:push` | Upsert semantic tokens (`theme/light.json`, `theme/dark.json`). |
| `npm run sync:device:push` | Upsert device tokens (`device/*.json`). |
| `npm run sync:components:push` | Upsert component metadata (maturity axis) to Airtable. Pushes whatever is in the current snapshot — does **not** refresh it first. |
| `npm run sync:components` 🔶 | Refresh the snapshot, then push components. **Runs:** `sense` → `sync:components:push`. Prefer this over the bare `:push` so you don't ship a stale snapshot. |
| `npm run sync:all:push` 🔶 | Push every layer in sequence. **Runs:** `sync:tokens:push` → `sync:semantic:push` → `sync:device:push` → `sync:components` (sense-first, matching the standalone). Use after a build that changed multiple layers. |
| `npm run governance:pull` | Pull governance state from Airtable → `packages/tokens/governance.json`. |
| `npm run governance:setup` | One-off: create the governance fields in Airtable (run once per new base). |

`governance:pull` should be run before any deprecation work — `governance.json` is what CI and agents read for token status, owner, and successor. Do not read governance state via the Airtable MCP; always use the committed file.

---

## Local snapshots (sensing)

The "frozen-memory" files agents and CI read instead of hitting live APIs. All pure aggregation — no AI, no network.

| Command | What it does |
|---|---|
| `npm run sense` | Aggregate the committed mirror files (`governance.json`, `token-usage.json`, `figma-variables.json`) into `.claude/STATUS_QUO.md` and `.claude/component-pipeline.json`. Regenerate before a loop run. |
| `npm run sense:component` | Narrow the baseline to one component → `.claude/handoff/<Name>.snapshot.json`. Usage: `npm run sense:component -- <Name>`. |
| `npm run token-usage` | Scan the repo for token references → `packages/tokens/token-usage.json` (`var(--ds-*)` in component CSS + `{alias}` refs in theme/device JSON). |
| `npm run component:sync` 🔶 | Refresh local snapshots after a component change. **Runs:** `token-usage` → `sense`. *(Local refresh only — unrelated to the `sync:*` Airtable pushes above.)* |

---

## Validation & accessibility

| Command | What it does |
|---|---|
| `npm run validate:metadata` | Validate all `*.metadata.json` files against `component.schema.json`. |
| `npm run validate:layout` | Validate layout files against the landmark grammar (ADR-011): one `<main>`, named `<section>`s, labelled `<nav>`s, fixed-set components only. Accepts a file or directory: `npm run validate:layout -- <path>`. |
| `npm run lint` | ESLint over `packages/components/src` (includes Tier-1 `jsx-a11y` static checks). |
| `npm run a11y:coverage` | Tier-2 completeness gate (ADR-008): fails if any interactive component lacks its behavioral `<Name>.a11y.test.tsx`. |
| `npm run test:a11y` | Run the behavioral a11y tests (Vitest + Testing Library + `vitest-axe`). |

`validate:metadata`, `typecheck`, `build`, `a11y:coverage`, and `test:a11y` run automatically in `components-check.yml` on every PR. Run them locally before pushing a new component.

---

## Component workflow

| Command | What it does |
|---|---|
| `npm run component:check` 🔶 | The deterministic gate for a new/changed component. **Runs:** `validate:metadata` → `typecheck` → `build`, then prints the next steps (preview in Storybook, then `component:sync`). |
| `npm run component:sync` 🔶 | Refresh snapshots after the change lands — see *Local snapshots* above. **Runs:** `token-usage` → `sense`. |

---

## Token diff

| Command | What it does |
|---|---|
| `npm run tokens:diff` | Diff built CSS between two `dist` directories and emit a Markdown summary. Usage: `npm run tokens:diff -- <base-dist> <head-dist>`; run with no args to print usage. `tokens-check.yml` invokes the underlying `scripts/token-diff.js` on every PR to post/update the token-diff comment. |
