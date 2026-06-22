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
- [x] `grid.css` utility — `.container` (max-width + `--ds-grid-margin` padding) and `.grid` (CSS Grid with `--ds-grid-columns` / `--ds-grid-gutter`); imported globally in Storybook preview
- [x] Typography scale styles — `typography.css` utility classes (`.text-body-default` through `.text-display`) mapping semantic device tokens (`--ds-font-size-*`, `--ds-font-line-height-*`, `--ds-font-family-*`, `--ds-font-weight-*`); imported globally in preview
- [x] `Box` — polymorphic via `as` prop; `padding` / `paddingX` / `paddingY` via `--_padding` private CSS properties mapped to `--ds-space-inset-*` tokens
- [x] `Stack` — `display: flex; flex-direction: column`; `gap` maps to `--ds-space-stack-*`; `align` / `justify` props via `--_align` / `--_justify` private CSS properties
- [x] `Inline` — horizontal counterpart to `Stack`; `gap` maps to `--ds-space-inline-*`; wraps by default; `wrap={false}` adds `.noWrap`
- [x] Metadata file for each primitive (`Box.metadata.json`, `Stack.metadata.json`, `Inline.metadata.json`)
- [x] Storybook: `Layout/Grid` page section story (exit condition), `Stack`/`Inline` gap-variant stories, `Box` padding-scale story
- [x] `ScrollArea` — overflow scroll container that hides the native scrollbar cross-browser; `orientation`: `horizontal` | `vertical`. Retroactively added in Phase 5c after identifying the need for a standardised scroll primitive to underpin the carousel and other overflow patterns (see ADR-006).
- [-] Wire `storybook-design-token` to SD CSS output — blocked: npm workspace has storybook@8 at root conflicting with storybook@10 in components; token showcase is already handled by existing MDX stories (Colors, Spacing, Typography, BorderRadius). Revisit when upgrading the npm workspace to a consistent Storybook version.

**Exit condition (met):** a sample page layout renders in Storybook using only `Box`/`Stack`/`Inline` and the grid utility — no ad-hoc CSS.

## Phase 4 — Core Components

> Establish the full pattern — token → CSS Module → component → metadata → story → Code Connect — so every later component has a template.

- [x] `Text`, `Heading` — consume font device tokens and unitless line-heights
- [x] `Icon` — single wrapper over a small fixed set of inline SVGs (hand-picked, no icon-library dependency); `currentColor` fill so it inherits text color; `size` prop maps to `size.*` tokens. Add a semantic `size.icon.*` alias if more than one component needs the same icon size
- [x] `Button` — semantic color tokens, interaction states, size variants via `space.inset.*`; optional leading `Icon`
- [x] Complete metadata file per component
- [x] Document the component pattern in CLAUDE.md "Add a coded component" so the scaffolding moment has a template to follow
- [~] Code Connect: blocked — requires Figma Organization or Enterprise plan (current plan: Pro personal). `Text` and `Heading` also have no Figma component sets (they use text styles). No plans to upgrade. Omitted from scope.

**Exit condition:** all four components render in both themes with stories and metadata. Code Connect omitted — Figma plan gating makes it infeasible without an upgrade.

## Phase 5 — SaaS Component Set

> The rest of the fixed library. After this phase the library is frozen — growth happens by composition.

- [x] `TextField` (label, error state)
- [x] `Select`
- [x] `Checkbox`
- [x] `Card`
- [x] Metadata + stories for each
- [x] One composed example page story (`Layout/Examples/Settings Form`) built entirely from library components

**Exit condition (met):** the example page uses only library components and tokens; component set declared complete.

## Phase 5b — User Settings Page Components

> Expand the fixed component set to cover the full User Settings page (Figma node 96:6222). The page analysis identified six net-new components; everything else composes from the existing library. This phase extends the "fixed set" declared in Phase 5 — any component added here must appear on the User Settings page and must not be coverable by composition alone.

**Components already covered — no new work needed:**
`TextField` (form fields + search with round/icon variant, added in Phase 5 extension), `Select` (language), `Checkbox` (email subscriptions), `Button` (Save, Download, See collection), `Card` (Profile Details + Account Settings panels), `Icon`, layout primitives.

**Net-new components:**

- [x] `Avatar` — circular user photo; `size` prop: `sm` (24px, used in nav) / `lg` (128px, used in profile). Accepts an image `src` + `alt`. No letter-fallback in scope.
- [x] `AppHeader` — full-width top nav bar; fixed height (90px per Figma); slots: logo (BrandLogo asset), centre search (`TextField` round + icon), right nav links + user dropdown (Avatar + name + chevron). No routing logic — pass nav items as props. (renamed from `Header` to avoid ambiguity with `Heading`)
- [x] `Breadcrumb` — ordered list of link items separated by `Icon name="chevron-right" size="sm"`; last item is non-linked (current page). Accept `items: { label: string; href?: string }[]`.
- [x] `Divider` — horizontal separator; `<hr>` styled with `color.border.default` token; no props beyond `className`.
- [x] `ProgressBar` — 4px tall track with a coloured fill; `value` (0–100) controls fill width as a percentage; uses `color.accent.accent-8` for fill and `color.background.neutral.subtle` for track.
- [x] `CardHorizontal` — horizontal card: 80×80px square thumbnail + content column (title, optional ProgressBar, metadata row with duration + certified badge). Used in Started Courses, Saved Courses, and Footer recommendations. Two colour contexts: default (light) and inverted (dark footer) — controlled by a `variant` prop or inherited via `data-theme`.
- [x] Composed page stories built entirely from library components: `Layout/Examples/Landing Page` (AppHeader, CardHorizontal with progress, Footer Highlights editorial section) and `Layout/Examples/Footer Highlights` (inverted surface pattern). User Settings form covered by the existing `Layout/Examples/Settings Form` story.

**Exit condition (met):** all six components render in both light and dark themes with stories and metadata; composed layout stories build and pass visual review with no ad-hoc CSS outside component modules.

## Phase 5c — Homepage Components

> Expand the component set to cover the Homepage (Figma node 96:6110). The page analysis identified four net-new components after accounting for what Phase 5b introduces. The carousel layout pattern (horizontal scrollable card row + paginator footer) is a page-level composition — not a component — and is demonstrated in the Homepage example story instead.

**Components already covered — no new work needed:**
`Header`, `Breadcrumb`, `Avatar`, `Divider`, `ProgressBar`, `CardHorizontal` (Phase 5b); `Button`, `TextField`, `Icon`, layout primitives (Phase 4–5).

**Components that look new but aren't:**
- `HeadlineRow` (section title + optional top border) → composed from `Heading` + `Divider`; not a standalone.
- Carousel container → `Inline` / `Stack` + `PaginationArrows`; the page story demonstrates the pattern.
- Footer / Disclaimer → same page-level composition as User Settings.

**Net-new components:**

- [x] `CardVertical` — vertical course card: `Image` thumbnail (`aspectRatio="4/5"`, portrait, fills card width — height derives from ratio); card `size` prop controls card width (`sm` ≈ 144px / `lg` ≈ 272px, yielding ~180px / ~340px image height respectively); optional `ProgressBar` below image; serif title (`font-family-headline-serif`); metadata row (duration dot certified-badge). Used in Saved Courses and Discover carousels. No dark variant needed — appears on light and elevated backgrounds only.
- [x] `Chip` — pill-shaped filter tag; `selected` boolean prop. Selected state: brand border (`color.border.selected`) + brand text (`color.text.selected`). Default: neutral border + subtle text. Not a Button variant — no action semantics, pure selection indicator; no dropdown arrow in scope (the page uses label-only chips).
- [x] `VideoFrame` — rounded container (`border-radius-md`) with a fixed 16:9 aspect ratio thumbnail image and a centred play-button overlay (semi-transparent circle + triangle glyph). Props: `src` (thumbnail URL), `alt`. No playback logic — purely presentational.
- [x] `ButtonArrow` — 32px circular prev/next navigation button; `direction`: `left` | `right`; disabled via native HTML `disabled` prop. Uses `Icon` chevron internally. Used in the carousel paginator row and in the chapter/slider navigator. Disabled state: no background, muted icon, pointer-events none. (Named `ButtonArrow` to match the `CardHorizontal`/`CardVertical` noun-first convention.)
- [x] One composed layout story (`Layout/Examples/Carousel`) demonstrating the carousel pattern: section title + `Chip` filter bar + horizontal `CardVertical` row + `ButtonArrow` pair.

**Exit condition:** all four components render in both themes with stories and metadata; the Carousel example story builds and passes visual review with no ad-hoc CSS outside component modules.

## Phase 5d — Course Overview Page Components

> Expand the component set to cover the Course Overview page (Figma node 96:5854). Two net-new components plus a new variant on `Button`; everything else (`AppHeader`, `Breadcrumb`, `VideoFrame`, `CardVertical`, `ButtonArrow`, `Chip`, `CardHorizontal`, layout primitives) is already in the library.

**Components already covered — no new work needed:**
`AppHeader`, `Breadcrumb` (Phase 5b); `VideoFrame`, `ButtonArrow`, `Chip`, `CardVertical` (Phase 5c); `CardHorizontal` (Phase 5b); `Button`, `Icon`, layout primitives (Phases 3–5).

**Net-new components and variants:**

- [ ] `Accordion` — collapsible list; each item shows title + subtitle when collapsed, and title + subtitle + body text when expanded. Props: `items: { title: string; subtitle: string; content?: ReactNode }[]`; `maxVisible` controls how many items show before the show-more toggle; `openIndex` for controlled open state. Expanded item background: `color.background.container.elevated`. Footer uses a ghost `Button` with a trailing chevron `Icon`.
- [ ] `Badge` — static category label pill; `label: string`; `variant?: 'outline' | 'filled'` (outline: border only; filled: adds `color.background.neutral.subtlest`). `border-radius.sm`. Distinct from `Chip` — no selection state, no interaction semantics, purely display.
- [ ] `Button` — add `ghost` variant: no background, no border, text color `color.text.link.default`. Used for "Show more / Show less" toggles and other inline actions. The trailing `Icon` (chevron-down / chevron-up) is passed via the existing `icon` slot.
- [ ] `useSlider` hook — content-stepper state: `{ currentIndex, total, goNext, goPrev, isFirst, isLast }`. Used for step-through UIs that show one item at a time with a CSS fade-in transition (e.g., the chapter description navigator on the Course Overview page). No component — the consuming component owns the fade animation and wires `ButtonArrow` to `goNext`/`goPrev`.

**Exit condition:** `Accordion` and `Badge` render in both themes with stories and metadata; `Button` ghost variant is documented in its story; the Course Overview example story builds from library components with no ad-hoc CSS.

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
- [ ] **Component scaffold** — trigger: developer, when starting a Phase 4/5 component. Inputs: metadata schema + an existing component as template + Figma design context (MCP, one-off). Output: component folder (index, CSS Module, stories, metadata). Code Connect omitted — requires Figma Enterprise plan. Success signal: build and Storybook pass with no manual restructuring.

- [ ] **Layout generation** — trigger: developer, when starting a new page or section. Inputs: all component metadata files (`relationships.accepts`, `relationships.containedBy`, `relationships.compositionPatterns`, `relationships.layoutBehavior`) + a one-paragraph layout brief (intent, key content areas, constraints). Output: a React component tree using only library components and tokens; each structural choice annotated with the metadata rule or `compositionPattern` that justified it. Success signal: the tree passes a structural validator (checks `accepts`/`containedBy` constraints), builds, and renders in Storybook with no manual restructuring needed.

**Exit condition:** each moment has been run once on a real task, met its success signal, and its prompt file updated with what was learned. After that, the system is "done" — maintenance only.

---

## Pivot — Ad-hoc agentic loops (Phases 8–9)

> Phases 1–7 stand as built. This pivot upgrades the **component-scaffold** moment from a single-shot prompt into a self-verifying loop, and gives Figma the same frozen-memory treatment Airtable already has. It stays inside the lite-agentic charter: developer-triggered, **sequential, at most two agents**, frozen-file context, code-as-source-of-truth. New components (Phase 5d onward) are the live testing ground.
>
> **Runtime constraint (Claude Pro, not API):** the scarce resource is the rolling **usage window**, not per-token dollars. So: orchestrate in the main session, spawn **exactly one** fresh subagent — the adversarial reviewer, where independent context is the point. No parallel worker swarm (it drains the window N× simultaneously and trips rate limits — the opposite of the goal). Everything deterministic stays a plain `npm` script.
>
> **Figma feasibility (settled):** the Figma **Variables REST API is Enterprise-org only** — same wall as Code Connect (Phase 4). On Pro the only read path to variables is the Plugin API (Figma MCP `get_variable_defs`), interactive and one-off. So Figma's frozen memory is an MCP-captured snapshot committed to the repo, not a scheduled REST pull. Code stays the source of truth; the snapshot is a drift-detection mirror (ADR-002 amendment).

## Phase 8 — Frozen-Memory Ingestion Layer

> Make the whole system's status quo readable from committed files, so loop agents read small local snapshots instead of making live API calls. Pure scripts plus one MCP-assisted snapshot — no loops, no agents.

- [ ] `figma-variables.json` — dated, frozen mirror of Figma's variable state, captured **interactively via the Figma MCP** during `/figma-variable-audit`. Mirrors how `governance.json` mirrors Airtable. Document the Enterprise-REST limitation inline so the *why* survives. Tags or omits **representational divergences** — unitless tokens Figma can't store faithfully (line-heights, held in Figma as fixed values) — so the drift check never flags them (ADR-002, 2026-06-22 amendment).
- [ ] `scripts/sense.js` — pure aggregation (no AI): composes `governance.json` + `token-usage.json` + `figma-variables.json` into `.claude/STATUS_QUO.md`, the single readable baseline. No live Figma call — reads the committed snapshot.
- [ ] `scripts/sense-component.js <Name>` — narrows the baseline to one component's relevant tokens + metadata + Figma node, written to `.claude/handoff/<Name>.snapshot.json` (the frozen context a loop stage hands to the next).
- [ ] `npm run sense` / `npm run sense:component <Name>` wired in `package.json`.

**Exit condition:** an agent can answer "what is the full status quo of tokens, governance, and Figma drift" from committed files alone, with zero live API calls. `npm run sense` regenerates `STATUS_QUO.md` deterministically.

## Phase 9 — The Verified Component Loop (pilot)

> The ad-hoc loop itself, piloted on already-planned Phase 5d components so it ships real work, not throwaway. One command, staged with frozen-file handoffs, gated by deterministic scripts, reviewed by one adversarial subagent. This is where the lint/a11y debt lands — as checks inside the review stage, run by CLI, not as separate manual chores.

- [ ] `/component-loop <Name>` command in `.claude/commands/`, wiring the stages:
  - **Stage 0 · script** — `npm run sense:component <Name>` writes the frozen snapshot.
  - **Stage 1 · in-session** — scaffold from snapshot + metadata schema + template component (reuses `/component-scaffold`, fed the snapshot).
  - **Stage 2 · script gate** — `npm run validate:metadata && npm run typecheck && npm run build`; fail-fast bounces back to Stage 1 with the error.
  - **Stage 3 · one subagent** — adversarial review in a fresh context: `/code-review` on the diff + `eslint` + `axe-core`; findings written to `.claude/handoff/<Name>.review.json`.
  - **Stage 4 · in-session** — apply review fixes, re-run the Stage 2 gate, then open the PR.
- [ ] Add `eslint` + `axe-core` (or equivalent) as the lint/a11y checks invoked in Stage 3 — via CLI, not manual passes.
- [ ] Per-run log (the learning goal): usage-window cost, whether Stage-0 context isolation held, and whether the verifier caught anything the script gate missed.
- [ ] **Pilot order:** `Badge` first (simplest, greenfield), then `Accordion` (stateful — the real stress test). Both are Phase 5d components.

**Exit condition:** both pilot components ship *through* the loop, each meeting its Phase 5d success signal with no manual restructuring, the human only ever reviewing clean code. The loop prompt is updated with what was learned. If a stage needed manual rescue every run, the frozen snapshot or the prompt is too thin — fix it before declaring the loop done.
