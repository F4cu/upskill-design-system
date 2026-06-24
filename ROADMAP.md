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

**Exit condition (met):** `npm run build:tokens` produces CSS + JS outputs; Storybook renders the token inventory in light and dark.

## Phase 1.5 — Token Foundation Review *(done)*

Component metadata schema defined (JSON per component). Device layer cleaned: `layout.headerLayout` removed; `layout.min-width.column` and `layout.min-height.slider` kept (active Figma bindings). ADRs recorded: layout tokens as values (not CSS properties); `space` vs `size` split. Semantic token names audited for intent vs raw scale position.

**Exit condition (met):** naming audit complete; token names stable for components and Airtable.

## Phase 2 — Agentic Foundation *(done)*

Airtable governance fields (`status`, `owner`, `successor`, `notes`); `scripts/airtable-pull.js` → `governance.json`; `scripts/token-usage.js` → `token-usage.json`. Metadata schema validated end-to-end. Six agentic-moment prompt files written to `.claude/commands/`.

**Exit condition (met):** Claude can answer token status + usages from committed files with zero MCP calls; layout briefs produce valid React trees from metadata alone.

## Phase 3 — Component API Foundation *(done)*

CSS reset, `grid.css`, `typography.css` global utilities. Layout primitives: `Box` (polymorphic, inset padding), `Stack` (vertical flex), `Inline` (horizontal flex), `ScrollArea` (hidden-scrollbar overflow, added retroactively in Phase 5c — see ADR-006). Storybook grid/layout stories.

`storybook-design-token` wiring blocked: npm workspace version conflict (Storybook 8 at root vs 10 in components). Token showcase already handled by existing MDX stories; revisit on Storybook version unification.

**Exit condition (met):** sample page layout renders using only `Box`/`Stack`/`Inline` and the grid utility — no ad-hoc CSS.

## Phase 4 — Core Components *(done)*

`Text`, `Heading`, `Icon`, `Button` — semantic tokens, interaction states, size variants, leading icon. Metadata files per component. Code Connect omitted — requires Figma Org/Enterprise plan; not in scope.

**Exit condition (met):** all four components render in both themes with stories and metadata.

## Phase 5 — Component Library *(done)*

Full fixed component set built across four batches. Library frozen at 22 components + 2 hooks.

| Batch | Components |
|---|---|
| Core (5) | `TextField`, `Select`, `Checkbox`, `Card` |
| User Settings (5b) | `Avatar`, `AppHeader`, `Breadcrumb`, `Divider`, `ProgressBar`, `CardHorizontal` |
| Homepage (5c) | `CardVertical`, `Chip`, `VideoFrame`, `ButtonArrow` |
| Course Overview (5d) | `Accordion`, `Badge`, `Button` ghost variant + trailing icon, `useSlider` hook |

Composed example stories: Settings Form, Footer Highlights, Carousel, CourseSlider. `Accordion` and `Badge` shipped through the `/add-component` loop (Phase 9 pilot). `ScrollArea` added retroactively in 5c as a scroll primitive underpinning the carousel pattern (ADR-006).

**Exit condition (met):** all components render in both themes with stories and metadata; library frozen — growth by composition only.

## Phase 6 — Automation (scripts and Actions only — no MCP, no agents)

- [x] GH Action: run `airtable-sync.js` on merge to `main` (direct REST, repo secret for the API key) — `sync-tokens.yml` pushes primitives, semantic, and device tokens, and now also syncs component metadata via `push:components`. Trigger path updated to include `packages/components/src/components/**/*.metadata.json` so component-only commits fire the workflow.
- [x] `scripts/airtable-pull.js` — pulls governance state from Airtable → `governance.json`; wired as `npm run governance:pull`. Run manually before deprecation work until the Action below is built.
- [x] `scripts/airtable-setup-governance.js` — one-time setup that added the governance fields (`status`, `owner`, `successor`, `notes`) to the Airtable tables; safe to re-run. Already executed.
- [ ] GH Action: run `airtable-pull.js` on a schedule or pre-merge so `governance.json` stays current without a manual step (script exists; Action wrapping it is not yet built)
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
- [x] **Post-review retro** (`/post-review-retro`) — the self-improvement loop: reads `.review.json` + `.run.json` handoff files, classifies each finding by the metadata section it belongs to (`accessibility.ariaAttributes`, `accessibility.keyboardInteractions`, `composition`, `usage.antiPatterns`), drafts targeted amendments, gates on `validate:metadata`, opens a PR. Piloted on Accordion (PR #10): 4 metadata sections amended across 6 findings; 3 skipped as one-off bugs with no generalizable lesson. Prevents the same mistakes from appearing in future `/add-component` Stage 3 findings.

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

- [x] `figma-variables.json` — dated, frozen mirror of Figma's variable state, captured **interactively via the Figma MCP** (`use_figma` read-only dump) during `/figma-variable-audit`. Mirrors how `governance.json` mirrors Airtable. 414 vars (Primitives 252 · Theme 102 · Device 60); aliases recorded as `-> target/name`; Enterprise-REST limitation documented inline. Tags the 27 line-height **representational divergences** (Figma stores them as fixed px) so the drift check never flags them (ADR-002, 2026-06-22 amendment). Note: `get_variable_defs` is node-scoped — the full-collection read goes through `use_figma`'s `getLocalVariablesAsync`, captured in three ≤20 KB chunks to fit the MCP response cap.
- [x] `scripts/sense.js` — pure aggregation (no AI): composes `governance.json` + `token-usage.json` + `figma-variables.json` into `.claude/STATUS_QUO.md`, the single readable baseline. No live Figma call — reads the committed snapshot; degrades gracefully when it is absent. Derives the migration backlog (deprecated tokens × live usages) as the actionable signal.
- [x] `scripts/sense-component.js <Name>` — narrows the baseline to one component's relevant tokens + metadata + Figma node, written to `.claude/handoff/<Name>.snapshot.json` (the frozen context a loop stage hands to the next). Works greenfield (no metadata yet) and on an existing component; always carries the deprecation guardrail. Handoff snapshots are gitignored (per-run, regenerated from committed sources).
- [x] `npm run sense` / `npm run sense:component <Name>` wired in `package.json`.

**Exit condition (met):** an agent can answer "what is the full status quo of tokens, governance, and Figma drift" from committed files alone, with zero live API calls. `npm run sense` regenerates `STATUS_QUO.md` deterministically; `npm run sense:component <Name>` writes a per-component handoff snapshot.

## Phase 9 — The Verified Component Loop (pilot)

> The ad-hoc loop itself, piloted on already-planned Phase 5d components so it ships real work, not throwaway. One command, staged with frozen-file handoffs, gated by deterministic scripts, reviewed by one adversarial subagent. This is where the lint/a11y debt lands — as checks inside the review stage, run by CLI, not as separate manual chores.

- [x] `/add-component <Name>` command in `.claude/commands/` (renamed from `/component-loop`), wiring the stages:
  - **Stage 0 · script** — `npm run sense:component <Name>` writes the frozen snapshot.
  - **Stage 1 · in-session** — scaffold from snapshot + metadata schema + template component (reuses `/component-scaffold`, fed the snapshot).
  - **Stage 2 · script gate** — `npm run validate:metadata && npm run typecheck && npm run build`; fail-fast bounces back to Stage 1 with the error.
  - **Stage 2b · visual checkpoint** — gate passed; Claude prompts the developer to open the Default story in Storybook and toggle both themes, then reply `go` or describe issues. `go` with manual edits re-runs the gate first; an issue description triggers a fix cycle before re-surfacing the checkpoint. Nothing proceeds to Stage 3 without a human sign-off.
  - **Stage 3 · one subagent** — adversarial review in a fresh context: `/code-review` on the diff + `npm run lint` (ESLint + `jsx-a11y`) + an a11y read against the metadata `accessibility` block; findings written to `.claude/handoff/<Name>.review.json`.
  - **Stage 4 · in-session** — apply review fixes, re-run the Stage 2 gate, commit on the current branch (no new branch unless asked) and open the PR with `gh`.
- [x] Lint/a11y check wired as `npm run lint` (ESLint 9 flat config in `eslint.config.js`, scoped to `packages/components/src`, with `eslint-plugin-jsx-a11y` as the static a11y gate). The config existed from prior Phase 9 groundwork but no `lint` script invoked it; added the script and brought the baseline to green (fixed a pre-existing `CopyToken` div→button a11y bug). This is **Tier 1** (static), default for all components.
- [x] **Tier-2 behavioral a11y (ADR-008)** — runtime a11y resolved via **Vitest + Testing Library + `vitest-axe` (jsdom)**, not the Storybook test-runner the earlier deferral assumed (so the Storybook version conflict is moot). `npm run test:a11y` runs `<Name>.a11y.test.tsx` assertions (state attributes, focus, keyboard) + an axe scan; `npm run a11y:coverage` (`scripts/a11y-coverage.js`) derives interactivity from metadata and **requires** a behavioral test only for interactive components — Badge and other display/landmark components are exempt. A shrinking `scripts/a11y-backlog.json` ledger waives the six pre-existing interactive components (ButtonArrow, Checkbox, Chip, DropdownMenu, Select, TextField) pending backfill; `Button` is backfilled as the infra proof. Wired into the `/add-component` Stage-2 gate and `components-check.yml`. Color-contrast / visible-focus / real-AT stay out of scope (visual review + addon-a11y panel).
- [x] Per-run log defined in the command — `.claude/handoff/<Name>.run.json` (gitignored): gate pass/fail counts, whether Stage-0 context isolation held, and whether the verifier caught anything the gate missed. Exercised during the pilot.
- [x] **Pilot:** `Badge` shipped cleanly ✓. `Accordion` shipped ✓ — stateful component confirmed the adversarial reviewer earns its cost: it caught a silent `aria-controls` dead-reference bug (panel unmounted on collapse) that the gate and axe scanner both missed, plus Tab-navigation coverage gap in the test suite. 1 gate failure (minor: `process.env.NODE_ENV` → `import.meta.env.DEV`, no `@types/node` in tsconfig), 0 manual rescues. Promote ADR-007 `proposed` → `accepted`.

**Exit condition (met):** both pilot components shipped through the loop with no manual restructuring; the human reviewed only clean code; the loop prompt updated with what was learned. The adversarial reviewer found things the gate could not — the review stage is earning its cost.
