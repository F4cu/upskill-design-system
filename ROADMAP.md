# UpSkill Design System — Roadmap

Progress tracker. `[x]` done · `[-]` in progress · `[ ]` not started. Each phase is sized for 1–2 focused sessions and ends with an exit condition — don't start the next phase until the current one meets it.

## What "lite agentic" means here

Lite in two ways:

1. **Small surface.** The library targets one SaaS product with a few simple pages. The final component set is fixed: `Box`, `Stack`, `Inline`, `Text`, `Heading`, `Icon`, `Button`, form inputs (`TextField`, `Select`, `Checkbox`), and `Card`. Nothing more — a new component needs a reason a composition of these can't cover.
2. **Economic to maintain.** No orchestration layer, no always-on agents, no scheduled loops. Recurring automation is plain scripts and GitHub Actions calling REST APIs directly. MCP servers are reserved for interactive one-off tasks with a human in the loop — they are expensive per call and each one is maintenance surface.

"Agentic" means a small, fixed set of **developer-triggered moments** where Claude reads structured context the repo already provides (token JSON, component metadata, Airtable governance state, Figma variables) and produces something a script can't: an audit, a migration plan, a scaffold. Three moments are defined (Phase 7). Each has a named trigger, declared inputs, a concrete output, and a success signal. Anything that needs to run on every PR or merge is a script, not an agent. The whole system stays readable and maintainable by one person.

---

## Phase 1 — Infrastructure *(done)*

Monorepo + npm workspaces; DTCG token JSON (primitives, theme, device); Style Dictionary with custom transforms (px→rem, font-weight, `$root`, media query combiner); CSS custom properties + JS/TS outputs; Storybook with `addon-themes` light/dark toggle and MDX token showcase stories; GitHub Actions token build check on PR.

**Exit condition (met):** `npm run tokens:build` produces CSS + JS outputs; Storybook renders the token inventory in light and dark.

## Phase 1.5 — Token Foundation Review *(done)*

Component metadata schema defined (JSON per component). Device layer cleaned: `layout.headerLayout` removed; `layout.min-width.column` and `layout.min-height.slider` kept (active Figma bindings). ADRs recorded: layout tokens as values (not CSS properties); `space` vs `size` split. Semantic token names audited for intent vs raw scale position.

**Exit condition (met):** naming audit complete; token names stable for components and Airtable.

## Phase 2 — Agentic Foundation *(done)*

Airtable governance fields (`status`, `owner`, `successor`, `notes`); `scripts/airtable-pull.js` → `airtable-governance.json`; `scripts/token-usage.js` → `token-usage.json`. Metadata schema validated end-to-end. Six agentic-moment prompt files written to `.claude/commands/`.

**Exit condition (met):** Claude can answer token status + usages from committed files with zero MCP calls; layout briefs produce valid React trees from metadata alone.

## Phase 3 — Component API Foundation *(done)*

CSS reset, `grid.css`, `typography.css` global utilities. Layout primitives: `Box` (polymorphic, inset padding), `Stack` (vertical flex), `Inline` (horizontal flex), `ScrollArea` (hidden-scrollbar overflow, added retroactively in Phase 5c — see ADR-006). Storybook grid/layout stories.

`storybook-design-token` wiring blocked: npm workspace version conflict (Storybook 8 at root vs 10 in components). Token showcase already handled by existing MDX stories; revisit on Storybook version unification.

**Exit condition (met):** sample page layout renders using only `Box`/`Stack`/`Inline` and the grid utility — no ad-hoc CSS.

## Phase 4 — Core Components *(done)*

`Text`, `Heading`, `Icon`, `Button` — semantic tokens, interaction states, size variants, leading icon. Metadata files per component. Code Connect omitted — requires Figma Org/Enterprise plan; not in scope.

**Exit condition (met):** all four components render in both themes with stories and metadata.

## Phase 5 — Component Library *(done)*

Full fixed component set built across four batches. Library frozen at **27 components + 2 hooks** (`useCarousel`, `useSlider`). The batches below cover 24; `DropdownMenu` and `Image` (added 2026-06-18) and `TextLink` (added 2026-06-30) landed as explicit scope expansions after the batch plan was written.

| Batch | Components |
|---|---|
| Core (5) | `TextField`, `Select`, `Checkbox`, `Card` |
| User Settings (5b) | `Avatar`, `AppHeader`, `Breadcrumb`, `Divider`, `ProgressBar`, `CardHorizontal` |
| Homepage (5c) | `CardVertical`, `Chip`, `VideoFrame`, `ButtonArrow` |
| Course Overview (5d) | `Accordion`, `Badge`, `Button` ghost variant + trailing icon, `useSlider` hook |

Composed example stories: Settings Form, Footer Highlights, Carousel, CourseSlider. `Accordion` and `Badge` shipped through the `/add-component` loop (Phase 9 pilot). `ScrollArea` added retroactively in 5c as a scroll primitive underpinning the carousel pattern (ADR-006).

**Exit condition (met):** all components render in both themes with stories and metadata; library frozen — growth by composition only.

## Phase 6 — Automation (scripts and Actions only — no MCP, no agents)

- [x] GH Action: run `airtable-sync.js` on merge to `main` (direct REST, repo secret for the API key) — `sync-tokens.yml` pushes primitives, semantic, and device tokens, and now also syncs component metadata via `push:components`. Trigger path updated to include `packages/components/src/components/**/*.metadata.json` so component-only commits fire the workflow. Extended in Phase 10 to run `sense` first and push the two lifecycle axes (`Maturity` + `Implementation`).
- [x] `scripts/airtable-pull.js` — pulls governance state from Airtable → `airtable-governance.json`; wired as `npm run airtable:pull:governance`. Run manually before deprecation work until the Action below is built. Phase 10 added a second pull: the human component sign-off (`Implementation` = `done`/`todo`) → `.claude/component-signoff.json`.
- [x] `scripts/airtable-setup-governance.js` — one-time setup that added the governance fields (`status`, `owner`, `successor`, `notes`) to the Airtable tables; safe to re-run. Already executed.
- [ ] GH Action: run `airtable-pull.js` on a schedule or pre-merge so `airtable-governance.json` stays current without a manual step (script exists; Action wrapping it is not yet built)
- [x] GH Action: PR comment with token diff summary — `scripts/token-diff.js` compares built CSS between base and head; `tokens-check.yml` posts/updates the comment on every PR push (update-in-place via `<!-- token-diff -->` marker)
- [ ] Changelog generation from token diffs on release (script not yet written)
- [ ] Component version sync — Airtable has a `version` column per component but it is not wired to the pipeline. **Deferred:** wiring it requires defining what constitutes a version bump and what a consumer does with the number. Neither question has a useful answer until the design system has multiple consumers or a formal release cadence. Revisit if that changes.

**Exit condition:** merging a token change updates Airtable with no manual step, and token PRs show a diff comment. Everything in this phase runs without Claude.

## Phase 7 — Agentic Moments

> Seven moments, implemented as `.claude/commands/` prompts (written in Phase 2, expanded through Phases 8–9). Developer-triggered, infrequent, each with a success signal. No continuous loops, no schedulers.

- [x] **Figma token audit** — run on real task: `figma-variables.json` captured via MCP, representational divergences (unitless line-heights) tagged and excluded from drift checks, ADR-002 amended. Commits: `6517b76`, `77f27b0`, `7c137d6`.
- [ ] **Token deprecation pass** — command file exists; not yet run on a real deprecated token set.
- [x] **Component scaffold** — exercised on every component built through the `/add-component` loop (Phase 9). Now lives as Stage 1 of that loop rather than as a standalone call. Command file kept for direct use.
- [ ] **Layout generation** — command file exists; not yet run on a real page brief to produce a reviewed layout tree.
- [x] **Figma variable push (code → Figma)** — command file `figma-variable-push.md` exists. Inverse of the audit: diffs committed tokens against Figma variable inventory and writes clean-missing variables via `use_figma`. Not yet run on a real push cycle.
- [x] **Add component** (`/add-component`) — the verified scaffold loop (sense → scaffold → gate → adversarial review → PR). Badge shipped cleanly (Phase 9 pilot). Accordion shipped: 1 high a11y finding caught by the adversarial reviewer (`aria-controls` dead reference on conditional render) that no static linter or gate script can detect; all findings applied; 50/50 tests green. Run logs in `.claude/handoff/`.
- [x] **Review component** (`/review-component`) — extracted from `/add-component` Stages 3–4; now a standalone command. Spawns one adversarial reviewer subagent, applies findings, re-runs the gate, creates the PR branch, and writes `.review.json` + `.run.json`. Can be called by `/add-component` after Stage 2b or invoked directly to review an existing component. Behavioral a11y test coverage check is conditional on `component.type ∈ {interactive, input}` — skipped for display/landmark components.
- [x] **Extract learnings** (`/extract-learnings`, formerly `/post-review-retro`) — the self-improvement loop: reads `.review.json` + `.run.json` handoff files produced by `/review-component`, classifies each finding by the metadata section it belongs to (`accessibility.ariaAttributes`, `accessibility.keyboardInteractions`, `composition`, `usage.antiPatterns`), drafts targeted amendments, gates on `metadata:validate`, opens a PR. Piloted on Accordion (PR #10): 4 metadata sections amended across 6 findings; 3 skipped as one-off bugs with no generalizable lesson. Prevents the same mistakes from appearing in future `/add-component` Stage 3 findings.

**Exit condition:** each moment has been run once on a real task, met its success signal, and its prompt file updated with what was learned. Remaining: token deprecation pass, layout generation, first full Figma variable push.

---

## Pivot — Ad-hoc agentic loops (Phases 8–9)

> Phases 1–7 stand as built. This pivot upgrades the **component-scaffold** moment from a single-shot prompt into a self-verifying loop, and gives Figma the same frozen-memory treatment Airtable already has. It stays inside the lite-agentic charter: developer-triggered, **sequential, at most two agents**, frozen-file context, code-as-source-of-truth. New components (Phase 5d onward) are the live testing ground.
>
> **Runtime constraint (Claude Pro, not API):** the scarce resource is the rolling **usage window**, not per-token dollars. So: orchestrate in the main session, spawn **exactly one** fresh subagent — the adversarial reviewer, where independent context is the point. No parallel worker swarm (it drains the window N× simultaneously and trips rate limits — the opposite of the goal). Everything deterministic stays a plain `npm` script.
>
> **Figma feasibility (settled):** the Figma **Variables REST API is Enterprise-org only** — same wall as Code Connect (Phase 4). On Pro the only read path to variables is the Plugin API (Figma MCP `get_variable_defs`), interactive and one-off. So Figma's frozen memory is an MCP-captured snapshot committed to the repo, not a scheduled REST pull. Code stays the source of truth; the snapshot is a drift-detection mirror (ADR-002 amendment).

## Phase 8 — Frozen-Memory Ingestion Layer

> Make the whole system's status quo readable from committed files, so loop agents read small local snapshots instead of making live API calls. Pure scripts plus one MCP-assisted snapshot — no loops, no agents.

- [x] `figma-variables.json` — dated, frozen mirror of Figma's variable state, captured **interactively via the Figma MCP** (`use_figma` read-only dump) during `/figma-variable-audit`. Mirrors how `airtable-governance.json` mirrors Airtable. 414 vars (Primitives 252 · Theme 102 · Device 60); aliases recorded as `-> target/name`; Enterprise-REST limitation documented inline. Tags the 27 line-height **representational divergences** (Figma stores them as fixed px) so the drift check never flags them (ADR-002, 2026-06-22 amendment). Note: `get_variable_defs` is node-scoped — the full-collection read goes through `use_figma`'s `getLocalVariablesAsync`, captured in three ≤20 KB chunks to fit the MCP response cap.
- [x] `scripts/sense.js` — pure aggregation (no AI): composes `airtable-governance.json` + `token-usage.json` + `figma-variables.json` into `.claude/STATUS_QUO.md`, the single readable baseline. No live Figma call — reads the committed snapshot; degrades gracefully when it is absent. Derives the migration backlog (deprecated tokens × live usages) as the actionable signal.
- [x] `scripts/sense-component.js <Name>` — narrows the baseline to one component's relevant tokens + metadata + Figma node, written to `.claude/handoff/<Name>.snapshot.json` (the frozen context a loop stage hands to the next). Works greenfield (no metadata yet) and on an existing component; always carries the deprecation guardrail. Handoff snapshots are gitignored (per-run, regenerated from committed sources).
- [x] `npm run sense` / `npm run sense:component <Name>` wired in `package.json`.

**Exit condition (met):** an agent can answer "what is the full status quo of tokens, governance, and Figma drift" from committed files alone, with zero live API calls. `npm run sense` regenerates `STATUS_QUO.md` deterministically; `npm run sense:component <Name>` writes a per-component handoff snapshot.

## Phase 9 — The Verified Component Loop (pilot)

> The ad-hoc loop itself, piloted on already-planned Phase 5d components so it ships real work, not throwaway. One command, staged with frozen-file handoffs, gated by deterministic scripts, reviewed by one adversarial subagent. This is where the lint/a11y debt lands — as checks inside the review stage, run by CLI, not as separate manual chores.

- [x] `/add-component <Name>` command in `.claude/commands/` (renamed from `/component-loop`), wiring the stages:
  - **Stage 0 · script** — `npm run sense:component <Name>` writes the frozen snapshot.
  - **Stage 1 · in-session** — scaffold from snapshot + metadata schema + template component (reuses `/component-scaffold`, fed the snapshot).
  - **Stage 2 · script gate** — `npm run metadata:validate && npm run typecheck && npm run build`; fail-fast bounces back to Stage 1 with the error.
  - **Stage 2b · visual checkpoint** — gate passed; Claude prompts the developer to open the Default story in Storybook and toggle both themes, then reply `go` or describe issues. `go` with manual edits re-runs the gate first; an issue description triggers a fix cycle before re-surfacing the checkpoint. Nothing proceeds to Stage 3 without a human sign-off.
  - **Stage 3+ · `/review-component`** — delegates to `/review-component <Name>`: adversarial subagent review, fix, branch creation (`component/<kebab-name>`), PR, and per-run log. `/review-component` is also the standalone entry point for reviewing existing components.
- [x] Lint/a11y check wired as `npm run lint` (ESLint 9 flat config in `eslint.config.js`, scoped to `packages/components/src`, with `eslint-plugin-jsx-a11y` as the static a11y gate). The config existed from prior Phase 9 groundwork but no `lint` script invoked it; added the script and brought the baseline to green (fixed a pre-existing `CopyToken` div→button a11y bug). This is **Tier 1** (static), default for all components.
- [x] **Tier-2 behavioral a11y (ADR-008)** — runtime a11y resolved via **Vitest + Testing Library + `vitest-axe` (jsdom)**, not the Storybook test-runner the earlier deferral assumed (so the Storybook version conflict is moot). `npm run a11y:test` runs `<Name>.a11y.test.tsx` assertions (state attributes, focus, keyboard) + an axe scan; `npm run a11y:coverage` (`scripts/a11y-coverage.js`) derives interactivity from metadata and **requires** a behavioral test only for interactive components — Badge and other display/landmark components are exempt. A shrinking `scripts/a11y-backlog.json` ledger waives the six pre-existing interactive components (ButtonArrow, Checkbox, Chip, DropdownMenu, Select, TextField) pending backfill; `Button` is backfilled as the infra proof. Wired into the `/add-component` Stage-2 gate and `components-check.yml`. Color-contrast / visible-focus / real-AT stay out of scope (visual review + addon-a11y panel).
- [x] **Third tier — deterministic token-level color-contrast check (ADR-008, 2026-07-02 amendment)** — closes the color-contrast gap Tier 1/2 explicitly left out of scope. `scripts/token-contrast-check.js` (`npm run tokens:contrast-check`) computes WCAG relative-luminance contrast over a hand-curated set of foreground/background pairs (grouped by component, rendering context documented inline) against the **built** `dist/css/theme.{light,dark}.css` — no browser needed, since Style Dictionary already resolves every alias to a concrete color. Wired into `tokens-check.yml` on every PR touching token source. A manual audit (issue #20) found 12 failing pairs in light and 6 in dark shipping silently, including a primary Button label at 3.70:1 against a 4.5:1 requirement; `border.input.default`/`hover` bumped one scale step to fix. Two remaining near-misses (`text.brand`, `text.selected`, ~4.35:1) tracked in `scripts/token-contrast-waivers.json` — same shrinking-ledger convention as `a11y-backlog.json` — pending a deliberate token fix (issue #21). An automated CSS-co-occurrence derivation was tried and rejected (over-generates cross-multiplied false pairs from mutually-exclusive state variants); the curated list is documented as the deliberate choice in the script's header comment.
- [x] Per-run log defined in the command — `.claude/handoff/<Name>.run.json` (gitignored): gate pass/fail counts, whether Stage-0 context isolation held, and whether the verifier caught anything the gate missed. Exercised during the pilot.
- [x] **Pilot:** `Badge` shipped cleanly ✓. `Accordion` shipped ✓ — stateful component confirmed the adversarial reviewer earns its cost: it caught a silent `aria-controls` dead-reference bug (panel unmounted on collapse) that the gate and axe scanner both missed, plus Tab-navigation coverage gap in the test suite. 1 gate failure (minor: `process.env.NODE_ENV` → `import.meta.env.DEV`, no `@types/node` in tsconfig), 0 manual rescues. Promote ADR-007 `proposed` → `accepted`.
- [ ] `docs/add-component-loop-case-study.html` — stage-by-stage write-up of the Accordion pilot run, created 2026-06-23. **Out of date:** written before the loop split Stage 3–4 into the standalone `/review-component` command and added the Stage 2b visual checkpoint. Needs a refresh pass before it's linked from anywhere (e.g. the Phase 11 case-study site).

**Exit condition (met):** both pilot components shipped through the loop with no manual restructuring; the human reviewed only clean code; the loop prompt updated with what was learned. The adversarial reviewer found things the gate could not — the review stage is earning its cost.

## Phase 10 — Component Lifecycle Status (two axes) *(done)*

> Make a component's lifecycle legible end-to-end: where it sits in the build/review pipeline *and* whether it's production-ready, mirrored to Airtable as the governance surface. Splits the previously overloaded single `Status` field into two independent axes, each owned by the right process and flowing the right direction (ADR-010). Stays inside the charter: derivation is a pure script, the sync is REST, the only human decision is one bit per component.

- [x] **ADR-010** — two-axis model recorded. **Maturity** (`beta`/`ready`/`deprecated`) is code-owned via `component.status`. **Implementation** (`established`/`in progress`/`in review`/`done`/`todo`) is the pipeline stage: `sense.js` derives `established`/`in progress`/`in review` from handoff artifacts; `done`/`todo` are human-owned in Airtable.
- [x] **Airtable schema** (`tblT79kVwnCZJdlQE`) — renamed `Status` → `Maturity` (options trimmed to the three maturity values); added an `Implementation` single-select. Done by hand: the data-plane PAT lacks `schema.bases:write` and the MCP token was unauthorized.
- [x] **`sense.js`** — derives the Implementation stage per component (a lone snapshot is a context cache, not loop entry → `established`); layers pulled `done`/`todo` over the derived stage (human wins); emits a richer `## Components` section (both axes, an "In review — awaiting human sign-off" queue, and an "Established — review backlog" callout) plus the frozen `.claude/component-pipeline.json`.
- [x] **`airtable-pull.js`** — pulls the human-owned `Implementation` (`done`/`todo`) → `.claude/component-signoff.json` (the one Airtable → code direction for components). Wired into `npm run airtable:pull:governance`.
- [x] **`airtable-sync.js push:components`** — pushes `Maturity` + the derived `Implementation`, with two guards: never overwrites an Airtable `done`/`todo`, and exempts those rows from orphan deletion (so a planned `todo` can exist before any code). New `npm run airtable:sync:components` = `sense` + push.
- [x] **`sync-tokens.yml`** — runs `sense` before `push:components`; trigger paths extended to `.claude/handoff/**` and `.claude/component-signoff.json`.
- [x] **Maturity reset** — all components set to `beta` (26 at the time; 27 since `TextLink`, 2026-06-30) pending per-component review; promotion to `ready` is a deliberate metadata PR, not an Airtable edit.

**Exit condition (met):** `npm run sense` reports each component's maturity + implementation stage from committed files alone; `npm run airtable:sync:components` mirrors both axes to Airtable; a human `done`/`todo` set in Airtable survives every subsequent sync. Promoting a component to `done` is a human decision in Airtable; everything else is derived or pushed by script.

---

## Pivot — Case-study visibility (Phase 11)

> Phases 1–10 built the system; nothing outside Storybook makes it *visible*. This pivot adds a public artifact — one shareable URL — for demonstrating the pipeline in interviews: real responsive pages built from the component library, a health dashboard exposing the frozen-memory snapshots a maintainer would actually watch, an interactive pipeline diagram, an `llms.txt`, and a written system case study explaining the architecture end-to-end (token pipeline, CLI-script automation vs. the agentic moments, Airtable governance in both directions, benefits per audience). It stays inside the lite-agentic charter: `apps/showcase` is a new npm workspace in this monorepo (not a separate repo), consumes `@upskill/components`/`@upskill/tokens` via the workspace protocol and the **built** token CSS (never source JSON — same rule as components), composes only the frozen 27-component set, and adds no new always-on automation. The dashboard follows the same rule as every agentic moment: it reads **committed frozen files** (`STATUS_QUO.md`, `.claude/component-pipeline.json`, governance/usage/Figma-variables JSON), never live Airtable/Figma calls at runtime.

## Phase 11 — Public Showcase & Health Dashboard *(in progress)*

**Showcase pages** — real pages generated via `/layout-generation`, each structural choice justified by component metadata, composing the fixed set only:
- [x] `apps/showcase` workspace scaffolded (Vite + React + TypeScript + `react-router`), added to root `workspaces`, depends on `@upskill/components`/`@upskill/tokens` via `workspace:*`, imports the built token CSS once at the app root.
- [x] Routing stubbed for all four planned routes: `/`, `/showcase/homepage`, `/showcase/settings`, `/showcase/course`, `/dashboard`.
- [x] Course Overview page (`/showcase/course`) — real, generated page composing `Accordion`/`Badge`/`ProgressBar`/`CardHorizontal`/`Button` ghost variant.
- [ ] Homepage page (`/showcase/homepage`) — still a stub; generate from the Carousel / FooterHighlights / CardVertical composed stories.
- [ ] Settings page (`/showcase/settings`) — still a stub; generate from the SettingsForm composed story.
- [ ] Cross-page navigation via `AppHeader` linking `/`, `/showcase/homepage`, `/showcase/settings`, `/showcase/course`.
- [ ] Responsive + theme QA on all three showcase pages (desktop ≥1440 / tablet ≥768 / mobile <768, light + dark).
- [ ] Root build chain extended to include the showcase app (`npm run build` currently stops at `@upskill/components`).
- [ ] Vercel deployment config (`vercel.json` or documented project settings) — the developer runs the actual `vercel` login/deploy.

**Health dashboard** (`/dashboard`) — currently a stub:
- [ ] Deterministic build-time ingestion of the committed JSON (import or a prebuild copy step) — documented, no runtime API calls.
- [ ] Component lifecycle view: both axes (Maturity `beta`/`ready`/`deprecated`; Implementation `established`/`in progress`/`in review`/`done`/`todo`), counts plus a per-component table, sourced from `.claude/component-pipeline.json`.
- [ ] Token governance view: governed/active/deprecated counts and the deprecated-in-use migration backlog, sourced from `airtable-governance.json` + `token-usage.json`.
- [ ] Figma drift summary from `figma-variables.json`, with accepted representational divergences (e.g. unitless line-heights) labeled as expected — not flagged as drift.
- [ ] Pending GitHub issues surfaced on the dashboard (read via `gh`/REST at build time into a committed or prebuild-fetched snapshot — not a live call from the browser).

**Interactive token pipeline diagram** — Figma → token export → Style Dictionary build → CSS/JS outputs → components → (Airtable governance, GitHub Actions), reflecting this repo's actual stages and tools (reference shape only: `learn.thedesignsystem.guide`'s automated-token-workflow diagram):
- [ ] Ships as a standalone route.
- [ ] Embedded in `/dashboard` as well.
- [ ] MVP is a clear static diagram; interactivity (hover for stage detail, click-through to the relevant script/ADR) is a stretch goal, not a blocker.

**`llms.txt`**:
- [ ] Generated at the site root from real metadata (component prop types, variants, composition rules, `usage.antiPatterns`) and semantic token names, following the llms.txt convention (concise, link-structured, machine-readable) — not a knowledge graph.

**System case study** — the comprehensive narrative; supersedes the earlier "landing page blurb" framing. Format decision first: written directly as the landing page (`/`) content, or as a dedicated `docs/system-case-study.html` (same styled format as the existing per-moment doc) with the landing page as a shorter entry point linking to it:
- [ ] Token pipeline: Figma → primitives/theme/device layers → Style Dictionary build → CSS/JS outputs, with the code-as-source-of-truth rationale (ADR-002 amendment).
- [ ] CLI/script automation vs. agentic moments: what "lite agentic" means in practice — GitHub Actions + scripts for anything recurring, the 8 developer-triggered moments reserved for judgment work, and why the split exists (Claude Pro usage-window economics, one-person maintainability).
- [ ] Airtable governance flow, both directions: code → Airtable (`airtable-sync.js`, on merge to `main`) and Airtable → code (`airtable-pull.js`, governance + component sign-off) — what each direction is for and who edits which side.
- [ ] Benefits framed per audience: maintainers (frozen-memory snapshots, one-bit Airtable sign-off, drift/migration backlog), developers/consumers (metadata-driven scaffolding, enforced a11y contract, layout generation), reviewers (the adversarial-review loop catching what deterministic gates can't).
- [ ] Honest rejected-alternatives framing: Enterprise-gated Figma REST, parallel-agent swarms, appearance-based renames — senior-level judgment calls, not just what shipped. Accuracy over flourish — no claim ahead of what's actually built.
- [ ] `docs/add-component-loop-case-study.html` (Phase 9, currently stale) refreshed to match the current loop shape and demoted to a linked deep-dive under the agentic-moments section — not the standalone entry point to the story.
- [ ] Storybook linked from the site without breaking the Vite app's build.

**Exit condition:** one shareable URL — all four showcase pages responsive and theme-correct, a health dashboard reading lifecycle/governance/drift/issues from committed files alone, the pipeline diagram reachable standalone and from the dashboard, `llms.txt` reachable at the site root and accurate, and a system case study that explains the architecture end-to-end for an interviewer with no prior context. Centerpiece artifact for job-search case studies.

---

## Pivot — Standalone documentation site (Phase 12)

> A **third** documentation artifact, distinct from the other two: `system-case-study-draft.md` (narrative, interview-register case study) and `apps/showcase` (live Vite/React app — pages, dashboard, pipeline diagram, `llms.txt`, Phase 11). This one is a plain-markdown reference site — "how this system actually works, page by page" — for a reader who wants to browse the architecture rather than read a narrative or watch a live artifact. Decided 2026-07-02: it gets its own phase here rather than staying an undecided open question. Full spec, sources, and IA lives in `.claude/handoff/docsify-docs-site.handoff.md`.

## Phase 12 — Docsify Reference Site *(not started)*

- [ ] Docsify shell (`index.html` + `_sidebar.md`, zero/near-zero build) built around the existing `docs/` content (`cli.md`, `glossary.md`, `decisions/`) rather than a parallel folder.
- [ ] Nine pages per the draft IA: `00-start-here` through `06-agentic-moments` (synthesized from CLAUDE.md + ADRs + commands), `07-cli-reference` and `08-glossary` adapted from the existing files. Every ADR (001–011) and every command (10 files) referenced from at least one page.
- [ ] Mermaid diagrams for genuinely spatial/sequential relationships only (token resolution order, lifecycle's two axes, the `/add-component` loop stages) — wrapped in a horizontally-scrollable container.
- [ ] `add-component-loop-case-study.html` linked from the relevant page as a standalone HTML artifact, not folded in as markdown.
- [ ] Mobile-friendly at 375–430px: no forced horizontal scroll, collapsible sidebar, 44×44px tap targets — same bar as the sibling `design-systems-101` repo.
- [ ] GitHub Pages enabled off `main` (`/docs`), after confirming no existing Pages config conflicts.

**Exit condition:** `npx docsify serve docs` renders locally with working nav and no broken internal links; GitHub Pages URL is live; site checked at mobile viewport with no page-level horizontal scroll. Remaining open question (deliberately unresolved): whether/how this site should cross-link with the Phase 11 case study and `apps/showcase` once both exist.
