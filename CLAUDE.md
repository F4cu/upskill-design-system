# UpSkill Design System

## Project purpose

A learning-first, **lite agentic** design system for a small SaaS product. Lite means: a fixed, small component set (layout primitives, typography, Button, form inputs, Card — nothing more), and economic maintenance — recurring automation is scripts + GitHub Actions with direct REST calls; MCP servers are for one-off interactive tasks only; agent involvement is limited to eight defined moments (see "Agentic moments"). One person must be able to maintain the whole system.

Pipeline: Figma → token export → Style Dictionary build → CSS/JS outputs → coded components, with Airtable as the governance layer and GitHub Actions as the automation layer. See `ROADMAP.md` for phase status and exit conditions.

## Token architecture

### Three-layer model

Tokens resolve in this fixed order — later layers override earlier ones:

| Layer | Files | Purpose |
|---|---|---|
| Primitives | `primitives.json` | Raw, context-free values. Single source of truth. Authored as code (hand-edited via PR); Figma is a downstream mirror. See ADR-002 amendment. |
| Theme | `theme/light.json`, `theme/dark.json` | Semantic color aliases. Reference primitives via `{path.to.token}`. |
| Device | `device/desktop.json`, `device/tablet.json`, `device/mobile.json` | Responsive spacing, grid, typography per breakpoint. |

Breakpoints: desktop ≥ 1440px, tablet ≥ 768px, mobile < 768px.

### Token format (W3C DTCG)

Every token uses `$type` and `$value`. Aliases use curly-brace syntax. No `$extensions` — strip them on export.

```json
{ "$type": "color", "$value": "#D15D50" }          // concrete value
{ "$type": "color", "$value": "{color.terracotta.9}" }  // alias
```

### Primitive color scales

Each hue has three sub-scales. Don't mix scales on the same token:
- `1–12` — light-mode scale (backgrounds → text)
- `dark-1` through `dark-12` — dark-mode scale
- `alpha-1` through `alpha-12` — transparent variants of the mid-tone

Current hues: `terracotta` (brand), `cyan`, `gold`, `teal`, `sand`, `grey`, `black`, `white`, `amber`.

### Line-height convention

Line-heights are **unitless ratios** (`1`, `1.25`, `1.4`, `1.5`, `1.75`). Never use fixed px values — the ratio adapts to any font size automatically. Figma cannot store unitless variables, so these are entered there as fixed values and are an accepted code↔Figma divergence, not drift (see Figma sync → representational constraints).

## Style Dictionary build (built)

`npm run tokens:build` transforms DTCG source into CSS custom properties (dimensions in `rem`; desktop device tokens in `:root`, tablet/mobile in `@media` blocks) and JS/TS constants. Config and custom transforms (px→rem, font-weight string→numeric, `$root` rename, media-query combiner) live in `packages/tokens/style-dictionary.config.js`.

**Invariant:** components only ever consume the built output, never source JSON. The authoring and rebuild procedure — including when a transform change needs an ADR — is `/tokens-author`.

## Figma sync

**Vocabulary:** A **token** is a committed DTCG JSON value in `packages/tokens/src/` (source of truth, code-side). A **variable** is the downstream representation of a token inside a Figma collection.

**The committed DTCG JSON in `packages/tokens/src/` is the source of truth, not Figma** (ADR-002 amendment, 2026-06-17). Code-first is forced by plan limits: the Variables REST API and Code Connect are Enterprise/Org-only, and Token Studio's free GitHub sync is single-file while this architecture is deliberately multi-file. Figma is a downstream mirror and design-exploration surface; the only automatable sync direction available is code→Figma (interactive, via the Figma plugin/MCP).

Tokens are authored and changed in the JSON via PR — `primitives.json` is hand-editable like the theme and device layers. A value invented in Figma is a proposal until it lands in `primitives.json`.

When reconciling values brought over from Figma, the cleanup step still applies:
- Strips `$extensions` blocks entirely
- Converts Figma sRGB component objects → hex strings
- Preserves alias references in `{path.to.token}` format

Do not commit `$extensions` to source. Before pulling Figma changes into committed tokens, run `/figma-variable-audit` (see "Agentic moments") as a drift check — never overwrite primitives without diffing against current usage.

**Figma representational constraints.** Figma variables cannot store **unitless values**. Line-heights are authored in code as unitless ratios (`1.5`); Figma must hold them as fixed values, so these tokens *always* differ between code and Figma. This is an expected **representational divergence, not drift**: the audit and push moments exclude it, and `figma-variables.json` tags or omits it so the diff never flags it. Code stays authoritative for the unitless value; Figma's fixed value is a display approximation that never flows back into `primitives.json`. The running list of accepted divergences lives in the drift memory note (`figma-file-variable-drift.md`). See ADR-002 (2026-06-22 amendment).

**Figma-to-code translation rules** (direct gap-name mapping, no undesigned wrappers) apply when Figma MCP output drives code generation. They live where they are used — `/component-scaffold` and `/layout-generation`.

## Integrations

| Tool | Role | Status |
|---|---|---|
| **Style Dictionary** | Build system: DTCG JSON → CSS custom properties, JS/TS constants. Custom transforms for rem, font-weight, `$root`, media queries. | Built |
| **Storybook** | Component documentation, token showcase (MDX stories: colors, spacing, typography, radii), light/dark via `addon-themes` + `data-theme`. | Built |
| **GitHub Actions** | Token build check on PR (`tokens-check.yml`); Airtable sync on merge to main (`sync-tokens.yml`). | Built |
| **Airtable sync (code → Airtable)** | `scripts/airtable-sync.js` upserts primitives/semantic/device tokens to three tables via REST. One-directional. Runs in CI on merge. | Built |
| **Airtable governance (Airtable → code)** | Per token: `status` (`active`\|`deprecated`) / `owner` / `successor` (dot-path, e.g. `color.terracotta.9`; nullable) / `notes`, pulled to `airtable-governance.json`. Per component: `Implementation` = human `done`/`todo` sign-off, pulled to `.claude/component-signoff.json` (ADR-010). Both via `scripts/airtable-pull.js` (`npm run airtable:pull:governance`). Run manually before deprecation/sign-off work until Phase 6 automates it. | Planned (Phase 2) |
| **Figma → code flow** | Code is source of truth; Figma is a downstream mirror. Token audit reconciles drift before pulling Figma changes into committed tokens; Code Connect mappings for components. | Planned (Phases 4, 7) |
| **PR token diff comment, changelog** | Deterministic scripts in Actions. | Planned (Phase 6) |
| **Component metadata** | JSON schema + example file exist; consumed by agentic moments. | Schema built; consumers planned |

## Frozen-memory snapshots

Moments and loops read the system's status quo from **committed files, never live APIs** — this shields agents from rate limits and keeps each agent's context small. Read-not-call artifacts:

| File | Source | Captured by | Status |
|---|---|---|---|
| `airtable-governance.json` | Airtable (`status`/`owner`/`successor`/`notes`) | `scripts/airtable-pull.js` (REST) | Built |
| `token-usage.json` | Repo scan (`var(--ds-*)` CSS refs + `{alias}` refs) | `scripts/token-usage.js` | Built |
| `figma-variables.json` | Figma variables | `/figma-variable-audit` via Figma MCP (Plugin API) | Built |
| `.claude/component-signoff.json` | Airtable (`Implementation` = human `done`/`todo`) | `scripts/airtable-pull.js` (REST) | Built |
| `.claude/component-pipeline.json` | Component metadata + handoff artifacts + sign-off | `scripts/sense.js` (`npm run sense`) | Built |
| `.claude/STATUS_QUO.md` | Aggregate of the above | `scripts/sense.js` (`npm run sense`) | Built |

**Component lifecycle has two axes** (ADR-010): **Maturity** (`beta`/`ready`/`deprecated`, the metadata `component.status`, pushed code → Airtable) and **Implementation** (`established`/`in progress`/`in review`/`done`/`todo`, the pipeline stage). `sense.js` *derives* `in progress`/`in review`/`established` from handoff artifacts (`in review` = `.review.json` + `.learnings.json` both present; a lone snapshot = `established`, pre-loop); `done`/`todo` are **human-set in Airtable**, pulled into `component-signoff.json`, and win over the derived stage. The push never overwrites an Airtable `done` ("don't downgrade done" guard). The two axes live in separate Airtable columns so a pushed value and a human value never collide.

Figma's snapshot is captured **interactively via the MCP, not pulled by a script**, because the Variables REST API is Enterprise-gated (ADR-002 amendment) — the same wall as Code Connect. Code stays the source of truth; the snapshot is a drift-detection mirror, not an ingestion source. Regenerate `STATUS_QUO.md` with `npm run sense` before a loop run; per-component context is narrowed to `.claude/handoff/<Name>.snapshot.json` by `npm run sense:component <Name>`. `figma-variables.json` tags or omits **representational divergences** — unitless tokens Figma can't store faithfully (line-heights) — so the audit diff doesn't flag them every run.

## MCP tools — when to use vs when to avoid

General rule: MCP calls are for **interactive, one-off tasks with the developer present**. Anything recurring, scheduled, or CI-bound uses a script with direct REST calls. Never put an MCP call inside a GitHub Action or a loop over many records.

| MCP | Use it for | Do NOT use it for |
|---|---|---|
| **Figma** | (1) Reading variables/design context during `/figma-variable-audit` (drift check). (2) Code Connect mapping and design context when scaffolding a component. (3) Writing variables into Figma during `/figma-variable-push` (`use_figma` Plugin API) when code is ahead of Figma. | Treating Figma as the token source — tokens are authored as code (ADR-002 amendment). Bulk-reading many nodes. |
| **Airtable** | (1) One-off schema changes (adding governance fields). (2) Ad-hoc inspection of a few records when debugging sync. | Token sync (use `scripts/airtable-sync.js`). Reading governance state in tasks — read the committed `airtable-governance.json` instead. Bulk record operations. |
| **GitHub** | Rarely — cross-repo searches the `gh` CLI handles awkwardly. | Everything else. Prefer `gh` CLI for PRs, issues, API calls; it's already authenticated and scriptable. |
| **Google Drive** | Fetching a spec or brief the user explicitly links. | Anything recurring; storing or syncing project docs. |
| **Notion** | Fetching planning notes the user explicitly links. | A documentation target — docs live in Storybook (components) and Airtable (tokens). |

If a task could be done with a committed file, a script, or the `gh` CLI, do it that way even when an MCP tool is available.

## Git workflow

Commit directly to the current branch — do not create new branches unless explicitly asked. This is a solo project; branch management is the developer's responsibility.

**Exception — `/add-component` + `/review-component` loop:** `/review-component` always creates a branch named `component/<kebab-name>` (e.g. `component/accordion`) when invoked from the `/add-component` flow, then opens a PR against `main` for human review. Agent-generated component code must go through a PR — it should never land on `main` without a review step.

## Commands and skills

`.claude/commands/` — prompt-only slash commands. Flat markdown files. All agentic moments live here.  
`.claude/skills/` — slash commands with companion code. One directory per command. Only `run-storybook` lives here because it ships `driver.mjs`.

Note: Claude Code's naming is the inverse of plain English intuition — "skills" are the ones with code, "commands" are the prompts.

## Agentic moments

The only scenarios where invoking Claude with MCP context is worth the cost. All developer-triggered, defined as prompts in `.claude/commands/` — the full inputs, steps, and success signals live there; this is the index and the load-bearing invariants. Everything else is a script or a GitHub Action.

| # | Moment | Command | Invariant that must survive |
|---|---|---|---|
| 1 | Figma variable audit (drift check) | `/figma-variable-audit` | Never overwrite primitives without diffing against usage; capture the read into `figma-variables.json`; exclude representational divergences from the drift report. |
| 2 | Token deprecation pass | `/token-deprecation-pass` | Replace usages with the Airtable `successor`; read `airtable-governance.json`, no MCP. |
| 3 | Component scaffold | `/component-scaffold` | Read schema + template + Figma context; produce the four component files. |
| 4 | Layout generation | `/layout-generation` | Only fixed-set components and tokens; every structural choice cites a metadata rule. |
| 5 | Figma variable push (code → Figma) | `/figma-variable-push` | Write only clean-missing variables; never delete or overwrite Figma variables without explicit confirmation. |
| 6 | Add component (verified scaffold) | `/add-component` | The ad-hoc loop: sense → scaffold → gate → visual checkpoint → moment 7. Frozen snapshot is the only handoff. ADR-007. |
| 7 | Review component (adversarial review + fix + PR) | `/review-component` | One fresh adversarial subagent; branch `component/<kebab-name>`; writes `.review.json` + `.run.json` for moment 8. |
| 8 | Extract learnings (metadata self-improvement) | `/extract-learnings` | Route each finding to its metadata section; fixes that land only in code rot — land them in metadata. `--all` proposes a CLAUDE.md addition (developer confirms). |

**For existing component reviews:** Use `/review-component <Name>` for a full adversarial pass (spawns one subagent, writes `.review.json` for the learning loop). Use `/code-review` directly on the diff for a lighter, in-session review with no subagent or handoff file.

**Ad-hoc loops vs continuous loops.** A developer-triggered loop that runs a bounded sequence once and stops (moment 6) is allowed — it is a moment with stages, nothing more. A *continuous* loop, scheduled agent run, or always-on watcher is not: if asked for one, push back and propose a script, a GitHub Action, or one of these moments instead.

**On-demand loop guardrails** (apply to moment 6 and any future loop):
- **Sequential, ≤2 agents.** Orchestrate in the main session; spawn at most one fresh subagent — the adversarial reviewer, where independent context is the whole point. No parallel worker swarm: on Claude Pro the scarce resource is the rolling usage window, and parallel agents drain it N× at once and trip rate limits.
- **Frozen-file handoffs only.** Each stage reads a committed/cached snapshot (`STATUS_QUO.md`, `.claude/handoff/<Name>.snapshot.json`) — never stream raw data between stages or let a stage make its own live API call.
- **Deterministic work stays a script.** Sensing, validation, typecheck, build are `npm` scripts, not agent steps. Agents only do what a script can't.
- **Fail-fast.** If the gate fails, bounce back to the scaffold stage with the error rather than pushing forward.
- **No agent code reaches `main` unreviewed.** Generated code clears the deterministic gate and the adversarial review before a human PR opens.

## Storybook

Storybook lives in `packages/components` — it is the documentation layer for coded components, not a separate package. Installed: React + Vite framework, `@storybook/addon-themes` toggling `data-theme` (activates `theme/light` vs `theme/dark` token sets), MDX token showcase stories (colors by hue, spacing, typography, radii). Pending: `storybook-design-token` wired to SD CSS output, visual regression baseline (Chromatic or equivalent).

### Purpose in this system

- **Component development environment** — isolated rendering during build
- **Living documentation** — stories are the canonical usage examples, not a README
- **Token visualization** — the MDX showcase stories make tokens visible and reviewable in the browser
- **Visual regression baseline** — screenshots per story for CI diffing (planned)

### Story conventions

- One story file per component: `ComponentName.stories.tsx` co-located with the component
- Always export a `Default` story; add named variants for meaningful states (not every prop permutation)
- Use `args` + `argTypes` so controls work — no hard-coded prop values in stories
- Dark mode must switch the `data-theme` attribute that activates `theme/dark.json` tokens, not just Storybook's background

## Layout grammar

Every page follows a fixed hierarchy mapping Figma structure to HTML landmarks (rationale in ADR-011). The full grammar table — Page/Header/Section/Container/Column/Footer → sanctioned code and landmark — lives in `/layout-generation`, which applies it as its first pass. Enforce deterministically with `npm run layout:validate <file>`.

Load-bearing invariants for **any** layout file (hand-edited or generated):
- Exactly one `<Box as="main">` per route; every `<Box as="section">` has an accessible name (`aria-labelledby` → its `Heading`); every extra `<nav>` has a unique `aria-label`.
- **Inline styles** (replaces the blanket "no inline styles"): allowed only for `.container`/`.grid` classNames and `style={{ flex: '1 0 0' }}` / `minWidth` / `maxWidth`. Forbidden: raw color (use `<Text color=…>` / `<Heading>`), raw token values outside `var()`, arbitrary CSS that belongs in a component's CSS Module.
- Rely on device tokens for responsive spacing/typography; reflow via `.grid` or `Inline wrap`. Never hand-write `@media` in layout files.

## Coding conventions

### Token JSON
- Keys use `kebab-case` for multi-word names (`border-radius`, `font-size`, `line-height`)
- Numeric scale steps use plain numbers as string keys (`"1"` through `"12"`, `"100"` through `"800"`)
- No trailing commas (strict JSON)
- Aliases always prefer the deepest available primitive path (`{color.terracotta.9}` not `{color.terracotta}`)

### CSS Modules (components package)
- One `.module.css` file per component, co-located with the component
- Only reference SD-output custom properties (`var(--token-name)`) — never raw values
- Class names use `camelCase` inside the module (e.g. `.primaryButton`)
- No global styles in component modules — globals (reset, base typography, grid) live in `packages/components/src/styles/`

### JavaScript / TypeScript (components package, scripts)
- No comments unless the why is non-obvious
- No defensive error handling for internal paths — only validate at external boundaries (Figma API responses, Airtable webhooks)
- Prefer explicit over clever

### Component implementation rules (scaffold and layout generation)
- **Typography:** Any string prop that renders as visible UI text (title, subtitle, label, description, and similar) must be passed through `<Text>` or `<Heading>` — never rendered as a raw string, `<span>`, or `<p>`. Use `as` on the typography component to adjust the semantic element when needed. The exact `size` and `color` values are component-specific — read the component's `usage.antiPatterns` in its metadata for the correct values.
- **Icon color:** `<Icon>` inherits its color via `currentColor`. Never set a color prop or inline style directly on `<Icon>`. Apply the semantic color token on the ancestor element that owns the color context. The specific token is documented in the composing component's `usage.antiPatterns`.
- **Component-specific rules:** Before generating a component's JSX, read its `usage.antiPatterns` — they capture both usage mistakes and implementation constraints (e.g. which library component to use for a prop, which token to apply to a specific element).
- **Type-enforced anti-patterns:** When a component's metadata documents a hard constraint (e.g. "never pass onClick", "never set color directly"), the prop type must make the violation a TypeScript error, not just a documented anti-pattern — narrow the spread native-attributes type (e.g. `Omit<HTMLAttributes<...>, 'onClick' | 'color' | ...>`) to exclude the attributes the component already owns or forbids, rather than only excluding `children`.

### File naming
- Token source files: lowercase, no spaces (`primitives.json`, `light.json`)
- Scripts: `kebab-case.js` or `.ts`
- Components: `PascalCase/index.tsx` with co-located styles

### Component scope
Core set (Phases 4–5): `Box`, `Stack`, `Inline`, `Text`, `Heading`, `Icon`, `Button`, `TextField`, `Select`, `Checkbox`, `Card`.
Phase 5b additions (User Settings page): `Avatar`, `AppHeader`, `Breadcrumb`, `Divider`, `ProgressBar`, `CardHorizontal`.
Phase 5c additions (Homepage): `CardVertical`, `Chip`, `VideoFrame`, `ButtonArrow`, `ScrollArea`.
Phase 5d additions (Course Overview page): `Accordion`, `Badge`; `Button` gains a `ghost` variant (no background, link text color — replaces the standalone ShowMoreLink pattern); `useSlider` hook (content-stepper state for fade-in step-through UIs, no component).
Do not add components outside these lists without the user explicitly expanding the scope — compose existing ones instead. `Icon` wraps a small fixed set of inline SVGs (no icon-library dependency); glyphs use `currentColor` and size via `size.*` tokens.

Before proposing a new component file, apply the three-question test from ADR-009: (1) same semantic role → add a prop/variant to the existing component; (2) different role despite similar shape → new component; (3) single parent, no other consumer in the fixed set → molecule-internal styled element in the parent's CSS Module. Visual similarity alone is not a reason to create a new component or to merge two that differ in role.

## Architectural decisions (ADRs)

Durable decisions live in `docs/decisions/NNN-kebab-title.md` (template: `000-template.md`). These are the load-bearing rationale a future contributor or agent needs to build and reuse components correctly — read the relevant ADR before changing the thing it governs.

**When to record one (do this as part of the change, not later):**
- A change to a contract other code or tooling depends on — the metadata schema (ADR-001), the token architecture (ADR-002), build transforms, the `space`/`size` split (ADR-005).
- A new convention agents must follow to generate or reuse correctly (e.g. how variant axes are modelled, how semantic aliases are named).
- A reversal or material refinement of an earlier decision.
- A choice between real alternatives where the reasoning won't be obvious from the code later.

**When NOT to:** routine work that follows an existing pattern — adding a component, token, or story; fixing a bug; renaming for clarity. If the decision is already explained by an existing ADR, don't duplicate it. Keep the set small; this is a lite-agentic system.

**How:**
- *New decision* → copy `000-template.md` to the next number, fill Context / Decision / Consequences, set `Status: accepted`. Link related ADRs by number.
- *Refining an existing decision* → amend that ADR in place: bump its `Amended:` date and append a dated `## Amendment (YYYY-MM-DD) — <summary>` section rather than rewriting history (see ADR-001 for the pattern). Reserve a new ADR with `superseded by ADR-XXX` for a full reversal.
- If a decision changes how components are built, reflect the rule in the relevant CLAUDE.md section too — the ADR holds the *why*, CLAUDE.md holds the *what to do*.

## Common tasks

Most recurring work is a skill or command — invoke it rather than reproducing the steps by hand. The detailed procedure lives in the skill (in `.claude/skills/` or `.claude/commands/`) so it loads only when relevant; this table is the index. The eight developer-triggered commands are the "Agentic moments" above.

| Task | How |
|---|---|
| Add/change a primitive token, add a semantic alias, or modify the SD build | `/tokens-author` |
| Push tokens to Airtable, or pull governance state | `/airtable-sync` |
| Scaffold a new component from the fixed set | `/component-scaffold` |
| Run the verified component loop for a new component (sense → scaffold → adversarial review → PR) | `/add-component` |
| Review an existing component after changes (adversarial subagent, writes `.review.json`) | `/review-component <Name>` |
| Light in-session review without a subagent or handoff file | `/code-review` on the diff + `npm run metadata:validate && npm run typecheck && npm run build && npm run a11y:coverage && npm run a11y:test` |
| Back-fill metadata learnings after a review or bug-fix session | `/extract-learnings <Name>` (single) or `/extract-learnings --all` (batch) |
| Regenerate the frozen status-quo snapshot | `npm run sense` (or `npm run sense:component <Name>`) |
| Run a11y checks (static + behavioral) | `npm run lint` (Tier 1, all) · `npm run a11y:coverage && npm run a11y:test` (Tier 2, interactive components — ADR-008) |
| Generate a page or section layout | `/layout-generation` |
| Audit Figma variables against committed tokens (drift check) | `/figma-variable-audit` |
| Push committed tokens into Figma as variables (code → Figma) | `/figma-variable-push` |
| Migrate deprecated token usages to their successors | `/token-deprecation-pass` |
| Build, run, or screenshot Storybook | `/run-storybook` |
| Add a story to an existing component | Follow "Storybook → Story conventions" above |
| Add a GitHub Action | Workflow YAML in `.github/workflows/`. Actions call scripts and REST directly — never MCP, never Claude. Judgment-needing work belongs in an agentic moment instead. |
| Record or amend an ADR | Follow "Architectural decisions (ADRs)" above |

### Component metadata model (reference)

This convention is shared by `/component-scaffold`, `/layout-generation`, and metadata validation, so it stays here rather than in one skill. `*.metadata.json` is validated against `component.schema.json` by `scripts/validate-metadata.js`. Variants are modelled as **named axes**: `variants` is an object keyed by axis name (`variant`, `size`, `shape`, …), each axis holding `{ options, default, purpose }`. A component with a single visual axis uses one key named `variant`; `default` may be `null` for an axis that is off unless set (e.g. Button `shape`). `tokens` keys are fixed: `color`, `spacing`, `typography`, `borderRadius`, `other`. `component.category` ∈ `atom|molecule|organism|layout`, `component.type` ∈ `interactive|display|container|input`, `component.status` ∈ `beta|ready|deprecated`. `composition.accepts`/`containedBy` and `usage.patterns` are required for layout generation.

After scaffolding or editing a component, `npm run metadata:validate`, `npm run typecheck`, `npm run build`, `npm run a11y:coverage`, and `npm run a11y:test` must all pass with no manual changes, and it must render in both light and dark themes in Storybook (`components-check.yml` runs these on every PR). Following the pattern needs no ADR; a deviation — a new variant-axis convention, a token category the schema lacks, or a change to the schema itself — requires recording or amending an ADR before merging.

**Two-tier a11y (ADR-008).** Tier 1 is static `jsx-a11y` lint (`npm run lint`), default for all components. Tier 2 is a **behavioral** a11y test — a co-located `<Name>.a11y.test.tsx` (Vitest + Testing Library + `vitest-axe`, jsdom) asserting the dynamic ARIA contract (state attributes toggling, focus, keyboard) plus an axe scan — required **only for interactive components**. `scripts/a11y-coverage.js` derives interactivity from metadata (`component.type ∈ {interactive, input}`, an interactive ARIA `role`, or a keyboard contract beyond plain Tab / native scroll) and fails if an interactive component lacks its test. Non-interactive components (display/landmark, e.g. `Badge`, `Divider`) need none. Model new tests on `Button/Button.a11y.test.tsx`; disable axe's `color-contrast` rule (jsdom can't judge layout/colour — that stays with visual review and the addon-a11y panel). `scripts/a11y-backlog.json` is a shrinking ledger waiving pre-existing interactive components pending backfill; never add a new component to it.
