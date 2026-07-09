# UpSkill Design System

## Project purpose

A learning-first, **lite agentic** design system for a small SaaS product. Lite means: a fixed, small component set (layout primitives, typography, Button, form inputs, Card — nothing more), and economic maintenance — recurring automation is scripts + GitHub Actions with direct REST calls; MCP servers are for one-off interactive tasks only; agent involvement is limited to nine defined moments (see "Agentic moments"). One person must be able to maintain the whole system.

Pipeline: Figma → token export → Style Dictionary build → CSS/JS outputs → coded components, with Airtable as the governance layer and GitHub Actions as the automation layer. See `ROADMAP.md` for phase status and integration/phase status detail.

## Where knowledge lives (read before adding to this file)

This file loads into every session. Its budget is **≤200 lines and ≤20KB**, enforced by `npm run claudemd:check` in CI (ADR-017). Before adding anything here, route it to the narrowest surface that is visible when it matters:

| Knowledge | Home |
|---|---|
| Only matters when touching component code | `.claude/rules/components.md` (path-scoped: `packages/components/**`) |
| Only matters when touching token source/build | `.claude/rules/tokens.md` (path-scoped: `packages/tokens/**`) |
| A procedure or multi-step workflow | The relevant command in `.claude/commands/` |
| Rationale, history, dated amendments, alternatives | The ADR |
| Human-facing reference or tutorial | `docs/` |
| Something that must happen every single time | A script or CI gate, never prose |

This file keeps only cross-cutting invariants, indexes that point elsewhere, and policies that apply to any session. Litmus test per line: would removing it cause a mistake in *most* sessions? If not, it lives elsewhere. The same test applies to each rules file against its path scope.

## Token architecture

### Four-layer model

Tokens resolve in this fixed order — later layers override earlier ones:

| Layer | Files | Purpose |
|---|---|---|
| Primitives | `primitives.json` | Raw, context-free values. Single source of truth. Authored as code (hand-edited via PR); Figma is a downstream mirror. See ADR-002 amendment. |
| Brand | `brands/<brand>.json` (e.g. `upskill`, `horizon`) | Per-brand color ramp mappings (`brand`, `accent`, `neutral`, `surface` slots), `font.family.*`, and literal `border-radius.*`. See ADR-012. |
| Theme | `theme/light.json`, `theme/dark.json` | Brand-agnostic semantic color aliases. Reference brand slots or functional primitives via `{path.to.token}` — never a brand's underlying hue directly. |
| Device | `device/desktop.json`, `device/tablet.json`, `device/mobile.json` | Responsive spacing, grid, typography per breakpoint. |

Breakpoints: desktop ≥ 1440px, tablet ≥ 768px, mobile < 768px. Runtime brand selection is a `data-brand` attribute, mirroring `data-theme`; import order in `tokens.css` (primitives → default brand → non-default brands → device → theme.light → theme.dark) is load-bearing for cascade correctness at equal specificity — see ADR-012.

Format is W3C DTCG (`$type`/`$value`, curly-brace aliases, never commit `$extensions`). Scales, naming conventions, line-height convention, and build detail: `.claude/rules/tokens.md`. Authoring procedure: `/tokens-author`.

## Style Dictionary build

`npm run tokens:build` transforms DTCG source into CSS custom properties and JS/TS constants (`packages/tokens/build.js`). **Invariant:** components only ever consume the built output, never source JSON. Brand/theme build mechanics and post-build gates: `.claude/rules/tokens.md` and ADR-012.

## Figma sync

**Vocabulary:** A **token** is a committed DTCG JSON value in `packages/tokens/src/` (source of truth, code-side). A **variable** is the downstream representation of a token inside a Figma collection.

**The committed DTCG JSON is the source of truth, not Figma** (ADR-002 amendment). Code-first is forced by plan limits: the Variables REST API and Code Connect are Enterprise/Org-only, so the only automatable sync direction is code→Figma (interactive, via the Figma plugin/MCP). Figma is a downstream mirror and design-exploration surface; a value invented in Figma is a proposal until it lands in `primitives.json` via PR. Before pulling Figma changes into committed tokens, run `/figma-variable-audit` as a drift check — never overwrite primitives without diffing against current usage.

**Representational divergences are not drift.** Figma cannot store unitless values, so line-heights (unitless ratios in code) always differ in Figma. The audit and push moments exclude them; the running list of accepted divergences lives in the drift memory note (`figma-file-variable-drift.md`). See ADR-002.

**The brand layer is not mirrored to Figma.** `/figma-variable-audit` and `/figma-variable-push` operate on the single default brand only — deliberately scoped out, not a gap (ADR-012, Deferred).

## Frozen-memory snapshots

Moments and loops read the system's status quo from **committed files, never live APIs** — this shields agents from rate limits and keeps each agent's context small. Read-not-call artifacts:

| File | Source | Captured by |
|---|---|---|
| `airtable-governance.json` | Airtable (`status`/`owner`/`successor`/`notes`) | `scripts/airtable-pull.js` (REST) |
| `token-usage.json` | Repo scan (`var(--ds-*)` CSS refs + `{alias}` refs) | `scripts/token-usage.js` |
| `figma-variables.json` | Figma variables (REST API is Enterprise-gated, so captured interactively, not by script) | `/figma-variable-audit` via Figma MCP |
| `.claude/component-signoff.json` | Airtable (`Implementation` = human `done`/`todo`) | `scripts/airtable-pull.js` (REST) |
| `.claude/component-pipeline.json` | Component metadata + handoff artifacts + sign-off | `scripts/sense.js` (`npm run sense`) |
| `.claude/component-patterns.json` | Cross-component pattern aggregate (deterministic AST + metadata scan) | `scripts/generate-pattern-schema.js` |
| `.claude/STATUS_QUO.md` | Aggregate of the above | `scripts/sense.js` (`npm run sense`) |

Regenerate `STATUS_QUO.md` with `npm run sense` before a loop run; per-component context is narrowed to `.claude/handoff/runs/<Name>.snapshot.json` by `npm run sense:component <Name>`.

**Component lifecycle has two axes** (ADR-010): **Maturity** (`component.status`, pushed code → Airtable) and **Implementation** (pipeline stage; `done`/`todo` are human-set in Airtable and win over the derived stage; the push never overwrites an Airtable `done`). The two live in separate Airtable columns so a pushed value and a human value never collide.

`component-patterns.json` is consumed by `/layout-generation` **only** — measured improvement there, measured regression in `/component-scaffold`, so never inject it into scaffolds (ADR-013). `components-check.yml` enforces staleness on every PR touching components.

**Handoff artifacts** (ADR-015). Markdown handoffs in `.claude/handoff/` are committed, named `YYYY-MM-DD-slug.handoff.md`, with 3-line frontmatter (`status: active|done|superseded`, `created:`, `completed:`). Per-run component-loop JSON (`<Name>.{snapshot,review,run,learnings}.json`) lives under the gitignored `.claude/handoff/runs/`, regenerable via `npm run sense:component <Name>`. `npm run handoff:tidy` archives `done`/`superseded` handoffs, regenerates `handoff/index.json` (read that index, never glob the directory), and promotes each `<Name>.run.json` into the committed append-only ledger `.claude/handoff/run-ledger.json` — the only place per-run review telemetry survives; read it to judge empirically whether the adversarial-review stage earns its cost.

## MCP tools — when to use vs when to avoid

General rule: MCP calls are for **interactive, one-off tasks with the developer present**. Anything recurring, scheduled, or CI-bound uses a script with direct REST calls. Never put an MCP call inside a GitHub Action or a loop over many records.

| MCP | Use it for | Do NOT use it for |
|---|---|---|
| **Figma** | Reading variables/design context in `/figma-variable-audit`; design context when scaffolding; writing variables in `/figma-variable-push`. | Treating Figma as the token source (ADR-002). Bulk-reading many nodes. |
| **Airtable** | One-off schema changes; ad-hoc inspection of a few records when debugging sync. | Token sync (use `scripts/airtable-sync.js`). Reading governance state — read the committed `airtable-governance.json`. Bulk record operations. |
| **GitHub** | Rarely — cross-repo searches the `gh` CLI handles awkwardly. | Everything else; prefer `gh` CLI. |
| **Google Drive / Notion** | Fetching a spec or planning note the user explicitly links. | Anything recurring; a docs target — docs live in Storybook (components) and Airtable (tokens). |

If a task could be done with a committed file, a script, or the `gh` CLI, do it that way even when an MCP tool is available.

## Git workflow

Commit directly to the current branch — do not create new branches unless explicitly asked. This is a solo project. Exceptions (agent-generated output always goes through a PR, never straight to `main`):

- `/review-component` (also inside `/add-component`): branch `component/<kebab-name>`, PR against `main`.
- `/docs-sync`: branch `docs-sync/<YYYY-MM-DD>`, PR.
- `/layout-generation`: branch `layout/<kebab-name>`, PR, reviewed in-session with `/code-review` by default (adversarial subagent opt-in for full route pages) — ADR-016.

## Commands and skills

`.claude/commands/` — prompt-only slash commands; all agentic moments live here. `.claude/skills/` — slash commands with companion code; only `run-storybook` (ships `driver.mjs`). Note: Claude Code's naming is the inverse of intuition — "skills" are the ones with code, "commands" are the prompts.

## Agentic moments

The only scenarios where invoking Claude with MCP context is worth the cost. All developer-triggered; full inputs, steps, and success signals live in each command file — this is the index and the load-bearing invariants. Everything else is a script or a GitHub Action.

| # | Moment | Command | Invariant that must survive |
|---|---|---|---|
| 1 | Figma variable audit (drift check) | `/figma-variable-audit` | Never overwrite primitives without a usage diff; capture the read into `figma-variables.json`; exclude representational divergences. |
| 2 | Token deprecation pass | `/token-deprecation-pass` | Replace usages with the Airtable `successor`; read `airtable-governance.json`, no MCP. |
| 3 | Component scaffold | `/component-scaffold` | Read schema + template + Figma context; produce the four component files. |
| 4 | Layout generation | `/layout-generation` | Only fixed-set components and tokens; every structural choice cites a metadata rule. |
| 5 | Figma variable push (code → Figma) | `/figma-variable-push` | Write only clean-missing variables; never delete or overwrite without explicit confirmation. |
| 6 | Add component (verified scaffold) | `/add-component` | Sense → scaffold → gate → visual checkpoint → moment 7. Frozen snapshot is the only handoff. ADR-007. |
| 7 | Review component | `/review-component` | One fresh adversarial subagent; branch `component/<kebab-name>`; writes `.review.json` + `.run.json` for moment 8. |
| 8 | Extract learnings | `/extract-learnings` | Route each finding to its durable home — component metadata first; token conventions → `/tokens-author`; contrast misses → the curated `PAIRS` list. `--all` proposals require developer confirmation. |
| 9 | Docs sync | `/docs-sync` | Detection is CI (`npm run docs:check`); rewriting is developer-triggered, never CI. Rewrite only stale sections; never touch Autodocs/docgen-owned content. One read-only `docs-scribe` subagent reviews rewritten sections before the PR (ADR-018). PR on `docs-sync/<date>`. |

**For existing component reviews:** `/review-component <Name>` for a full adversarial pass; `/code-review` on the diff for a lighter in-session review with no subagent or handoff file.

**Ad-hoc loops vs continuous loops.** A developer-triggered loop that runs a bounded sequence once and stops (moment 6) is allowed. A *continuous* loop, scheduled agent run, or always-on watcher is not: push back and propose a script, a GitHub Action, or one of these moments instead.

**On-demand loop guardrails** (moment 6 and any future loop):
- **Sequential, ≤2 agents.** Spawn at most one fresh subagent (the adversarial reviewer). No parallel swarm: on Claude Pro the scarce resource is the rolling usage window; parallel agents drain it N× and trip rate limits.
- **Frozen-file handoffs only.** Each stage reads a committed/cached snapshot — never stream raw data between stages or make live API calls mid-loop.
- **Deterministic work stays a script.** Sensing, validation, typecheck, build are `npm` scripts. Agents only do what a script can't.
- **Fail-fast.** If the gate fails, bounce back to the scaffold stage with the error.
- **No agent code reaches `main` unreviewed.** Deterministic gate + adversarial review before a human PR opens.

## Layout grammar

Every page follows a fixed hierarchy mapping Figma structure to HTML landmarks (ADR-011). The full grammar table lives in `/layout-generation`; enforce deterministically with `npm run layout:validate <file>`.

Load-bearing invariants for **any** layout file (hand-edited or generated):
- Exactly one `<Box as="main">` per route; every `<Box as="section">` has an accessible name (`aria-labelledby` → its `Heading`); every extra `<nav>` has a unique `aria-label`.
- **Inline styles:** allowed only for `.container`/`.grid` classNames and `style={{ flex: '1 0 0' }}` / `minWidth` / `maxWidth`. Forbidden: raw color (use `<Text color=…>` / `<Heading>`), raw token values outside `var()`, arbitrary CSS that belongs in a CSS Module.
- Rely on device tokens for responsive spacing/typography; reflow via `.grid` or `Inline wrap`. Never hand-write `@media` in layout files.

## Coding conventions

### JavaScript / TypeScript (components package, scripts)
- No comments unless the why is non-obvious
- No defensive error handling for internal paths — only validate at external boundaries (Figma API responses, Airtable webhooks)
- Prefer explicit over clever

### File naming
- Token source files: lowercase, no spaces (`primitives.json`, `light.json`)
- Scripts: `kebab-case.js` or `.ts`
- Components: `PascalCase/index.tsx` with co-located styles

Token JSON conventions: `.claude/rules/tokens.md`. CSS Modules, component implementation rules, story conventions, metadata model, and a11y tiers: `.claude/rules/components.md`.

### Component scope

Canonical list — `/component-scaffold` and `/layout-generation` defer to this section.
Core set (Phases 4–5): `Box`, `Stack`, `Inline`, `Text`, `Heading`, `Icon`, `Button`, `TextField`, `Select`, `Checkbox`, `Card`.
Phase 5b additions (User Settings page): `Avatar`, `AppHeader`, `Breadcrumb`, `Divider`, `ProgressBar`, `CardHorizontal`.
Phase 5c additions (Homepage): `CardVertical`, `Chip`, `VideoFrame`, `ButtonArrow`, `ScrollArea`.
Phase 5d additions (Course Overview page): `Accordion`, `Badge`; `Button` gains a `ghost` variant (no background, link text color); `useSlider` hook (content-stepper state, no component).
Do not add components outside these lists without the user explicitly expanding the scope — compose existing ones instead. `Icon` wraps a small fixed set of inline SVGs (no icon-library dependency); glyphs use `currentColor` and size via `size.*` tokens.

Before proposing a new component file, apply the three-question test from ADR-009: (1) same semantic role → add a prop/variant to the existing component; (2) different role despite similar shape → new component; (3) single parent, no other consumer in the fixed set → molecule-internal styled element in the parent's CSS Module. Visual similarity alone is not a reason to create or merge components.

## Architectural decisions (ADRs)

Durable decisions live in `docs/decisions/NNN-kebab-title.md` (template: `000-template.md`). Read the relevant ADR before changing the thing it governs.

**Record one** (as part of the change, not later) for: a change to a contract other code or tooling depends on; a new convention agents must follow to generate or reuse correctly; a reversal or material refinement of an earlier decision; a choice between real alternatives where the reasoning won't be obvious later. **Not** for routine work that follows an existing pattern. Keep the set small.

**How:** new decision → copy the template to the next number, fill Context / Decision / Consequences, `Status: accepted`. Refinement → amend the existing ADR in place (bump `Amended:`, append a dated `## Amendment` section — see ADR-001); reserve a new `superseded by` ADR for a full reversal. The ADR holds the *why*; the *what to do* goes to the narrowest visible surface per "Where knowledge lives" — usually a path-scoped rule or command, CLAUDE.md only when cross-cutting.

## Common tasks

Most recurring work is a skill or command — invoke it rather than reproducing the steps by hand. The nine developer-triggered commands are the "Agentic moments" above.

| Task | How |
|---|---|
| Add/change a primitive token, semantic alias, or the SD build | `/tokens-author` |
| Add a brand | Checklist in `.claude/rules/tokens.md` (ADR-012) |
| Push tokens to Airtable, or pull governance state | `/airtable-sync` |
| Scaffold a new component from the fixed set | `/component-scaffold` |
| Verified component loop (sense → scaffold → review → PR) | `/add-component` |
| Review an existing component after changes | `/review-component <Name>` |
| Light in-session review, no subagent | `/code-review` on the diff + `npm run metadata:validate && npm run typecheck && npm run build && npm run a11y:coverage && npm run a11y:test` |
| Back-fill metadata learnings after a review/bug-fix session | `/extract-learnings <Name>` or `/extract-learnings --all` |
| Regenerate the frozen status-quo snapshot | `npm run sense` (or `npm run sense:component <Name>`) |
| Archive done/superseded handoffs, regenerate index | `npm run handoff:tidy` |
| Rewrite stale `docs/NN-*.md` pages | `/docs-sync` (detection: `npm run docs:check`) |
| Run a11y checks | `npm run lint` (Tier 1) · `npm run a11y:coverage && npm run a11y:test` (Tier 2 — ADR-008) |
| Generate a page or section layout | `/layout-generation` |
| Audit Figma variables against committed tokens | `/figma-variable-audit` |
| Push committed tokens into Figma as variables | `/figma-variable-push` |
| Migrate deprecated token usages to successors | `/token-deprecation-pass` |
| Build, run, or screenshot Storybook | `/run-storybook` |
| Add a story to an existing component | Story conventions in `.claude/rules/components.md` |
| Add a GitHub Action | Workflow YAML in `.github/workflows/`. Actions call scripts and REST directly — never MCP, never Claude. |
| Record or amend an ADR | "Architectural decisions (ADRs)" above |
