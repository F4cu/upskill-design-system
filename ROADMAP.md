# UpSkill Design System — Roadmap

Progress tracker. `[x]` done · `[-]` in progress · `[ ]` not started. Each phase is sized for 1–2 focused sessions and ends with an exit condition — don't start the next phase until the current one meets it. Commit-level detail lives in `git log`; ADR numbers link the *why* — this file tracks *what shipped, per phase*.

## What "lite agentic" means here

Lite in two ways:

1. **Small surface.** The library targets one SaaS product with a few simple pages. The final component set is fixed: `Box`, `Stack`, `Inline`, `Text`, `Heading`, `Icon`, `Button`, form inputs (`TextField`, `Select`, `Checkbox`), and `Card`, plus the page-specific additions listed per phase (Phase 5). Nothing more — a new component needs a reason a composition of these can't cover.
2. **Economic to maintain.** No orchestration layer, no always-on agents, no scheduled loops. Recurring automation is plain scripts and GitHub Actions calling REST APIs directly. MCP servers are reserved for interactive one-off tasks with a human in the loop — they are expensive per call and each one is maintenance surface.

"Agentic" means a small, fixed set of **developer-triggered moments** where Claude reads structured context the repo already provides (token JSON, component metadata, Airtable governance state, Figma variables) and produces something a script can't: an audit, a migration plan, a scaffold. Nine moments are defined (Phase 7, expanded through Phases 8–9 and the 2026-07-08 agentic-moments audit). Each has a named trigger, declared inputs, a concrete output, and a success signal. Anything that needs to run on every PR or merge is a script, not an agent. The whole system stays readable and maintainable by one person.

---

## Phase 1 — Infrastructure *(done)*

Monorepo + npm workspaces; DTCG token JSON; Style Dictionary build; CSS/JS outputs; Storybook with light/dark toggle and MDX token showcase; token build check on PR.

**Exit condition (met):** `npm run tokens:build` produces CSS + JS outputs; Storybook renders the token inventory in light and dark.

## Phase 1.5 — Token Foundation Review *(done)*

Component metadata schema defined. Device layer cleaned. ADRs recorded for layout tokens as values and the `space`/`size` split. Semantic token names audited for intent vs. raw scale position.

**Exit condition (met):** naming audit complete; token names stable for components and Airtable.

## Phase 2 — Agentic Foundation *(done)*

Airtable governance fields (`status`, `owner`, `successor`, `notes`); `airtable-pull.js` → `airtable-governance.json`; `token-usage.js` → `token-usage.json`. Metadata schema validated end-to-end. First agentic-moment prompt files written.

**Exit condition (met):** Claude can answer token status + usages from committed files with zero MCP calls; layout briefs produce valid React trees from metadata alone.

## Phase 3 — Component API Foundation *(done)*

CSS reset, `grid.css`, `typography.css`. Layout primitives: `Box`, `Stack`, `Inline`, `ScrollArea` (added retroactively in 5c, ADR-006). `storybook-design-token` wiring blocked on a workspace version conflict (Storybook 8 vs. 10) — token showcase already covered by MDX stories; revisit on version unification.

**Exit condition (met):** sample page layout renders using only `Box`/`Stack`/`Inline` and the grid utility — no ad-hoc CSS.

## Phase 4 — Core Components *(done)*

`Text`, `Heading`, `Icon`, `Button` — semantic tokens, interaction states, size variants, leading icon. Code Connect omitted (Figma Org/Enterprise plan only; out of scope).

**Exit condition (met):** all four components render in both themes with stories and metadata.

## Phase 5 — Component Library *(done)*

Full fixed component set built across four batches. Library frozen at **27 components + 2 hooks** (`useCarousel`, `useSlider`).

| Batch | Components |
|---|---|
| Core (5) | `TextField`, `Select`, `Checkbox`, `Card` |
| User Settings (5b) | `Avatar`, `AppHeader`, `Breadcrumb`, `Divider`, `ProgressBar`, `CardHorizontal` |
| Homepage (5c) | `CardVertical`, `Chip`, `VideoFrame`, `ButtonArrow` |
| Course Overview (5d) | `Accordion`, `Badge`, `Button` ghost variant + trailing icon, `useSlider` hook |

`DropdownMenu`, `Image`, and `TextLink` landed as explicit scope expansions after the batch plan was written. `Accordion` and `Badge` shipped through the `/add-component` loop (Phase 9 pilot).

**Exit condition (met):** all components render in both themes with stories and metadata; library frozen — growth by composition only.

## Phase 6 — Automation (scripts and Actions only — no MCP, no agents)

Done: `sync-tokens.yml` pushes tokens, component metadata, and (Phase 10) both lifecycle axes to Airtable on merge to `main`; `airtable-pull.js` pulls governance state + human sign-off back (run manually via `npm run airtable:pull:governance` until scheduled); one-time governance-field setup executed; `tokens-check.yml` posts a PR token-diff comment.

Remaining:
- [ ] Scheduled/pre-merge `airtable-pull.js` Action (script exists; Action not built).
- [ ] Changelog generation from token diffs on release.
- [ ] Component version sync — Airtable has a `version` column, unwired. **Deferred:** no useful trigger until the system has multiple consumers or a release cadence.

**Exit condition:** merging a token change updates Airtable with no manual step, and token PRs show a diff comment. Everything in this phase runs without Claude.

## Phase 7 — Agentic Moments

> Nine moments as `.claude/commands/` prompts (written in Phase 2, expanded through Phases 8–9 and the 2026-07-08 agentic-moments audit — full audit notes in `.claude/handoff/archive/2026-07-08-agentic-moments-audit.handoff.md`). Developer-triggered, infrequent, each with a success signal. No continuous loops, no schedulers.

Seven of nine moments have been run on a real task and met their success signal: **Figma token audit** (real drift check, ADR-002 amended), **component scaffold** (every `/add-component` run), **layout generation** (the real Course Overview page, Phase 11; consumes `component-patterns.json` since Phase 14), **add component** (Badge + Accordion shipped clean), **review component** (standalone adversarial-review + fix + PR stage, one read-only reviewer subagent), **extract learnings** (piloted on Accordion, PR #10; routing widened in the 2026-07-08 audit to layout/composition and token findings plus an `--all` consolidation step), and **docs sync** (moment 9 — `docs-check.js` CI gate + inaugural run, PR #36, fixed real drift in 6 of 9 `docs/*.md` pages).

**Audit follow-through (2026-07-08):** `model:`/`allowed-tools:` frontmatter added to all 10 commands, paired with a read-only `adversarial-reviewer` subagent definition; ADR-016 recorded (layout-output review path: PR + in-session `/code-review` by default, opt-in adversarial pass for full route pages); per-run telemetry now survives past `runs/` via a committed `.claude/handoff/run-ledger.json` (`handoff:tidy`).

Remaining:
- [ ] **Token deprecation pass** — command exists; not yet run on a real deprecated token set.
- [ ] **Figma variable push (code → Figma)** — command exists; not yet run on a full push cycle (prep handoff active: `.claude/handoff/2026-07-07-figma-variable-push-prep.handoff.md`).

**Exit condition:** each moment run once on a real task, meeting its success signal. Remaining: token deprecation pass, a full Figma variable push cycle.

---

## Pivot — Ad-hoc agentic loops (Phases 8–9)

> This pivot upgrades the **component-scaffold** moment from a single-shot prompt into a self-verifying loop, and gives Figma the same frozen-memory treatment Airtable already has. Stays inside the lite-agentic charter: developer-triggered, **sequential, at most two agents**, frozen-file context, code-as-source-of-truth.
>
> **Runtime constraint (Claude Pro, not API):** the scarce resource is the rolling **usage window**. Orchestrate in the main session, spawn **exactly one** fresh subagent — the adversarial reviewer, where independent context is the point. Everything deterministic stays a plain `npm` script.
>
> **Figma feasibility:** the Variables REST API is Enterprise-org only — same wall as Code Connect. Figma's frozen memory is an MCP-captured snapshot committed to the repo, not a scheduled REST pull (ADR-002 amendment).

## Phase 8 — Frozen-Memory Ingestion Layer *(done)*

- [x] `figma-variables.json` — dated Figma-variable mirror captured interactively via MCP during `/figma-variable-audit`; tags the 27 line-height representational divergences so the drift check never flags them (ADR-002, 2026-06-22 amendment).
- [x] `sense.js` → `.claude/STATUS_QUO.md` — pure aggregation of governance + usage + Figma-variable snapshots; derives the deprecated-token migration backlog.
- [x] `sense-component.js <Name>` → `.claude/handoff/runs/<Name>.snapshot.json` — narrows the baseline to one component; gitignored, regenerable.
- [x] `npm run sense` / `npm run sense:component <Name>` wired in `package.json`.
- [x] **Handoff artifact lifecycle (ADR-015, 2026-07-07/08)** — markdown handoffs carry `status`/`created`/`completed` frontmatter, named `YYYY-MM-DD-slug.handoff.md`, committed (active + archive); per-run component-loop JSON moved to gitignored `handoff/runs/`. `npm run handoff:tidy` archives done/superseded handoffs, regenerates `handoff/index.json` (read that, never glob the directory), and promotes `<Name>.run.json` records into the committed `run-ledger.json`.

**Exit condition (met):** an agent can answer "what is the full status quo of tokens, governance, and Figma drift" from committed files alone, with zero live API calls, including which handoffs are still active.

## Phase 9 — The Verified Component Loop (pilot) *(done)*

`/add-component <Name>` wires sense → scaffold → gate (`metadata:validate && typecheck && build`) → visual checkpoint (human sign-off in Storybook) → `/review-component`. Three a11y tiers gate every component: static lint (`jsx-a11y`), behavioral (`<Name>.a11y.test.tsx` via Vitest + `vitest-axe`, required only for interactive components, shrinking `a11y-backlog.json` for pre-existing gaps), and deterministic token contrast (`token-contrast-check.js` against **built** theme CSS — found and fixed 12 failing pairs in light / 6 in dark, issue #20). Per-run logs promote into the committed run-ledger via `handoff:tidy` (Phase 8). **Pilot:** Badge shipped cleanly; Accordion confirmed the adversarial reviewer earns its cost — caught a silent `aria-controls` dead-reference bug the gate and axe scanner both missed. ADR-007 promoted `proposed` → `accepted`.

Remaining:
- [ ] `docs/add-component-loop-case-study.html` — stage-by-stage write-up of the Accordion pilot, written 2026-06-23. Out of date (predates the Stage 2b visual checkpoint and the `/review-component` split); needs a refresh before linking it from Phase 11/12.

**Exit condition (met):** both pilot components shipped through the loop with no manual restructuring; the human reviewed only clean code; the adversarial reviewer found things the gate could not.

## Phase 10 — Component Lifecycle Status (two axes) *(done)*

> Splits the overloaded single `Status` field into **Maturity** (`beta`/`ready`/`deprecated`, code-owned via `component.status`) and **Implementation** (`established`/`in progress`/`in review`/`done`/`todo`, pipeline-derived, with `done`/`todo` human-owned in Airtable). ADR-010.

- [x] Airtable schema split (`Status` → `Maturity`, new `Implementation` field) — done by hand (MCP token lacked schema-write access).
- [x] `sense.js` derives the Implementation stage from handoff artifacts; layers human `done`/`todo` over it; emits `.claude/component-pipeline.json`.
- [x] `airtable-pull.js` pulls human sign-off → `.claude/component-signoff.json` (the one Airtable → code direction for components).
- [x] `airtable-sync.js push:components` pushes both axes with a "never downgrade a human `done`" guard; `npm run airtable:sync:components` = `sense` + push.
- [x] All 27 components reset to `beta` pending per-component review; promotion to `ready` is a deliberate metadata PR.

**Exit condition (met):** `npm run sense` reports both axes from committed files alone; a human `done`/`todo` set in Airtable survives every subsequent sync.

---

## Pivot — Case-study visibility (Phase 11)

> Phases 1–10 built the system; nothing outside Storybook makes it *visible*. This pivot adds a public artifact — one shareable URL — for demonstrating the pipeline in interviews: real responsive pages, a health dashboard exposing the frozen-memory snapshots a maintainer would actually watch, an interactive pipeline diagram, an `llms.txt`, and a written system case study. `apps/showcase` is a workspace in this monorepo, consumes built token CSS + the frozen component set only, and adds no new always-on automation; the dashboard reads committed frozen files, never live Airtable/Figma calls.

## Phase 11 — Public Showcase & Health Dashboard *(in progress)*

**Showcase pages** — real pages generated via `/layout-generation`, composing the fixed set only. Done: `apps/showcase` workspace scaffolded (Vite + React + TypeScript + `react-router`, all four routes stubbed); Course Overview page (`/showcase/course`) is a real, generated page.

Remaining:
- [ ] Homepage page (`/showcase/homepage`) — stub. Also carries the learner-facing view and deliberately uses the `horizon` brand (multi-brand outside Storybook). Spec: `.claude/handoff/archive/pipeline-dashboard.handoff.md` §"Scope note".
- [ ] Settings page (`/showcase/settings`) — stub; generate from the SettingsForm composed story.
- [ ] Cross-page navigation via `AppHeader`.
- [ ] Responsive + theme QA on all three showcase pages (desktop/tablet/mobile × light/dark).
- [ ] Root build chain extended to include the showcase app.
- [ ] GitHub Pages deployment for `apps/showcase` (showcase pages + dashboard + `/pipeline`) — needs a Vite `base` path + `404.html` SPA fallback, and a deploy Action off `main`.

**Pipeline Health Dashboard** (`/dashboard`, maintainer-facing) *(done)* — full spec: `.claude/handoff/archive/pipeline-dashboard.handoff.md`. DAG hero (pipeline diagram, own components + inline SVG) at the top of `/dashboard` and standalone at `/pipeline`, with progressive disclosure of which agentic moments touch each node; `.claude/pipeline-status.json` (CI conclusions + open issues, `gh`-captured pre-deploy) joins the existing frozen snapshots at build time only; dashboard views for component lifecycle (both axes), token governance backlog, Figma drift, and open issues, sharing one small chart primitive; QA gate (`layout:validate`, responsive + light/dark, keyboard-only pass) green.

**`llms.txt`:**
- [ ] Generated at the site root from real metadata + semantic token names, following the llms.txt convention.

**System case study** — the comprehensive narrative, superseding the earlier "landing page blurb" framing. Format decision first: landing-page content vs. a dedicated `docs/system-case-study.html` with the landing page as an entry point:
- [ ] Token pipeline narrative (code-as-source-of-truth rationale, ADR-002 amendment).
- [ ] CLI/script automation vs. agentic moments — what "lite agentic" means in practice and why the split exists.
- [ ] Airtable governance flow, both directions.
- [ ] Benefits framed per audience (maintainers, developers/consumers, reviewers).
- [ ] Honest rejected-alternatives framing (Enterprise-gated Figma REST, parallel-agent swarms, appearance-based renames).
- [ ] `docs/add-component-loop-case-study.html` refreshed and demoted to a linked deep-dive, not the standalone entry point.
- [ ] Storybook linked from the site without breaking the Vite app's build.

**Exit condition:** one shareable URL — all four showcase pages responsive and theme-correct, the health dashboard reading lifecycle/governance/drift/issues from committed files alone, the pipeline diagram reachable standalone and from the dashboard, `llms.txt` reachable and accurate, and a system case study explaining the architecture end-to-end for an interviewer with no prior context.

---

## Pivot — Standalone documentation site (Phase 12)

> A third documentation artifact, distinct from the narrative case study and the live `apps/showcase`: a plain-markdown reference site — "how this system actually works, page by page." Full spec, sources, and IA: `.claude/handoff/archive/docsify-docs-site.handoff.md`.

## Phase 12 — Docsify Reference Site *(in progress — site built, Pages pending)*

Done: Docsify shell around `docs/`; nine pages (`00-start-here` through `08-glossary`) referencing every ADR (001–016) and command (11 files); Mermaid diagrams for spatial/sequential relationships in a scrollable container; `add-component-loop-case-study.html` linked as a standalone artifact; mobile-friendly at 375–430px with no forced horizontal scroll; `docs-check.js` staleness gate wired into CI, with its inaugural `/docs-sync` run (PR #36) fixing real drift in 6 of 9 pages (Phase 7); glossary consolidated into the single `08-glossary.md` and the duplicate pre-docsify `npm-scripts-reference.md` removed.

Remaining:
- [ ] GitHub Pages enabled off `main` (`/docs`) — not yet live.

**Exit condition:** `npx docsify serve docs` renders locally with working nav and no broken internal links; GitHub Pages URL is live; site checked at mobile viewport with no page-level horizontal scroll. Open question (deliberately unresolved): cross-linking with the Phase 11 case study and `apps/showcase` once both exist.

---

## Pivot — Multi-brand tokens (Phase 13)

> A shared core plus a per-brand identity layer (color ramp mapping, font family, border radius), selected via `data-brand`. Second brand (`horizon`) is fictional, built from existing primitive hues — no new ramps, no Airtable/Figma changes (ADR-012). Full spec: `.claude/handoff/archive/2026-07-03-multi-brand-refactor.handoff.md`.

## Phase 13 — Brand Layer *(done)*

Core extracted to `brands/upskill.json` with `theme/{light,dark}.json` reshaped to brand-agnostic `var()` references, guarded by a shape gate + no-inlined/no-dangling gate (verified bit-for-bit equivalent to the pre-refactor build). Second brand `horizon` added (`brand → cyan`, `accent → teal`, `neutral`/`surface → grey`) with a Storybook brand toolbar; contrast triage during that work made `cyan` brand-eligible (patched light ramp, added dark ramp). ADR-012 recorded; CLAUDE.md documents the four-layer model and brand-eligibility rule; `run-storybook` gained `--brand`. The three contrast/raw-ramp follow-up issues filed during triage — #22 (raw-ramp `var()` consumers in dark mode), #21 (`text.brand`/`text.selected` contrast), #23 (horizon `border.selected` contrast) — are all closed.

**Exit condition (met):** two brands render correctly in both themes via `data-brand`, both gates pass, `tokens-check.yml` covers both brands, and all follow-up issues (#21–#23) are closed.

---

## Pivot — Cross-component pattern schema (Phase 14)

> Adds a cross-component aggregate — which components implement the same interaction pattern, canonical prop shape, where implementations drift — as a frozen-snapshot file. Pre-registered honest-outcome rule: no measured accuracy delta, no ship.

## Phase 14 — Pattern Aggregation & Accuracy Harness *(done)*

- [x] `scripts/generate-pattern-schema.js` → `.claude/component-patterns.json` (pattern buckets, ARIA contracts, composition surfaces, prop-name drift).
- [x] 7-task × 2-arm accuracy harness, scored by deterministic gates + a trap checklist. Result split by kind: composition 6→1 violations, layout 7→3, **component scaffolds 19→24 (regression)**.
- [x] **ADR-013** — ship decision followed the measured delta: the pattern file is a `/layout-generation`-only consumer, explicitly not injected into `/component-scaffold`.
- [x] CI staleness check in `components-check.yml` (regenerate + diff on every PR touching components).
- [x] Producer-side wiring — `/add-component` and `/review-component` regenerate and commit the file as part of their gates.

**Exit condition (met):** the aggregate regenerates deterministically; the harness ran the full matrix and the ship decision followed the measured result; CI fails on a stale committed copy.
