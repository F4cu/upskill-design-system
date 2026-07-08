# npm scripts reference

Every npm script available at the repo root, grouped by what it's for. These cover the full maintenance loop: building tokens into CSS/JS outputs, developing and documenting components, keeping local snapshots fresh, validating, and syncing Airtable with the committed token source.

None of these require an LLM. For tasks that need judgment — Figma drift reconciliation, token deprecation, component scaffolding, layout generation — see the agentic moments in `.claude/commands/` (indexed in `CLAUDE.md`).

**Naming grammar.** The first segment is the system or subject a command acts on. Cross-system operations are namespaced by their **destination** — `airtable:*` writes to or reads from Airtable — so the target is never ambiguous (a hypothetical Figma push would be `figma:*`, distinct from `tokens:*`, which is local token work only). **Composite scripts** (marked 🔶) chain other scripts in order; the "Runs" note lists the children so you can trace them without opening `package.json`.

Airtable commands require `AIRTABLE_API_KEY` in your environment. Copy `.env.example` to `.env` and fill it in for local runs; CI reads it from repository secrets.

---

## Build

| Command | What it does |
|---|---|
| `npm run build` 🔶 | Full build in dependency order. **Runs:** `tokens:build` → components build. |
| `npm run tokens:build` | Style Dictionary only — transforms DTCG JSON into CSS custom properties and JS/TS constants. |
| `npm run typecheck` | TypeScript check on the components package (no emit). |

Run `tokens:build` after any change to `packages/tokens/src/` and before committing — components consume the built output, not the source JSON.

---

## Development

| Command | What it does |
|---|---|
| `npm run storybook` | Start Storybook at `localhost:6006` — component dev environment and token showcase. |
| `npm run storybook:build` | Static Storybook build (used in CI for the visual regression baseline). |
| `npm run pipeline-dashboard` | Start the `apps/showcase` Pipeline Health Dashboard (`/dashboard`, `/pipeline`) at `localhost:5176`. |

---

## Local token analysis

`tokens:*` is local token work only — never a write to an external system.

| Command | What it does |
|---|---|
| `npm run tokens:usage` | Scan the repo for token references → `packages/tokens/token-usage.json` (`var(--ds-*)` in component CSS + `{alias}` refs in theme/device JSON). |
| `npm run tokens:diff` | Diff built CSS between two `dist` directories and emit a Markdown summary. Usage: `npm run tokens:diff -- <base-dist> <head-dist>`; run with no args to print usage. `tokens-check.yml` invokes the underlying `scripts/token-diff.js` on every PR to post/update the token-diff comment. |

---

## Airtable sync

Airtable is the governance layer — it holds ownership, status, and successor fields per token and per component. These commands are one-directional and namespaced by destination. Within the namespace: **`push:*`** upserts the current snapshot as-is; **`sync:*`** refreshes the snapshot first, then pushes.

| Command | What it does |
|---|---|
| `npm run airtable:push:primitives` | Upsert primitive tokens (`primitives.json`). |
| `npm run airtable:push:semantic` | Upsert semantic tokens (`theme/light.json`, `theme/dark.json`). |
| `npm run airtable:push:device` | Upsert device tokens (`device/*.json`). |
| `npm run airtable:push:components` | Upsert component metadata (maturity axis) — pushes the current snapshot without refreshing it. |
| `npm run airtable:sync:components` 🔶 | Refresh the snapshot, then push components. **Runs:** `sense` → `airtable:push:components`. Prefer this over the raw `push` so you don't ship a stale snapshot. |
| `npm run airtable:sync:all` 🔶 | Push every layer in sequence. **Runs:** `airtable:push:primitives` → `:semantic` → `:device` → `airtable:sync:components` (sense-first, matching the standalone). Use after a build that changed multiple layers. |
| `npm run airtable:pull:governance` | Pull governance state from Airtable → `packages/tokens/airtable-governance.json`. |
| `npm run airtable:setup` | One-off: create the governance fields in Airtable (run once per new base). |

`airtable:pull:governance` should be run before any deprecation work — `airtable-governance.json` is what CI and agents read for token status, owner, and successor. Do not read governance state via the Airtable MCP; always use the committed file.

---

## Local snapshots (sensing)

The "frozen-memory" files agents and CI read instead of hitting live APIs. All pure aggregation — no AI, no network.

| Command | What it does |
|---|---|
| `npm run sense` | Aggregate the committed mirror files (`airtable-governance.json`, `token-usage.json`, `figma-variables.json`) into `.claude/STATUS_QUO.md` and `.claude/component-pipeline.json`. Regenerate before a loop run. |
| `npm run sense:component` | Narrow the baseline to one component → `.claude/handoff/runs/<Name>.snapshot.json`. Usage: `npm run sense:component -- <Name>`. |
| `npm run pipeline:status` | Capture CI workflow status (`tokens-check`, `components-check`, `sync-tokens` — latest run on `main`) and open issues via `gh api` → `.claude/pipeline-status.json`. Requires the `gh` CLI already authenticated. Run manually before deploy — never in a loop, never at app runtime. |

---

## Validation & accessibility

| Command | What it does |
|---|---|
| `npm run metadata:validate` | Validate all `*.metadata.json` files against `component.schema.json`. |
| `npm run layout:validate` | Validate layout files against the landmark grammar (ADR-011): one `<main>`, named `<section>`s, labelled `<nav>`s, fixed-set components only. Accepts a file or directory: `npm run layout:validate -- <path>`. |
| `npm run lint` | ESLint over `packages/components/src` (includes Tier-1 `jsx-a11y` static checks). |
| `npm run a11y:coverage` | Tier-2 completeness gate (ADR-008): fails if any interactive component lacks its behavioral `<Name>.a11y.test.tsx`. |
| `npm run a11y:test` | Run the behavioral a11y tests (Vitest + Testing Library + `vitest-axe`). |

`metadata:validate`, `typecheck`, `build`, `a11y:coverage`, and `a11y:test` run automatically in `components-check.yml` on every PR. Run them locally before pushing a new component.

---

## Component workflow

| Command | What it does |
|---|---|
| `npm run component:check` 🔶 | The deterministic gate for a new/changed component. **Runs:** `metadata:validate` → `typecheck` → `build`, then prints the next steps (preview in Storybook, then `component:refresh`). |
| `npm run component:refresh` 🔶 | Refresh local snapshots after the change lands. **Runs:** `tokens:usage` → `sense`. *(Local refresh only — unrelated to the `airtable:*` pushes.)* |
