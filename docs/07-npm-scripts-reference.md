---
sources:
  - package.json
  - apps/showcase/package.json
  - apps/showcase/scripts/copy-pipeline-data.js
  - .github/workflows/tokens-check.yml
  - .github/workflows/components-check.yml
  - .github/workflows/sync-tokens.yml
  - .github/workflows/docs-check.yml
# clock reset 2026-07-10: check workflows gain concurrency/PR-only triggers and lint joins components-check; prose rewrite for these rides in the script-tidy PR (#61)
---
# npm scripts reference

Every npm script available at the repo root, grouped by what it's for. These cover the full maintenance loop: building tokens into CSS/JS outputs, developing and documenting components, keeping local snapshots fresh, validating, and syncing Airtable with the committed token source.

None of these require an LLM. For tasks that need judgment — Figma drift reconciliation, token deprecation, component scaffolding, layout generation — see the [agentic moments](06-agentic-moments.md) defined in `.claude/commands/` and indexed in `CLAUDE.md`.

**When commands run.** Each table has a "When it runs" column. Commands fall into three patterns: **you type it** (a manual step at a specific point in your workflow), **CI runs it** (GitHub Actions executes it automatically on a pull request or on a push to `main` — you only run it locally to catch problems before CI does), or **both**. "PR" below means a pull request on GitHub; "on `main`" means it fires automatically whenever matching files land on the main branch.

**Naming grammar.** The first segment is the system or subject a command acts on. Cross-system operations are namespaced by their **destination** — `airtable:*` writes to or reads from Airtable — so the target is never ambiguous (a hypothetical Figma push would be `figma:*`, distinct from `tokens:*`, which is local token work only). **Composite scripts** (marked 🔶) chain other scripts in order; the "Runs" note lists the children so you can trace them without opening `package.json`.

Airtable commands require `AIRTABLE_API_KEY` in your environment. Copy `.env.example` to `.env` and fill it in for local runs; CI reads it from repository secrets.

---

## Build

| Command | What it does | When it runs |
|---|---|---|
| `npm run build` 🔶 | Full build in dependency order. **Runs:** `tokens:build` → components build. | You type it before pushing component or token changes; CI runs the same steps on every component PR (`components-check.yml`). |
| `npm run tokens:build` | Style Dictionary only — transforms DTCG JSON into CSS custom properties and JS/TS constants. | You type it after editing anything in `packages/tokens/src/`, before committing; CI also runs it on every token PR (`tokens-check.yml`). |
| `npm run typecheck` | TypeScript check on the components package (no emit). | You type it before pushing component changes; CI runs it on every component PR. |

Run `tokens:build` after any change to `packages/tokens/src/` and before committing — components consume the built output, not the source JSON (see [Token pipeline](01-token-pipeline.md)).

---

## Showcase app data ingestion

`apps/showcase`'s Pipeline Health Dashboard (`/dashboard`, `/pipeline`) reads five committed frozen snapshot files — `.claude/component-pipeline.json`, `packages/tokens/airtable-governance.json`, `packages/tokens/token-usage.json`, `packages/tokens/figma-variables.json`, `.claude/pipeline-status.json`. It never fetches GitHub/Airtable/Figma at runtime; that would violate the frozen-memory rule these files exist to enforce.

`apps/showcase/scripts/copy-pipeline-data.js` copies whichever of those five files exist into `apps/showcase/src/data/`, wired as `predev`/`prebuild` npm scripts inside `apps/showcase/package.json` (npm runs `pre*` hooks automatically before the matching script — no separate invocation needed). The app then `import`s from `src/data/` like any other local module, keeping Vite/tsc rootDir scoped to the app instead of reaching outside it. `src/data/` is gitignored (`apps/showcase/.gitignore`) — it's a build artifact of copying already-committed source, regenerated every `npm run dev`/`npm run build`, never hand-edited or committed itself. A missing source file is now a hard failure: the script exits non-zero with an error naming the command that regenerates it (e.g. `npm run sense`, `npm run pipeline:status`). Since all five files are committed, this only occurs on histories where a snapshot never existed.

---

## Development

| Command | What it does | When it runs |
|---|---|---|
| `npm run storybook` | Start Storybook at `localhost:6006` — component dev environment and token showcase. | You type it whenever you want to develop or preview components in the browser. Leave it running while you work. |
| `npm run storybook:build` | Static Storybook build (used in CI for the visual regression baseline). | Mostly CI; you type it only to verify the static build works before a release-like change. |
| `npm run pipeline-dashboard` | Start the [Pipeline Health Dashboard](#showcase-app-data-ingestion) (`/dashboard`, `/pipeline`) at `localhost:5176`. | You type it whenever you want to view the dashboard locally. |

---

## Local token analysis

`tokens:*` is local token work only — never a write to an external system.

| Command | What it does | When it runs |
|---|---|---|
| `npm run tokens:usage` | Scan the repo for token references → `packages/tokens/token-usage.json` (`var(--ds-*)` in component CSS + `{alias}` refs in theme/device JSON). | You type it after adding or removing token references in components — or let `component:refresh` run it for you. |
| `npm run tokens:diff` | Diff built CSS between two `dist` directories and emit a Markdown summary. Usage: `npm run tokens:diff -- <base-dist> <head-dist>`; run with no args to print usage. | CI runs the underlying `scripts/token-diff.js` on every token PR to post/update the token-diff comment; you type it only for an ad-hoc comparison of two builds. |
| `npm run tokens:contrast-check` | Tier-3 WCAG contrast math over the built theme CSS (see [Accessibility](03-accessibility.md)). | CI runs it on every PR touching token source (`tokens-check.yml`); you type it before committing any color change to catch failures early. |

---

## Airtable sync

Airtable is the [governance layer](05-governance.md) — it holds ownership, status, and successor fields per token and per component. These commands are one-directional and namespaced by destination. Within the namespace: **`push:*`** [upserts](08-glossary.md) the current snapshot as-is; **`sync:*`** refreshes the snapshot first, then pushes.

| Command | What it does | When it runs |
|---|---|---|
| `npm run airtable:push:primitives` | Upsert primitive tokens (`primitives.json`). | Automatic: `sync-tokens.yml` runs it on every push to `main` that touches token source. You type it only for a one-off re-push. |
| `npm run airtable:push:semantic` | Upsert semantic tokens (`theme/light.json`, `theme/dark.json`). | Same as above — automatic on `main`, manual only for a re-push. |
| `npm run airtable:push:device` | Upsert device tokens (`device/*.json`). | Same as above — automatic on `main`, manual only for a re-push. |
| `npm run airtable:push:components` | Upsert component metadata (maturity axis) — pushes the current snapshot without refreshing it. | Rarely by hand — prefer `airtable:sync:components`. CI runs the equivalent (sense, then push) on `main`. |
| `npm run airtable:sync:components` 🔶 | Refresh the snapshot, then push components. **Runs:** `sense` → `airtable:push:components`. Prefer this over the raw `push` so you don't ship a stale snapshot. | You type it when you want Airtable updated now instead of waiting for the next push to `main`. |
| `npm run airtable:sync:all` 🔶 | Push every layer in sequence. **Runs:** `airtable:push:primitives` → `:semantic` → `:device` → `airtable:sync:components` (sense-first, matching the standalone). | You type it after a change that touched multiple token layers at once, or to rebuild the Airtable mirror from scratch. |
| `npm run airtable:pull:governance` | Pull governance state from Airtable → `packages/tokens/airtable-governance.json`. | You type it before any token-deprecation work, or whenever someone changed status/owner/successor fields in Airtable. |
| `npm run airtable:setup` | One-off: create the governance fields in Airtable. | Once per new Airtable base, then never again. |

`airtable:pull:governance` should be run before any deprecation work — `airtable-governance.json` is what CI and agents read for token status, owner, and successor. Do not read governance state via the Airtable MCP; always use the committed file.

---

## Local snapshots (sensing)

The ["frozen-memory" files](06-agentic-moments.md) agents and CI read instead of hitting live APIs. All pure aggregation — no AI, no network.

| Command | What it does | When it runs |
|---|---|---|
| `npm run sense` | Aggregate the committed mirror files (`airtable-governance.json`, `token-usage.json`, `figma-variables.json`) into `.claude/STATUS_QUO.md` and `.claude/component-pipeline.json`. | You type it before any agent loop run; it also runs inside `component:refresh` and `airtable:sync:components`, and CI runs it on `main` as part of `sync-tokens.yml`. |
| `npm run sense:component` | Narrow the baseline to one component → `.claude/handoff/runs/<Name>.snapshot.json`. Usage: `npm run sense:component -- <Name>`. | You type it (or `/add-component` does) at the start of a per-component loop run. |
| `npm run pipeline:status` | Capture CI workflow status + open issues from GitHub → `.claude/pipeline-status.json` (via the `gh` CLI). One of the five files the [showcase dashboard](#showcase-app-data-ingestion) reads. | You type it before deploying the showcase, or whenever the dashboard's CI/issues panel looks out of date. Never runs automatically. |
| `npm run patterns:generate` | Deterministic AST (abstract syntax tree — a parsed representation of the component source code's structure) + metadata scan of all components → `.claude/component-patterns.json`, the cross-component pattern aggregate consumed by `/layout-generation` (ADR-013). | You type it after changing a component's structure or ARIA wiring; CI regenerates it on every component PR and fails if the committed file is stale. |

---

## Validation & accessibility

| Command | What it does | When it runs |
|---|---|---|
| `npm run metadata:validate` | Validate all `*.metadata.json` files against `component.schema.json`. | CI runs it on every component PR; you type it (or `component:check` does) after editing any metadata file. |
| `npm run layout:validate` | Validate layout files against the [landmark grammar](04-layout-grammar.md) (ADR-011): one `<main>`, named `<section>`s, labelled `<nav>`s, fixed-set components only. Accepts a file or directory: `npm run layout:validate -- <path>`. | You type it after creating or hand-editing a layout file; `/layout-generation` runs it as its gate. |
| `npm run lint` | ESLint over `packages/components/src` (includes Tier-1 `jsx-a11y` static checks). | You type it before pushing component changes — this one is local-only, no CI backstop. |
| `npm run a11y:coverage` | Tier-2 completeness gate (ADR-008): fails if any interactive component lacks its behavioral `<Name>.a11y.test.tsx`. | CI runs it on every component PR; you type it before pushing a new interactive component. |
| `npm run a11y:test` | Run the behavioral a11y tests (Vitest + Testing Library + `vitest-axe`). | CI runs it on every component PR; you type it after changing any interactive behavior. |

`metadata:validate`, `typecheck`, `build`, `a11y:coverage`, and `a11y:test` run automatically in `components-check.yml` on every PR. Run them locally before pushing a new component.

---

## Docs & context hygiene

The self-documenting side of the system: two gates that keep the human docs and the agent instructions from silently rotting. Both run in `docs-check.yml` on **every** PR and push to `main` (no path filter — any file could be a doc's source, and the checks cost seconds).

| Command | What it does | When it runs |
|---|---|---|
| `npm run docs:check` | Staleness gate for the `docs/` site. Each `docs/NN-*.md` declares its load-bearing source files in frontmatter; the check fails when any source has a commit newer than the doc — i.e. the thing the doc describes changed after the doc was last touched. Detection only; the rewrite is `/docs-sync`. | CI runs it on every PR; you type it when `/docs-sync` seems warranted or after changing anything a doc declares as a source. |
| `npm run claudemd:check` | Context-budget gate for `CLAUDE.md` (ADR-017): fails if it exceeds 200 lines / 20KB, and if any `.claude/rules/*.md` lacks `paths:` frontmatter (a rule without paths loads into every session, defeating the budget). | CI runs it on every PR; you type it after editing `CLAUDE.md` or adding a rules file, before committing. |

---

## Handoff & telemetry

Housekeeping for `.claude/handoff/` (see [agentic moments](06-agentic-moments.md)) and the measurement harness behind ADR-013's "patterns help layouts, hurt scaffolds" finding.

| Command | What it does | When it runs |
|---|---|---|
| `npm run handoff:tidy` | Archive `done`/`superseded` handoffs, regenerate `handoff/index.json`, and promote per-run `.run.json` telemetry into the committed `run-ledger.json`. | You type it after finishing the work a handoff describes, or periodically when the handoff directory accumulates closed items. Never automatic. |
| `npm run harness:run` | Pattern-accuracy A/B harness: invokes `claude -p` headlessly per task, one arm with per-component metadata only, one arm with `component-patterns.json` added, then scores both. **Costs LLM usage** — the only script in this file that does. | You type it only when re-evaluating whether `component-patterns.json` earns its context cost (e.g. after the component set grows substantially). Rare and deliberate. |
| `npm run harness:score` | The deterministic scorer for harness output — pre-registered gates plus a mechanical trap checklist, no LLM. | Runs inside `harness:run`; you type it standalone only to re-score an existing run. |

---

## Component workflow

| Command | What it does | When it runs |
|---|---|---|
| `npm run component:check` 🔶 | The deterministic gate for a new/changed component. **Runs:** `metadata:validate` → `typecheck` → `build`, then prints the next steps (preview in Storybook, then `component:refresh`). | You type it after scaffolding or changing a component, before previewing in Storybook or opening a PR. `/add-component` runs it as its gate. |
| `npm run component:refresh` 🔶 | Refresh local snapshots after the change lands. **Runs:** `tokens:usage` → `sense`. *(Local refresh only — unrelated to the `airtable:*` pushes.)* | You type it once the component change is confirmed working — the last step of the component workflow. |
