# UpSkill Design System — Roadmap

Progress tracker. `[x]` done · `[-]` in progress · `[ ]` not started. Each phase is sized for 1–2 focused sessions and ends with an exit condition — don't start the next phase until the current one meets it.

## What "lite agentic" means here

Lite in two ways:

1. **Small surface.** The library targets one SaaS product with a few simple pages. The final component set is fixed: `Box`, `Stack`, `Inline`, `Text`, `Heading`, `Icon`, `Button`, form inputs (`TextField`, `Select`, `Checkbox`), and `Card`. Nothing more — a new component needs a reason a composition of these can't cover.
2. **Economic to maintain.** No orchestration layer, no always-on agents, no scheduled loops. Recurring automation is plain scripts and GitHub Actions calling REST APIs directly. MCP servers are reserved for interactive one-off tasks with a human in the loop — they are expensive per call and each one is maintenance surface.

"Agentic" means a small, fixed set of **developer-triggered moments** where Claude reads structured context the repo already provides (token JSON, component metadata, Airtable governance state, Figma variables) and produces something a script can't: an audit, a migration plan, a scaffold. Three moments are defined (Phase 7). Each has a named trigger, declared inputs, a concrete output, and a success signal. Anything that needs to run on every PR or merge is a script, not an agent. The whole system stays readable and maintainable by one person.

---

## Phase 1 — Infrastructure

- [x] Monorepo structure + npm workspaces
- [x] Token JSON files (primitives, theme, device layers)
- [x] GitHub repo
- [x] Airtable connected — `scripts/airtable-sync.js` pushes primitives/semantic/device tokens to three tables (one-directional, code → Airtable)
- [x] Style Dictionary: CSS custom properties output for web
- [x] Style Dictionary: custom platform config for device tokens — desktop to `:root`, tablet/mobile wrapped in `@media` blocks (single CSS output file)
- [x] Custom SD transforms: px→rem, font-weight string→numeric, `$root` rename, media query combiner
- [x] React + Vite + TypeScript in `packages/components`
- [x] Storybook: install + configure `addon-themes` (light/dark toggle via `data-theme`)
- [x] Token showcase stories (color swatches, spacing scale, type ramp, border radius — MDX)
- [x] GitHub Actions: token build check on PR

**Exit condition (met):** `npm run build:tokens` produces CSS + JS outputs from DTCG source; Storybook renders the token inventory in light and dark.

## Phase 1.5 — Token Foundation Review

> Audit and clean up the token layer before building on top of it. Nothing here changes the design — it removes noise and documents decisions.

- [x] Define component metadata schema (JSON per component: purpose, variants, relationships, anti-patterns) — example file in place
- [x] Remove Figma-artifact tokens from device layer — `layout.headerLayout` deleted (0 usages). `layout.min-width.column` (32 usages) and `layout.min-height.slider` (8 usages) kept: actively bound in Figma; will move to component CSS Modules when those components are built
- [x] ADR: layout tokens = values (spacing, grid config), not CSS properties
- [x] ADR: `space` vs `size` — `space` for spacing (gap, padding, margin); `size` for component dimensions (icon, avatar)
- [x] Review `space.inline` duplication across breakpoints
- [x] Audit semantic token naming — tokens should describe intent, not raw scale positions or ambiguous names

**Exit condition:** naming audit complete and any renames merged. Token names are stable enough that components and Airtable records can reference them without churn.

## Phase 2 — Agentic Foundation

> Make the system's state readable by an agent **before** components exist, so every component is born with structured context around it. No MCP required for any of this — plain scripts and committed JSON.

**Governance infra — do these first; they unblock the deprecation agentic moment:**

- [x] Airtable governance fields on token records: `status` (`active` | `deprecated`), `owner`, `successor` (dot-path to replacement token, e.g. `color.terracotta.9`; nullable — not every deprecated token has a direct successor), `notes`
- [x] `scripts/airtable-pull.js` — dump governance state to `packages/tokens/governance.json` via REST, so Claude and CI read Airtable state from a committed file, not live MCP calls. Until Phase 6 automates this, run it manually before any deprecation work.
- [x] `scripts/token-usage.js` — output `token-usage.json` with two maps: (1) **CSS usages**: scan `packages/components` for `var(--ds-*)` references → `token → [files]`; (2) **alias usages**: scan token source JSON for `{path.to.token}` references → `token → [files]`. Both maps feed the deprecation agentic moment and the PR diff comment.

**Metadata and prompts — begin once the token layer is stable:**

- [x] Validate the metadata schema with one end-to-end agent prompt — give Claude only a metadata file and ask it to explain when (not) to use the component; fix the schema where the answer is wrong
- [x] Write the four agentic-moment definitions as prompt files in `.claude/commands/` (trigger, inputs, output, success signal — see Phase 7)

**Exit condition:** Claude can answer "what is this token's status, who owns it, and where is it used" from files in the repo alone, with zero MCP calls. Additionally, given all component metadata files, Claude can produce a valid React tree from a one-paragraph layout brief — selecting the right components, respecting `accepts`/`containedBy` constraints, and drawing from named `compositionPatterns`. If the output requires manual structural correction, the metadata is not rich enough and must be revised before Phase 3 begins.

## Phase 3 — Component API Foundation

> The structural layer every component depends on. No design decisions — wiring existing tokens to CSS and the primitives everything else composes from.

- [x] CSS reset / base styles
- [ ] `grid.css` utility — consumes `var(--ds-grid-columns)`, `var(--ds-grid-gutter)`, `var(--ds-grid-margin)` to produce a reusable `.container`. No new tokens
- [ ] Typography scale styles — map `font.*` device tokens to base element and utility class styles
- [ ] `Box` — polymorphic `div` with CSS Module; padding via `space.inset.*` tokens
- [ ] `Stack` — `display: flex; flex-direction: column`; `gap` prop maps to `var(--ds-space-stack-*)`; `align` / `justify` props for alignment
- [ ] `Inline` — horizontal counterpart to `Stack`; `gap` maps to `var(--ds-space-inline-*)`; `align` / `justify` props; wraps by default (`flex-wrap: wrap`)
- [ ] Metadata file for each primitive (schema from Phase 1.5)
- [ ] Storybook: grid layout story, `Stack`/`Inline` gap-variant stories
- [ ] Wire `storybook-design-token` to SD CSS output for automatic token swatches

**Exit condition:** a sample page layout renders in Storybook using only `Box`/`Stack`/`Inline` and the grid utility — no ad-hoc CSS.

## Phase 4 — Core Components

> Establish the full pattern — token → CSS Module → component → metadata → story → Code Connect — so every later component has a template.

- [ ] `Text`, `Heading` — consume font device tokens and unitless line-heights
- [ ] `Icon` — single wrapper over a small fixed set of inline SVGs (hand-picked, no icon-library dependency); `currentColor` fill so it inherits text color; `size` prop maps to `size.*` tokens. Add a semantic `size.icon.*` alias if more than one component needs the same icon size
- [ ] `Button` — semantic color tokens, interaction states, size variants via `space.inset.*`; optional leading `Icon`
- [ ] Complete metadata file per component
- [ ] Code Connect: map `Button`, `Text`, `Heading` to their Figma components (one-off via Figma MCP) so design ↔ code navigation works in both directions
- [ ] Document the component pattern in CLAUDE.md "Add a coded component" so the scaffolding moment has a template to follow

**Exit condition:** all three components render in both themes with stories and metadata; clicking the Figma component shows the coded implementation via Code Connect.

## Phase 5 — SaaS Component Set

> The rest of the fixed library. After this phase the library is frozen — growth happens by composition.

- [ ] `TextField` (label, error state)
- [ ] `Select`
- [ ] `Checkbox`
- [ ] `Card`
- [ ] Metadata + stories for each
- [ ] One composed example page story (e.g. a settings form) built entirely from library components

**Exit condition:** the example page uses only library components and tokens; component set declared complete.

## Phase 6 — Automation (scripts and Actions only — no MCP, no agents)

- [x] GH Action: run `airtable-sync.js` on merge to `main` (direct REST, repo secret for the API key) — `sync-tokens.yml` pushes primitives, semantic, and device tokens
- [ ] GH Action: PR comment with token diff summary — deterministic script comparing built token output between base and head
- [ ] GH Action: run `airtable-pull.js` on a schedule or pre-merge so `governance.json` stays current
- [ ] Changelog generation from token diffs on release

**Exit condition:** merging a token change updates Airtable with no manual step, and token PRs show a diff comment. Everything in this phase runs without Claude.

## Phase 7 — Agentic Moments

> The three moments, implemented as `.claude/commands/` prompts (written in Phase 2). Developer-triggered, infrequent, each with a success signal. No continuous loops, no schedulers.

- [ ] **Figma token audit** — trigger: developer, before replacing `primitives.json` with a fresh Figma export. Inputs: Figma variables (Figma MCP, one-off read) + committed token files + `token-usage.json`. Output: a diff report flagging removed/renamed tokens with usages, broken aliases, scale-mixing and naming violations — then the cleaned export as a PR. Success signal: no Figma drift ever merges silently.
- [ ] **Token deprecation pass** — trigger: developer, after marking tokens deprecated in Airtable. Inputs: `governance.json` + `token-usage.json` + component metadata. Output: a migration PR replacing deprecated-token usages with their `successor`, plus notes where no successor fits. Success signal: zero component references to deprecated tokens.
- [ ] **Component scaffold** — trigger: developer, when starting a Phase 4/5 component. Inputs: metadata schema + an existing component as template + Figma design context (MCP, one-off). Output: component folder (index, CSS Module, stories, metadata) + Code Connect mapping. Success signal: build and Storybook pass with no manual restructuring.

- [ ] **Layout generation** — trigger: developer, when starting a new page or section. Inputs: all component metadata files (`relationships.accepts`, `relationships.containedBy`, `relationships.compositionPatterns`, `relationships.layoutBehavior`) + a one-paragraph layout brief (intent, key content areas, constraints). Output: a React component tree using only library components and tokens; each structural choice annotated with the metadata rule or `compositionPattern` that justified it. Success signal: the tree passes a structural validator (checks `accepts`/`containedBy` constraints), builds, and renders in Storybook with no manual restructuring needed.

**Exit condition:** each moment has been run once on a real task, met its success signal, and its prompt file updated with what was learned. After that, the system is "done" — maintenance only.
