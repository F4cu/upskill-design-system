# UpSkill Design System — Roadmap

Progress tracker. `[x]` done · `[-]` in progress · `[ ]` not started. Each phase is sized for 1–2 focused sessions and ends with an exit condition — don't start the next phase until the current one meets it. Commit-level detail lives in `git log`; rationale and history live in ADRs and `.claude/handoff/archive/` — this file tracks *what shipped, per phase*, as concisely as possible.

See `README.md` for what "lite-agentic" means and `docs/00-start-here.md` / `docs/06-agentic-moments.md` for the full concept and the nine agentic moments.

---

## Status at a glance

**Foundation** (Phases 1–4)

| Phase | Status | Exit condition |
|---|---|---|
| 1 — Infrastructure | ✅ done | Token build + Storybook token showcase, light/dark |
| 1.5 — Token Foundation Review | ✅ done | Naming audit complete; names stable for components + Airtable |
| 2 — Agentic Foundation | ✅ done | Status/usage answerable from committed files; layout briefs valid from metadata alone |
| 3 — Component API Foundation | ✅ done | Sample layout renders via primitives only, no ad-hoc CSS |
| 4 — Core Components | ✅ done | 4 core components render both themes, stories + metadata |

**Component Library & CI Automation** (Phases 5–6)

| Phase | Status | Exit condition |
|---|---|---|
| 5 — Component Library | ✅ done | Library frozen at 27 components + 2 hooks |
| 6 — Automation | ✅ done | Token merges sync to Airtable + PR diff comment, zero manual steps |

**Agentic Moments & Verified Loop** (Phases 7–10)

| Phase | Status | Exit condition |
|---|---|---|
| 7 — Agentic Moments | 🚧 in progress | 7/9 moments run on a real task; remaining: token deprecation pass, Figma variable push |
| 8 — Frozen-Memory Ingestion Layer | ✅ done | `sense.js` answers token/governance/Figma-drift status from committed files, zero live calls |
| 9 — Verified Component Loop (pilot) | ✅ done | Both pilot components shipped clean; adversarial reviewer caught a real bug |
| 10 — Component Lifecycle Status | ✅ done | Both lifecycle axes reported from committed files; human `done` survives every sync |

**Case-Study Visibility** (Phases 11–11.5)

| Phase | Status | Exit condition |
|---|---|---|
| 11 — Public Showcase & Health Dashboard | 🚧 in progress | 4 responsive/theme-correct showcase pages, dashboard, pipeline diagram, `llms.txt` |
| 11.5 — Case-Study Source Material | ✅ done | 5 narrative sections drafted for the portfolio piece |

**Standalone Documentation Site** (Phase 12)

| Phase | Status | Exit condition |
|---|---|---|
| 12 — Docsify Reference Site | 🚧 in progress (Pages pending) | Site works locally + live on GitHub Pages, no broken links, mobile-clean |

**Token & Pattern Hardening** (Phases 13–14)

| Phase | Status | Exit condition |
|---|---|---|
| 13 — Brand Layer | ✅ done | Two brands render correctly both themes; both gates pass; follow-up issues closed |
| 14 — Pattern Aggregation & Accuracy Harness | ✅ done | Aggregate regenerates deterministically; ship decision followed the measured harness result |

---

## Pivot — Foundation (Phases 1–4)

> Infrastructure, the token model, and the fixed core component set — the base every later phase builds on.

## Phase 1 — Infrastructure *(done)*

Monorepo + npm workspaces; DTCG token JSON; Style Dictionary build; CSS/JS outputs; Storybook with light/dark toggle and MDX token showcase; token build check on PR.

## Phase 1.5 — Token Foundation Review *(done)*

Component metadata schema defined. Device layer cleaned. ADRs recorded for layout tokens as values and the `space`/`size` split. Semantic token names audited for intent vs. raw scale position.

## Phase 2 — Agentic Foundation *(done)*

Airtable governance fields (`status`, `owner`, `successor`, `notes`); `airtable-pull.js` → `airtable-governance.json`; `token-usage.js` → `token-usage.json`. Metadata schema validated end-to-end. First agentic-moment prompt files written.

## Phase 3 — Component API Foundation *(done)*

CSS reset, `grid.css`, `typography.css`. Layout primitives: `Box`, `Stack`, `Inline`, `ScrollArea` (added retroactively in 5c, ADR-006). `storybook-design-token` wiring blocked on a workspace version conflict (Storybook 8 vs. 10) — token showcase already covered by MDX stories; revisit on version unification.

## Phase 4 — Core Components *(done)*

`Text`, `Heading`, `Icon`, `Button` — semantic tokens, interaction states, size variants, leading icon. Code Connect omitted (Figma Org/Enterprise plan only; out of scope).

---

## Pivot — Component Library & CI Automation (Phases 5–6)

> The full fixed component set, frozen, plus the GitHub Actions automation that keeps tokens, component metadata, and governance state in sync with Airtable — no agent involvement.

## Phase 5 — Component Library *(done)*

Full fixed component set built across four batches. Library frozen at **27 components + 2 hooks** (`useCarousel`, `useSlider`).

| Batch | Components |
|---|---|
| Core (5) | `TextField`, `Select`, `Checkbox`, `Card` |
| User Settings (5b) | `Avatar`, `AppHeader`, `Breadcrumb`, `Divider`, `ProgressBar`, `CardHorizontal` |
| Homepage (5c) | `CardVertical`, `Chip`, `VideoFrame`, `ButtonArrow` |
| Course Overview (5d) | `Accordion`, `Badge`, `Button` ghost variant + trailing icon, `useSlider` hook |

`DropdownMenu`, `Image`, and `TextLink` landed as explicit scope expansions after the batch plan was written. `Accordion` and `Badge` shipped through the `/add-component` loop (Phase 9 pilot). Library frozen — growth by composition only.

## Phase 6 — Automation (scripts and Actions only — no MCP, no agents) *(done)*

- `sync-tokens.yml` — pushes tokens, component metadata, and both lifecycle axes to Airtable on merge to `main`.
- `airtable-pull.yml` — weekly (Mon 06:00 UTC) + on-demand pull of governance state + human sign-off, no manual step.
- `tokens-check.yml` — posts a PR token-diff comment, gates `$deprecated` mirroring (Phase 7).
- `deploy-showcase.yml`, `components-check.yml`, `showcase-check.yml` — round out CI (concurrency guards, PR-only triggers, lint gate; 2026-07 CI-hygiene audit, issues #57–#61).

Deferred, not tracked further here: changelog generation from token diffs on release; component version sync (Airtable `version` column, unwired — no useful trigger until multiple consumers or a release cadence). Everything in this phase runs without Claude.

---

## Pivot — Agentic Moments & Verified Loop (Phases 7–10)

> The nine developer-triggered agentic moments (Phase 7); a frozen-memory ingestion layer so those moments read committed snapshots instead of live APIs (Phase 8); a self-verifying loop that upgrades component-scaffold into sense → scaffold → gate → visual checkpoint → review (Phase 9); and the two-axis lifecycle status that tracks each component through that loop (Phase 10). Stays inside the lite-agentic charter: developer-triggered, **sequential, at most two agents**, frozen-file context, code-as-source-of-truth.
>
> **Runtime constraint (Claude Pro, not API):** the scarce resource is the rolling **usage window**. Orchestrate in the main session, spawn **exactly one** fresh subagent — the adversarial reviewer, where independent context is the point. Everything deterministic stays a plain `npm` script.
>
> **Figma feasibility:** the Variables REST API is Enterprise-org only — same wall as Code Connect. Figma's frozen memory is an MCP-captured snapshot committed to the repo, not a scheduled REST pull (ADR-002 amendment).

## Phase 7 — Agentic Moments *(in progress)*

> Nine moments as `.claude/commands/` prompts (written in Phase 2, expanded through Phases 8–9 and the 2026-07-08 agentic-moments audit — full audit notes in `.claude/handoff/archive/2026-07-08-agentic-moments-audit.handoff.md`). Each has a named trigger, declared inputs, a concrete output, and a success signal. No continuous loops, no schedulers.

Seven of nine moments have run on a real task and met their success signal:

- **Figma token audit** — real drift check, ADR-002 amended.
- **Component scaffold** — every `/add-component` run.
- **Layout generation** — the real Course Overview page (Phase 11); consumes `component-patterns.json` since Phase 14.
- **Add component** — Badge + Accordion shipped clean.
- **Review component** — standalone adversarial-review + fix + PR stage, one read-only reviewer subagent.
- **Extract learnings** — piloted on Accordion (PR #10); routing widened in the 2026-07-08 audit to layout/composition and token findings plus an `--all` consolidation step.
- **Docs sync** — `docs-check.js` CI gate + inaugural run (PR #36), fixed real drift in 6 of 9 `docs/*.md` pages.

**Audit follow-through (2026-07-08):** `model:`/`allowed-tools:` frontmatter added to all 10 commands, paired with a read-only `adversarial-reviewer` subagent definition; ADR-016 recorded (layout-output review path: PR + in-session `/code-review` by default, opt-in adversarial pass for full route pages); per-run telemetry now survives past `runs/` via a committed `.claude/handoff/run-ledger.json` (`handoff:tidy`).

**Since audited:** `scripts/token-deprecation-mirror.js` mirrors Airtable governance into DTCG `$deprecated` on token leaves (committed source becomes the durable record; Airtable stays the UI), CI-gated via `tokens:deprecations:check` (ADR-002 amendment, 2026-07-13).

Remaining:
- [ ] **Token deprecation pass** — command exists; not yet run on a real deprecated token set.
- [ ] **Figma variable push (code → Figma)** — command exists; not yet run on a full push cycle (prep handoff active: `.claude/handoff/2026-07-07-figma-variable-push-prep.handoff.md`).

## Phase 8 — Frozen-Memory Ingestion Layer *(done)*

- `figma-variables.json` — dated Figma-variable mirror captured interactively via MCP during `/figma-variable-audit`; tags the 27 line-height representational divergences so the drift check never flags them (ADR-002, 2026-06-22 amendment).
- `sense.js` → `.claude/STATUS_QUO.md` — pure aggregation of governance + usage + Figma-variable snapshots; derives the deprecated-token migration backlog. `sense-component.js <Name>` narrows the baseline to one component (`.claude/handoff/runs/<Name>.snapshot.json`, gitignored, regenerable). Wired as `npm run sense` / `npm run sense:component <Name>`.
- **Handoff artifact lifecycle** (ADR-015, 2026-07-07/08): markdown handoffs carry `status`/`created`/`completed` frontmatter, named `YYYY-MM-DD-slug.handoff.md`, committed (active + archive); per-run component-loop JSON lives in gitignored `handoff/runs/`. `npm run handoff:tidy` archives done/superseded handoffs, regenerates `handoff/index.json` (read that, never glob the directory), and promotes `<Name>.run.json` records into the committed `run-ledger.json`.

**Amendment (2026-07-10):** a post-merge CI `sense.js` run had regressed the committed `component-pipeline.json` because review state lived only in gitignored `.claude/handoff/runs/`. Fixed with a new committed file, `.claude/component-review-state.json` — `sense.js` merges local `runs/` artifacts over it (newest wins) and never regresses it in CI (ADR-015 amendment).

## Phase 9 — The Verified Component Loop (pilot) *(done)*

- `/add-component <Name>` wires sense → scaffold → gate (`metadata:validate && typecheck && build`) → visual checkpoint (human sign-off in Storybook) → `/review-component`.
- Three a11y tiers gate every component: static lint (`jsx-a11y`), behavioral (`<Name>.a11y.test.tsx` via Vitest + `vitest-axe`, required only for interactive components, shrinking `a11y-backlog.json` for pre-existing gaps), and deterministic token contrast (`token-contrast-check.js` against **built** theme CSS — found and fixed 12 failing pairs in light / 6 in dark, issue #20).
- Per-run logs promote into the committed run-ledger via `handoff:tidy` (Phase 8).
- **Pilot result:** Badge shipped cleanly; Accordion confirmed the adversarial reviewer earns its cost — caught a silent `aria-controls` dead-reference bug the gate and axe scanner both missed. ADR-007 promoted `proposed` → `accepted`.

**Since piloted:** a generic Vitest sweep (`a11y-stories.sweep.test.tsx`, `npm run a11y:stories`) composes every story via Storybook portable stories and runs axe on first render — baseline a11y coverage that grows with every new story, no per-component test file needed (jsdom, not browser mode — ADR-008, 2026-07-14 amendment). Separately, `npm run screenshot:check|approve` (ADR-019) adds committed PNG baselines + perceptual diff per component/theme, advisory in CI.

Remaining:
- [ ] `docs/add-component-loop-case-study.html` — stage-by-stage write-up of the Accordion pilot, written 2026-06-23. Out of date (predates the Stage 2b visual checkpoint and the `/review-component` split); needs a refresh before linking it from Phase 11/12.

## Phase 10 — Component Lifecycle Status (two axes) *(done)*

> Splits the overloaded single `Status` field into **Maturity** (`beta`/`ready`/`deprecated`, code-owned via `component.status`) and **Implementation** (pipeline-derived, `done`/`todo` human-owned in Airtable). ADR-010.

- Airtable schema split by hand (`Status` → `Maturity`, new `Implementation` field — MCP token lacked schema-write access).
- `sense.js` derives the Implementation stage from handoff artifacts, layers human `done`/`todo` over it, and emits `.claude/component-pipeline.json`; `airtable-pull.js` pulls human sign-off → `.claude/component-signoff.json` (the one Airtable → code direction for components); `airtable-sync.js push:components` pushes both axes with a "never downgrade a human `done`" guard (`npm run airtable:sync:components` = `sense` + push).
- All 27 components reset to `beta` pending per-component review; promotion to `ready` is a deliberate metadata PR.

**Amendment (2026-07-12/13, issue #64):** derived labels named the opposite of what they meant, so `Implementation` was consolidated to four broad stages (`todo`, `in progress`, `in review`, `done`) plus a per-component review checklist (automated gate → visual review → code review → learnings back-fill) rendered by `sense.js`, no new stored state. Review-path values settled on plain tier words: `full` (`/review-component`, adversarial subagent) and `standard` (`/code-review`, no subagent) — `sense.js` normalizes all legacy names on read. `npm run status` (`scripts/status.js`) added as a terminal view over the frozen snapshots.

---

## Pivot — Case-study visibility (Phase 11)

> Phases 1–10 built the system; nothing outside Storybook makes it *visible*. This pivot adds a public artifact — one shareable URL — for demonstrating the pipeline in interviews: real responsive pages, a health dashboard exposing the frozen-memory snapshots a maintainer would actually watch, an interactive pipeline diagram, and an `llms.txt`. `apps/showcase` is a workspace in this monorepo, consumes built token CSS + the frozen component set only, and adds no new always-on automation; the dashboard reads committed frozen files, never live Airtable/Figma calls. A companion sub-phase (11.5) drafts source material for a system narrative that ships externally, on the maintainer's portfolio — not part of this shareable URL.

## Phase 11 — Public Showcase & Health Dashboard *(in progress)*

**Showcase pages** — real pages generated via `/layout-generation`, composing the fixed set only.

Done: `apps/showcase` workspace scaffolded (Vite + React + TypeScript + `react-router`, all four routes stubbed); Course Overview page (`/showcase/course`) is a real, generated page; `deploy-showcase.yml` publishes to GitHub Pages (https://f4cu.github.io/upskill-design-system/) on every `main` merge touching it (Vite `base` path + SPA fallback in place).

Remaining:
- [x] Homepage page (`/showcase/homepage`) — real, generated page (Figma node 96:6110). Carries the learner-facing view: a continue-learning chapter stepper, a saved-courses carousel, a discover-courses carousel, and the featured-collection/footer reused from other showcase pages. Uses the default `upskill` brand, same as the rest of the showcase — the multi-brand (`horizon`) demonstration lives on the Pipeline Health Dashboard instead (see below), not here.
- [ ] Settings page (`/showcase/settings`) — stub; generate from the SettingsForm composed story.
- [ ] Cross-page navigation via `AppHeader`.
- [ ] Responsive + theme QA on all three showcase pages (desktop/tablet/mobile × light/dark).
- [ ] Root build chain extended to include the showcase app.

**Pipeline Health Dashboard** (`/dashboard`, maintainer-facing) *(done)* — full spec: `.claude/handoff/archive/pipeline-dashboard.handoff.md`. DAG hero (pipeline diagram, own components + inline SVG) at the top of `/dashboard` and standalone at `/pipeline`, with progressive disclosure of which agentic moments touch each node; `.claude/pipeline-status.json` (CI conclusions + open issues, `gh`-captured pre-deploy) joins the existing frozen snapshots at build time only; dashboard views for component lifecycle (both axes), token governance backlog, Figma drift, and open issues, sharing one small chart primitive; QA gate (`layout:validate`, responsive + light/dark, keyboard-only pass) green. Note: the `horizon`-brand (multi-brand outside Storybook) demonstration originally scoped to Homepage belongs here instead — not yet applied; a follow-up, not a Phase 11 blocker.

**`llms.txt`** *(agent-facing, not part of the human demo — piggybacks on the showcase deploy because it needs a public site root, not because it shares the showcase's audience):*
- [ ] Generated at the site root from real metadata + semantic token names, following the llms.txt convention.

## Phase 11.5 — Case-Study Source Material *(done)*

Source material for the maintainer's portfolio (a separate repo) — not a page shipped from this site: no landing-page or Storybook link, no `docs/system-case-study.html` build target. Five sections drafted in narrative voice under `docs/case-study-source/` (token pipeline as source-of-truth rationale, automation vs. agentic moments, Airtable governance flow, benefits by audience, rejected alternatives), staying in this repo purely as reusable source text. `docs/add-component-loop-case-study.html` is out of scope for the same reason — left as-is, no refresh needed unless the portfolio piece wants to pull from it.

---

## Pivot — Standalone documentation site (Phase 12)

> A third documentation artifact, distinct from the narrative case study and the live `apps/showcase`: a plain-markdown reference site — "how this system actually works, page by page." Full spec, sources, and IA: `.claude/handoff/archive/docsify-docs-site.handoff.md`.

## Phase 12 — Docsify Reference Site *(in progress — site built, Pages pending)*

Done:
- Docsify shell around `docs/`; nine pages (`00-start-here` through `08-glossary`) referencing every ADR (001–016) and command (11 files).
- Mermaid diagrams for spatial/sequential relationships in a scrollable container; `add-component-loop-case-study.html` linked as a standalone artifact.
- Mobile-friendly at 375–430px with no forced horizontal scroll.
- `docs-check.js` staleness gate wired into CI, with its inaugural `/docs-sync` run (PR #36) fixing real drift in 6 of 9 pages (Phase 7).
- Glossary consolidated into the single `08-glossary.md` and the duplicate pre-docsify `npm-scripts-reference.md` removed.

Remaining:
- [ ] GitHub Pages enabled off `main` (`/docs`) — not yet live.

Open question (deliberately unresolved): cross-linking with the Phase 11 case study and `apps/showcase` once both exist.

---

## Pivot — Multi-brand tokens (Phase 13)

> A shared core plus a per-brand identity layer (color ramp mapping, font family, border radius), selected via `data-brand`. Second brand (`horizon`) is fictional, built from existing primitive hues — no new ramps, no Airtable/Figma changes (ADR-012). Full spec: `.claude/handoff/archive/2026-07-03-multi-brand-refactor.handoff.md`.

## Phase 13 — Brand Layer *(done)*

- Core extracted to `brands/upskill.json` with `theme/{light,dark}.json` reshaped to brand-agnostic `var()` references, guarded by a shape gate + no-inlined/no-dangling gate (verified bit-for-bit equivalent to the pre-refactor build).
- Second brand `horizon` added (`brand → cyan`, `accent → teal`, `neutral`/`surface → grey`) with a Storybook brand toolbar; contrast triage during that work made `cyan` brand-eligible (patched light ramp, added dark ramp).
- ADR-012 recorded; CLAUDE.md documents the four-layer model and brand-eligibility rule; `run-storybook` gained `--brand`.
- Follow-up issues filed during triage — #22 (raw-ramp `var()` consumers in dark mode), #21 (`text.brand`/`text.selected` contrast), #23 (horizon `border.selected` contrast) — are all closed.

---

## Pivot — Cross-component pattern schema (Phase 14)

> Adds a cross-component aggregate — which components implement the same interaction pattern, canonical prop shape, where implementations drift — as a frozen-snapshot file. Pre-registered honest-outcome rule: no measured accuracy delta, no ship.

## Phase 14 — Pattern Aggregation & Accuracy Harness *(done)*

`scripts/generate-pattern-schema.js` → `.claude/component-patterns.json` (pattern buckets, ARIA contracts, composition surfaces, prop-name drift), validated by a 7-task × 2-arm accuracy harness scored by deterministic gates + a trap checklist. Result split by kind: composition 6→1 violations, layout 7→3, **component scaffolds 19→24 (regression)**. Ship decision followed the measured delta (**ADR-013**): the pattern file is a `/layout-generation`-only consumer, explicitly not injected into `/component-scaffold`. CI staleness check in `components-check.yml` (regenerate + diff on every PR touching components); `/add-component` and `/review-component` regenerate and commit the file as part of their gates.
