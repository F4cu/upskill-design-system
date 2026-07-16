---
sources:
  - package.json
  - apps/showcase/package.json
  - apps/showcase/scripts/copy-pipeline-data.js
  - .github/workflows/*.yml
# clock reset 2026-07-10: CI-audit workflows (#57-#60) merged; this page's rewrite in #61 already describes the end state (lint gate, sync.yml, weekly pull, showcase-check)
---
# CLI reference

Every command here runs via `npm run <name>` — there's no separate mechanism for "CLI scripts" vs. "npm scripts." The distinction that actually matters is **who the output is for**: most commands are pipeline plumbing (they build, sync, or aggregate, and the result is a committed file consumed by CI or the next script in the chain); a smaller set — `status`, `status:board`, `status:component` — renders a terminal view for a human, live, nothing written to disk. Both kinds are grouped together below by subject, since that's how you'll look them up, but the "When it runs" column tells you which kind you're looking at.

These cover the full maintenance loop: building tokens into CSS/JS outputs, developing and documenting components, keeping local snapshots fresh, validating, and syncing Airtable with the committed token source. None of these require an LLM. For tasks that need judgment — Figma drift reconciliation, token deprecation, component scaffolding, layout generation — see the [agentic moments](06-agentic-moments.md) defined in `.claude/commands/` and indexed in `CLAUDE.md`.

**When commands run.** Each table has a "When it runs" column. Commands fall into three patterns: **you type it** (a manual step at a specific point in your workflow), **CI runs it** (GitHub Actions executes it automatically on a pull request or on a push to `main` — you only run it locally to catch problems before CI does), or **both**. "PR" below means a pull request on GitHub; "on `main`" means it fires automatically whenever matching files land on the main branch.

**Naming grammar.** The first segment is the system or subject a command acts on. Cross-system operations are namespaced by their **destination** — `airtable:*` writes to or reads from Airtable — so the target is never ambiguous (a hypothetical Figma push would be `figma:*`, distinct from `tokens:*`, which is local token work only). **Composite scripts** (marked 🔶) chain other scripts in order; the "Runs" note lists the children so you can trace them without opening `package.json`.

Airtable commands require `AIRTABLE_API_KEY` in your environment. Copy `.env.example` to `.env` and fill it in for local runs; CI reads it from repository secrets.

---

## Orientation: what you'll actually type

The tables below are the full reference — most entries are composite children, CI-only gates, or rare one-offs you'll look up rather than memorize. If you just need the shortlist of commands you'll run by hand regularly, roughly in the order a normal change touches them:

| Command | When you reach for it |
|---|---|
| `npm run storybook` | Start the dev environment. |
| `npm run tokens:build` | After editing anything in `packages/tokens/src/`. |
| `npm run build` | Before pushing component or token changes. |
| `npm run typecheck` / `npm run lint` | Before pushing component changes. |
| `npm run a11y:coverage` / `npm run a11y:test` / `npm run a11y:stories` | Before pushing a new or changed interactive component. |
| `npm run metadata:validate` | After editing a `*.metadata.json`. |
| `npm run layout:validate -- <path>` | After hand-editing a layout file. |
| `npm run screenshot:check` / `npm run screenshot:approve` | After a visual change, to catch or accept pixel diffs. |
| `npm run status` / `status:board` / `status:component -- <Name>` | Any time you want a quick read on where things stand. |
| `npm run sense` | Before kicking off an agent loop. |
| `npm run docs:check` / `npm run claudemd:check` | After touching a doc's declared source, or `CLAUDE.md`. |
| `npm run handoff:tidy` | After finishing the work a handoff describes. |

Everything else either runs itself — a composite child chained by one of the commands above, or a step CI fires on every PR/push to `main` — or is a rare, deliberate one-off (`airtable:setup`, `harness:run`). The "When it runs" column in each table below tells you which bucket a given command falls into.

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
| `npm run pipeline-dashboard` | Start the [Pipeline Health Dashboard](#showcase-app-data-ingestion) (`/dashboard`, `/pipeline`) at `localhost:5176`. | You type it whenever you want to view the dashboard locally. |

---

## Local token analysis

`tokens:*` is local token work only — never a write to an external system.

| Command | What it does | When it runs |
|---|---|---|
| `npm run tokens:usage` | Scan the repo for token references → `packages/tokens/token-usage.json` (`var(--ds-*)` in component CSS + `{alias}` refs in theme/device JSON). | You type it after adding or removing token references in components; the post-merge sync (`sync.yml`) also refreshes and recommits it automatically on `main`. |
| `npm run tokens:contrast-check` | Tier-3 WCAG contrast math over the built theme CSS (see [Accessibility](03-accessibility.md)). | CI runs it on every PR touching token source (`tokens-check.yml`); you type it before committing any color change to catch failures early. |
| `npm run tokens:deprecations` | Mirror Airtable deprecation state (`packages/tokens/airtable-governance.json`) into the DTCG `$deprecated` property on the affected leaf in `primitives.json`/`theme/{light,dark}.json` (see [Governance](05-governance.md)). | Automatic: chained onto `airtable:pull:governance`. You type it standalone only to re-run the mirror without re-pulling from Airtable. |
| `npm run tokens:deprecations:check` | `--check` variant of the above: fails if committed `$deprecated` markers are out of sync with governance, without writing. | CI runs it on every PR touching token source (`tokens-check.yml`); you type it to verify before committing a governance-affecting change. |

Token diffs have no npm alias: CI calls `scripts/token-diff.js` directly on every token PR to post/update the token-diff comment. For an ad-hoc comparison of two builds, run `node scripts/token-diff.js <base-dist> <head-dist>` (no args prints usage).

---

## Airtable sync

Airtable is the [governance layer](05-governance.md) — it holds ownership, status, and successor fields per token and per component. These commands are one-directional and namespaced by destination. Within the namespace: **`push:*`** [upserts](08-glossary.md) the current snapshot as-is; **`sync:*`** refreshes the snapshot first, then pushes.

| Command | What it does | When it runs |
|---|---|---|
| `npm run airtable:push:primitives` | Upsert primitive tokens (`primitives.json`). | Automatic: the post-merge sync (`sync.yml`) runs it on every push to `main` that touches token or component source. You type it only for a one-off re-push. |
| `npm run airtable:push:semantic` | Upsert semantic tokens (`theme/light.json`, `theme/dark.json`). | Same as above — automatic on `main`, manual only for a re-push. |
| `npm run airtable:push:device` | Upsert device tokens (`device/*.json`). | Same as above — automatic on `main`, manual only for a re-push. |
| `npm run airtable:push:components` | Upsert component metadata (maturity axis) — pushes the current snapshot without refreshing it. | Rarely by hand — prefer `airtable:sync:components`. CI runs the equivalent (sense, then push) on `main`. |
| `npm run airtable:sync:components` 🔶 | Refresh the snapshot, then push components. **Runs:** `sense` → `airtable:push:components`. Prefer this over the raw `push` so you don't ship a stale snapshot. | You type it when you want Airtable updated now instead of waiting for the next push to `main`. |
| `npm run airtable:sync:all` 🔶 | Push every layer in sequence. **Runs:** `airtable:push:primitives` → `:semantic` → `:device` → `airtable:sync:components` (sense-first, matching the standalone). | You type it after a change that touched multiple token layers at once, or to rebuild the Airtable mirror from scratch. |
| `npm run airtable:pull:governance` 🔶 | Pull governance state from Airtable → `packages/tokens/airtable-governance.json` + `.claude/component-signoff.json`, then mirror deprecation state into the DTCG `$deprecated` property on affected token source. **Runs:** `airtable-pull.js` → `token-deprecation-mirror.js`. | Automatic: `airtable-pull.yml` runs it weekly (Mon 06:00 UTC) and commits changes. You type it when you need fresh governance state *now* — e.g. right before deprecation work after changing status/owner/successor in Airtable. |
| `npm run airtable:setup` | One-off: create the governance fields in Airtable. | Once per new Airtable base, then never again — kept for base rebuilds, not part of any workflow. |

`airtable:pull:governance` should be run before any deprecation work — `airtable-governance.json` is what CI and agents read for token status, owner, and successor. Do not read governance state via the Airtable MCP; always use the committed file.

---

## Local snapshots (sensing)

The ["frozen-memory" files](06-agentic-moments.md) agents and CI read instead of hitting live APIs. All pure aggregation — no AI, no network.

| Command | What it does | When it runs |
|---|---|---|
| `npm run sense` | Aggregate the committed mirror files (`airtable-governance.json`, `token-usage.json`, `figma-variables.json`) into `.claude/STATUS_QUO.md` and `.claude/component-pipeline.json`, merging local review artifacts over the committed `.claude/component-review-state.json` baseline (reviews and `visualReview` records are never regressed by CI — ADR-015 amendment). | You type it before any agent loop run; it also runs inside `airtable:sync:components`, and the post-merge sync (`sync.yml`) runs it on `main` and recommits the refreshed snapshots. |
| `npm run sense:component` | Narrow the baseline to one component → `.claude/handoff/runs/<Name>.snapshot.json`. Usage: `npm run sense:component -- <Name>`. | You type it (or `/add-component` does) at the start of a per-component loop run. |
| `npm run pipeline:status` | Capture CI workflow status + open issues from GitHub → `.claude/pipeline-status.json` (via the `gh` CLI). One of the five files the [showcase dashboard](#showcase-app-data-ingestion) reads. | You type it before deploying the showcase, or whenever the dashboard's CI/issues panel looks out of date. Never runs automatically. |
| `npm run patterns:generate` | Deterministic AST (abstract syntax tree — a parsed representation of the component source code's structure) + metadata scan of all components → `.claude/component-patterns.json`, the cross-component pattern aggregate consumed by `/layout-generation` (ADR-013). | You type it after changing a component's structure or ARIA wiring; CI regenerates it on every component PR and fails if the committed file is stale. |

### Reading the snapshots in the terminal

`scripts/status.js` renders the snapshots above as terminal views — a dumb reader, no AI, no network, no state written. Run `npm run sense` first if the snapshots are stale.

| Command | What it does |
|---|---|
| `npm run status` | Dashboard: component totals by stage/maturity/type, token counts per layer, governance summary, and the latest five token adds/edits (replayed from git history of `packages/tokens/src`). |
| `npm run status:board` | Per-component review table — the `STATUS_QUO.md` checklist table with ✓/○/– marks. (Named `board`, not `pipeline`, to avoid colliding with the unrelated `pipeline:status` GitHub snapshot above.) |
| `npm run status:component` | One component's checklist card plus its suggested next step. Usage: `npm run status:component -- <Name>`. |

---

## Validation & accessibility

| Command | What it does | When it runs |
|---|---|---|
| `npm run metadata:validate` | Validate all `*.metadata.json` files against `component.schema.json`. | CI runs it on every component PR; you type it after editing any metadata file. |
| `npm run layout:validate` | Validate layout files against the [landmark grammar](04-layout-grammar.md) (ADR-011): one `<main>`, named `<section>`s, labelled `<nav>`s, fixed-set components only. Accepts a file or directory: `npm run layout:validate -- <path>`. | You type it after creating or hand-editing a layout file; `/layout-generation` runs it as its gate, and CI runs it over `apps/showcase/src/pages` on every showcase PR (`showcase-check.yml`). |
| `npm run lint` | ESLint over `packages/components/src` (includes Tier-1 `jsx-a11y` static checks). | CI runs it on every component PR (`components-check.yml`); you type it before pushing component changes. |
| `npm run a11y:coverage` | Tier-2 completeness gate (ADR-008): fails if any interactive component lacks its behavioral `<Name>.a11y.test.tsx`. | CI runs it on every component PR; you type it before pushing a new interactive component. |
| `npm run a11y:test` | Run the behavioral a11y tests (Vitest + Testing Library + `vitest-axe`). | CI runs it on every component PR; you type it after changing any interactive behavior. |
| `npm run a11y:stories` | Automatic axe sweep over every story's initial render (ADR-008 amendment 2026-07-14, issue #72): composes all `*.stories.tsx` via portable stories in jsdom and runs axe on each, `color-contrast` disabled. Skip or tune a story with `parameters.a11y` on the story itself. | CI runs it on every component PR (`components-check.yml`); you type it after adding or changing a story. |
| `npm run screenshot:check` | Perceptual diff of fresh component screenshots against committed baselines (ADR-019). Enumerates every component's canonical `--default` story in light + dark (viewport 1440×900, full-page), diffs via pixelmatch (threshold 0.1; 0.01% pixel tolerance locally where renders are deterministic, `SCREENSHOT_DIFF_RATIO` overrides — CI uses 1% for cross-OS antialiasing), prints per-story results, writes diff PNGs to gitignored `.diff/`. Requires a running Storybook (`STORYBOOK_URL`, default `http://localhost:6006`). Fails (exit 1) on any FAIL, missing/orphaned baseline, story count mismatch, or console error. | Advisory step in `components-check.yml` on every component PR (`continue-on-error: true`) — ubuntu antialiasing may exceed local threshold until baselines are tuned. You type it locally after building Storybook to verify a component change hasn't shifted pixels unintentionally. |
| `npm run screenshot:approve [-- --component <Name>]` | Regenerate baseline PNGs (all 54, or one component's light+dark pair) and prune orphaned baselines. Intended for use after an intentional visual change to re-baseline. | You type it after a visual change is approved (e.g. a token value edit, a component style fix) to update the reference. Use `-- --component Button` to re-baseline a single component's pair instead of all. |

`metadata:validate`, `typecheck`, `build`, `a11y:coverage`, `a11y:test`, and `a11y:stories` run automatically in `components-check.yml` on every PR. Run them locally before pushing a new component. `screenshot:check` runs advisory on the same gate at a loosened 1% ratio; promote to blocking only once CI diff ratios prove quiet against ubuntu antialiasing drift (see ADR-019 escalation path).

---

## Docs & context hygiene

The self-documenting side of the system: two gates that keep the human docs and the agent instructions from silently rotting. Both run in `docs-check.yml` on **every** PR (no path filter — any file could be a doc's source, and the checks cost seconds).

| Command | What it does | When it runs |
|---|---|---|
| `npm run docs:check` | Staleness gate for the `docs/` site. Each `docs/NN-*.md` declares its load-bearing source files in frontmatter; the check fails when any source has a commit newer than the doc — i.e. the thing the doc describes changed after the doc was last touched. Detection only; the rewrite is `/docs-sync`. | CI runs it on every PR; you type it when `/docs-sync` seems warranted or after changing anything a doc declares as a source. |
| `npm run claudemd:check` | Context-budget gate for `CLAUDE.md` (ADR-017): fails if it exceeds 200 lines / 20KB, and if any `.claude/rules/*.md` lacks `paths:` frontmatter (a rule without paths loads into every session, defeating the budget). | CI runs it on every PR; you type it after editing `CLAUDE.md` or adding a rules file, before committing. |

---

## Handoff & telemetry

Housekeeping for `.claude/handoff/` (see [agentic moments](06-agentic-moments.md)) and the measurement harness behind ADR-013's "patterns help layouts, hurt scaffolds" finding.

| Command | What it does | When it runs |
|---|---|---|
| `npm run handoff:tidy` | Archive `done`/`superseded` handoffs, regenerate `handoff/index.json`, and promote per-run `.run.json` telemetry into the committed `run-ledger.json`. | You type it after finishing the work a handoff describes; `/extract-learnings` runs it as its close-out step. Deliberately never CI. |
| `npm run harness:run` | Pattern-accuracy A/B harness: invokes `claude -p` headlessly per task, one arm with per-component metadata only, one arm with `component-patterns.json` added, then scores both. **Costs LLM usage** — the only script in this file that does. | You type it only when re-evaluating whether `component-patterns.json` earns its context cost (e.g. after the component set grows substantially). Rare and deliberate. |
| `npm run harness:score` | The deterministic scorer for harness output — pre-registered gates plus a mechanical trap checklist, no LLM. | Runs inside `harness:run`; you type it standalone only to re-score an existing run. |

---

## Component workflow

The former `component:check` / `component:refresh` composites are gone. The deterministic gate for a new or changed component is the explicit chain — `npm run metadata:validate && npm run typecheck && npm run build && npm run a11y:coverage && npm run a11y:test` — which is what `/add-component` and CI (`components-check.yml`) run. The post-change snapshot refresh (`tokens:usage` → `sense`) now happens automatically on `main` via the post-merge sync (`sync.yml`); run those two scripts by hand only when an agent loop needs fresh snapshots before the merge lands.
