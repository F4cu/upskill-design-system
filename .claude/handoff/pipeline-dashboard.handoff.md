# Handoff — Interactive pipeline DAG + Pipeline Health Dashboard (Phase 11)

**Task type:** one-off generation inside `apps/showcase` (no new automation, no new packages).
**Roadmap home:** Phase 11 — "Health dashboard" and "Interactive token pipeline diagram" checkboxes (ROADMAP.md still says "health dashboard"; **Pipeline Health Dashboard** is this handoff's name for the same artifact — don't rename the roadmap checkbox, just note the two refer to the same thing). Check those boxes off as tasks here complete; don't restructure the roadmap.
**Origin:** evaluated an external "self-hosted token pipeline with live DAG UI" blueprint (webhook → runner → Postgres/Redis state → React Flow UI with WebSocket live statuses and retry buttons → NPM/CDN publish). Verdict and adaptation below.

**Scope note — do not confuse with the reserved learner-dashboard showcase page.** This handoff covers only the **Pipeline Health Dashboard** at `/dashboard` (pipeline DAG + governance/lifecycle/drift/issues views, §§2–5 below) — the engineering/maintainer-facing view. There is a separate reserved space for a **product-facing** dashboard page — a showcase of what a logged-in UpSkill learner would see (course progress, KPIs, a table of enrolled/recommended courses), demonstrating the fixed component set composing a real app screen the same way `/showcase/course` and `/showcase/settings` do. That page:
- Is out of scope for this handoff and for Phase 11's Pipeline Health Dashboard tasks — it belongs with the other showcase pages (Phase 11's "Homepage page" checkbox / a future Phase 5c-style addition), not with T1–T6 here.
- Needs its own name distinct from "Dashboard" (already claimed by the Pipeline Health Dashboard at `/dashboard` / `pages/Dashboard.tsx`). Candidates to pick from when that work starts: **"Learner Dashboard"** (`/showcase/learner-dashboard`), **"My Progress"** (`/showcase/progress`), or **"Learning Hub"** (`/showcase/learning-hub`). Not decided here — flag the choice to the developer when that page is scaffolded.
- Should use the **`horizon` brand** (`data-brand="horizon"`), not the default `upskill` brand the other showcase pages use — deliberately demonstrating multi-brand rendering on a second real page (today only Storybook's brand toolbar exercises `horizon`).
- Reuses existing components only (`CardHorizontal`, `ProgressBar`, `Avatar`, `AppHeader`, `Breadcrumb`, `Badge`, table via semantic HTML in `Box`) — no new components, same three-question test (ADR-009) as everything else in this system.

## 1. Verdict on the original blueprint — what fits, what doesn't

**Keep (adapted):** the *visual language* — a DAG of pipeline stages with status indicators, clickable nodes, and a per-node detail view. This is exactly Phase 11's "interactive pipeline diagram" stretch goal.

**Reject (violates the lite-agentic charter, `CLAUDE.md` + ROADMAP Phase 11 pivot note):**

| Blueprint element | Why it doesn't fit this repo |
|---|---|
| Backend runner service, WebSockets, polling server | "No new always-on automation." One person maintains this. The runner already exists: npm scripts + GitHub Actions. |
| PostgreSQL/Redis execution-state DB | Dashboard reads **committed frozen files only** — that's the load-bearing rule every agentic moment follows. State lives in JSON snapshots in git. |
| Git/Figma webhooks triggering pipeline runs | Figma is a downstream *mirror*, not a source (ADR-002 amendment); code→Figma is interactive-only. Git-triggered builds already exist as `tokens-check.yml` / `components-check.yml` / `sync-tokens.yml`. |
| Manual "Retry" button on nodes | Nothing to retry without a server. Replace with a **link to the workflow's latest run on GitHub**, where Re-run already exists, authenticated and audited. |
| Live statuses (Pending/Running) | Statuses become "last known at snapshot time", labeled honestly with the capture timestamp. Never a live API call from the browser. |
| React Flow / xyflow dependency | The DAG is fixed and small (~12 nodes, never user-edited). Render it with the design system's own components + one inline SVG for edges — stronger case-study artifact ("the diagram is built with the system it describes") and zero new deps. Fall back to xyflow only if edge routing genuinely fails; that would be a deliberate dependency decision, note it in the PR. |
| `token-transformer` stage, Android platform, NPM/CDN publish stages | Don't exist here. SD reads DTCG JSON directly; outputs are CSS custom properties + JS/TS constants; distribution is the npm **workspace protocol**, not a registry publish. The DAG must show *this repo's* stages, not the generic tutorial pipeline. |

No ADR needed — everything here follows existing decisions (ADR-002, the frozen-snapshot rule, ADR-009 for where node UI lives). The rejected backend-runner alternative is good material for the case study's "honest rejected-alternatives" section (Phase 11 checkbox) — mention it there.

## 2. Target architecture (the better plan)

```
gh CLI (manual, pre-deploy) ──► .claude/pipeline-status.json   (NEW frozen snapshot)
committed frozen files ────────► build-time import into apps/showcase (deterministic)
        │
        ├─ .claude/component-pipeline.json   → lifecycle view
        ├─ airtable-governance.json + token-usage.json → governance view
        ├─ figma-variables.json              → drift view (representational divergences labeled, not flagged)
        └─ .claude/pipeline-status.json      → DAG node statuses + open-issues view
```

DAG stages (this repo's actual pipeline; each node cites its script/workflow/ADR):
**Figma (mirror)** → **DTCG source JSON** (`packages/tokens/src/`) → **Style Dictionary build** (`tokens:build`) → **CSS/JS outputs** (`dist/`) → **Components** (`@upskill/components`) → **Consumers** (Storybook, `apps/showcase`).
Side rails: **CI gates** (`tokens-check.yml`, `components-check.yml` — status from snapshot), **Airtable sync** (`sync-tokens.yml`, code→Airtable), **Governance pull** (`airtable-pull.js`, Airtable→code), **Contrast check** (`tokens:contrast-check`).

Node statuses: CI-gate nodes get the latest workflow-run conclusion (`success`/`failure` + timestamp + run URL); snapshot-fed nodes get freshness (capture date) and headline counts (e.g. deprecated-in-use count on the governance node). No "Running" state — nothing is live.

## 3. Tasks (delegable, in dependency order)

### T1 — Pipeline status snapshot script
`scripts/pipeline-status.js`, npm script `pipeline:status`. Same conventions as `airtable-pull.js`: plain Node, direct REST via `gh api` (already authenticated), run **manually before deploy** — never in a loop, never at app runtime. Writes `.claude/pipeline-status.json` (committed):
- Per workflow (`tokens-check`, `components-check`, `sync-tokens`): latest run on `main` — conclusion, `updated_at`, `html_url`.
- Open issues: number, title, labels, `html_url` (this satisfies the roadmap's "pending GitHub issues surfaced… prebuild-fetched snapshot" checkbox).
- Top-level `capturedAt` ISO timestamp.
Gate: script runs clean; JSON validates as strict JSON; document the script in `docs/npm-scripts-reference.md`.

### T2 — Deterministic build-time ingestion (roadmap checkbox, line ~164)
Get the committed JSON (`.claude/component-pipeline.json`, `airtable-governance.json`, `token-usage.json`, `figma-variables.json`, `.claude/pipeline-status.json`) into `apps/showcase` at **build time**: prefer a small prebuild copy step (npm `prebuild`/`predev` copying into `apps/showcase/src/data/`, gitignored) over direct `import` of files outside the app root — Vite/tsc rootDir stays clean. Document the mechanism in the app's README section. Hard rule: zero runtime fetches to GitHub/Airtable/Figma.

### T3 — DAG model
`apps/showcase/src/pipeline/model.ts`: typed `PipelineNode[]` / `PipelineEdge[]` for the stages in §2. Node fields: `id`, `label`, `kind` (`source | build | output | consumer | gate | governance`), `description` (one paragraph, interviewer-readable), `links` ({ script?, workflow?, adr?, doc? } — repo-relative paths rendered as GitHub links), `statusSource` (key into pipeline-status.json, or `snapshot-freshness`, or `none`). Fixed column/row coordinates in the model — no auto-layout library.

**Agentic-moment overlay (progressive disclosure).** Add `agenticMoments?: number[]` to `PipelineNode`, referencing the eight moments in CLAUDE.md's "Agentic moments" table by number (e.g. the DTCG-source node cites `[1, 2]` for the Figma variable audit and token deprecation pass; the Components node cites `[3, 6, 7, 8]`; the Consumers node cites `[4]`). This is the mechanism for showing AI as part of the infrastructure rather than a decorative add-on: the moments aren't a separate box on the diagram, they're an attribute of the pipeline stages they actually operate on.

### T4 — DAG renderer (standalone route `/pipeline` + hero at the top of `/dashboard`)
- Composes **only** the fixed component set (`Box`, `Stack`, `Inline`, `Card`, `Text`, `Heading`, `Badge`, `Button`…) plus one inline `<svg>` overlay for edges. The node visual is an app-internal styled element (ADR-009 question 3: single parent, no other consumer → not a new DS component).
- **Page shape on `/dashboard`:** the DAG is the hero — full-width, first thing in `<main>`, above the fold. The lifecycle/governance/drift/issues views from T5 sit **underneath** it, never beside or above. `/pipeline` renders the same DAG standalone, without the views below it.
- **Progressive disclosure, two levels:**
  - *Level 1 (default, collapsed):* the plain pipeline — nodes and edges from §2, statuses visible, no agent detail. This is what a first-time viewer sees; it reads as "here is the pipeline," full stop.
  - *Level 2 (revealed):* a page-level toggle ("Show AI in the pipeline" or similar — `<Button>` with `aria-pressed`) switches every node that has `agenticMoments` into an expanded state showing which of the eight agentic moments touch it, each linking to its `.claude/commands/*.md` definition. Do this as a toggled visual state on the existing nodes (a badge count → an expanded chip list), not a second diagram — the point is that the same six-stage pipeline *is* the infrastructure the agents run against, not a parallel "AI layer."
  - Per-node click/Enter still opens the existing detail panel (aside, not modal), which includes an "Agentic moments" subsection when applicable, alongside description, links, and last-run status.
- For gate nodes, the detail panel's "View run on GitHub" link is the honest replacement for "Retry."
- Status via `Badge` (or a small styled dot) — success/failure/stale, with the `capturedAt` timestamp visible near the diagram ("statuses as of …").
- Colors/spacing from built tokens only (`var(--ds-*)`); light + dark must both work; edges use a neutral semantic token, not a raw value.
- Layout grammar invariants apply (one `<Box as="main">` per route, sections labeled); run `npm run layout:validate` on the route files.

### T5 — Dashboard views (the four roadmap checkboxes)
On `/dashboard`, **below** the hero DAG from T4 (see page shape above), in this order:
1. **Component lifecycle** — both axes (Maturity / Implementation), counts + per-component table from `component-pipeline.json`.
2. **Token governance** — governed/active/deprecated counts + deprecated-in-use migration backlog from `airtable-governance.json` × `token-usage.json`.
3. **Figma drift** — summary from `figma-variables.json`; representational divergences (unitless line-heights) shown as *expected*, visually distinct from real drift.
4. **Open issues** — list from `pipeline-status.json`.
Use existing components (`Card`/`CardHorizontal`, `Badge`, `Text`, tables via semantic HTML inside `Box`). No charting library — counts, badges, and tables; if a bar is wanted, `ProgressBar` exists.

### T6 — QA + gates
`npm run typecheck && npm run build` (root chain — note the roadmap task to extend root build to the showcase app may land separately), `npm run layout:validate` on new route files, responsive QA at desktop ≥1440 / tablet ≥768 / mobile <768, light + dark themes, keyboard-only pass over the DAG (focus order follows pipeline order, panel toggling announced, the Level-2 "show AI in the pipeline" toggle is reachable and its `aria-pressed` state and expanded chip content are both announced). Screenshot evidence in the PR — include one shot of the DAG collapsed and one with the agentic-moment overlay revealed.

## 4. Constraints recap for any executing agent
- Read frozen files; never call Airtable/Figma/GitHub at app runtime. `gh` usage lives only in T1's script, run manually.
- No new dependencies without flagging it as a decision in the PR (xyflow is the only pre-approved fallback, and only for edge routing).
- No new DS components — compose the fixed set; node visuals are app-internal.
- Commit to the current branch (solo-project git workflow); agent-generated component code isn't involved here, so no `component/*` branch needed, but a PR for the whole feature is still the review path if the developer asks for one.
- Out-of-scope bugs found mid-task: prompt to file a GitHub issue, don't silently fix or drop.
