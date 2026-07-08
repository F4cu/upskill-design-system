---
status: done
created: 2026-07-02
completed: 2026-07-02
---

# UpSkill Design System — System Case Study (narrative draft)

> **Status:** research draft for developer review, produced per `system-case-study.handoff.md`.
> Every factual claim cites the repo file, script, ADR, or external source it comes from.
> Open questions are flagged inline as `> **Question:**` blocks rather than asserted.

---

## 1. The token pipeline: Figma to component, with code as the source of truth

Every visual decision in this system is a **design token** — a committed DTCG JSON value in `packages/tokens/src/` (`CLAUDE.md`, "Figma sync" vocabulary). Tokens resolve through a fixed three-layer model (ADR-002):

- **Primitives** (`primitives.json`) — raw, context-free values: the `terracotta` brand scale, `cyan`, `gold`, `teal`, `sand`, `grey`, and the rest, each hue carrying a 1–12 light scale, a `dark-1`–`dark-12` scale, and `alpha` variants (`CLAUDE.md`, "Primitive color scales").
- **Theme** (`theme/light.json`, `theme/dark.json`) — semantic color aliases mapping intent to a primitive via `{path.to.token}` references, e.g. `color.background.brand → {color.terracotta.9}`. Switching theme files switches the entire color mode (ADR-002).
- **Device** (`device/desktop.json`, `device/tablet.json`, `device/mobile.json`) — responsive spacing, grid, and typography per breakpoint (desktop ≥ 1440px, tablet ≥ 768px, mobile < 768px) (ADR-002).

<!-- IMAGE PLACEHOLDER: token pipeline flow — Figma (downstream mirror) <- primitives.json -> theme/light+dark.json + device/desktop|tablet|mobile.json -> Style Dictionary build (style-dictionary.config.js custom transforms) -> dist CSS custom properties + JS/TS constants -> components (CSS Modules, var(--token) only) -->

`npm run tokens:build` runs Style Dictionary over the three layers and emits two outputs: CSS custom properties (dimensions converted px→rem; desktop device tokens in `:root`, tablet and mobile overriding the same custom-property names inside `@media` blocks, so one CSS file serves all breakpoints) and JS/TS constants. The custom transforms — px→rem, font-weight string→numeric, the `$root` rename, and the media-query combiner — live in `packages/tokens/style-dictionary.config.js` (`CLAUDE.md`, "Style Dictionary build"; ADR-002 documents why the default CSS platform couldn't produce the media-query output). The system's load-bearing invariant: **components only ever consume the built output, never the source JSON** (`CLAUDE.md`), and component CSS Modules may only reference `var(--token-name)`, never raw values (`CLAUDE.md`, "CSS Modules").

The part worth defending in an interview is the direction of authority. ADR-002 originally declared primitives "Figma-owned" — re-exports would replace `primitives.json` wholesale. The 2026-06-17 amendment reverses that: **the committed JSON is the single source of truth; Figma is a downstream mirror and design-exploration surface.** Three plan-level facts forced the call (ADR-002 amendment):

1. The **Figma Variables REST API** (`GET /v1/files/:key/variables/local`) is Enterprise-org only.
2. **Code Connect** is Organization/Enterprise only.
3. **Token Studio's free GitHub sync** handles a *single* file — and this architecture is deliberately multi-file (primitives + two theme files + three device files). Collapsing six files into one to fit the tool would invert the dependency the wrong way.

So automated Figma→code sync is impossible on this plan; the only automatable direction is code→Figma, done interactively via the Figma plugin/MCP (`/figma-variable-push`). Code-first is therefore not a preference — it is the only model that supports *any* automation, and it aligns with the governance layer (Airtable, PR review) that already treats committed files as canonical. A value invented in Figma is a proposal until it lands in `primitives.json` via PR — which ADR-002 calls "a governance feature, not a limitation" for a one-maintainer system.

One honest wrinkle: Figma variables cannot store **unitless values**, and line-heights are authored as unitless ratios (`1.25`, `1.5`) so they adapt to any font size (`CLAUDE.md`, "Line-height convention"). Figma must hold them as fixed px, so 27 line-height tokens differ between code and Figma *by construction*. ADR-002's 2026-06-22 amendment names this class **representational divergence, not drift**: `figma-variables.json` tags them and both Figma moments exclude them from drift reports, so a structurally impossible comparison is never a failure signal.

This structure is also what makes the system legible to machines, not just people. Romina Kavcic argues that when tokens are exposed to an AI without a semantic layer, the model sees "a wall of nested objects with no context about why these values exist" — whereas intent-carrying names inform its choices at every layer ("Design tokens that AI can actually read", https://learn.thedesignsystem.guide/p/design-tokens-that-ai-can-actually). The theme layer here is exactly that semantic layer, and it's the part the agentic moments in section 2 actually read.

> **Headline:** Six token files, three layers, one direction of authority: committed DTCG JSON is the source of truth and Figma is a mirror — a deliberate architecture choice forced into the open by Enterprise-gated APIs and defended in ADR-002, not an apology for a small plan.

---

## 2. Scripts for everything recurring, agents for eight defined moments

"Lite agentic" is the system's charter, and it is defined operationally, not rhetorically (`ROADMAP.md`, "What lite agentic means here"): a fixed, small component surface, and **economic maintenance** — no orchestration layer, no always-on agents, no scheduled loops. Anything that runs on every PR or merge is a plain script or a GitHub Action calling REST directly. Agent involvement is confined to **eight developer-triggered moments**, each a prompt file in `.claude/commands/` with declared inputs, a concrete output, and a success signal (`CLAUDE.md`, "Agentic moments").

The deterministic side (all Built — `CLAUDE.md`, "Integrations"):

- `tokens-check.yml` runs on every token-touching PR: `npm run tokens:build`, the WCAG contrast check (`scripts/token-contrast-check.js`), and a token diff comment (`scripts/token-diff.js`).
- `components-check.yml` runs on every component PR: build, `scripts/validate-metadata.js`, typecheck, and the two-tier a11y gate (`scripts/a11y-coverage.js` + `a11y:test`).
- `sync-tokens.yml` runs on merge to `main`: `scripts/airtable-sync.js` pushes primitives/semantic/device tokens, then `scripts/sense.js` derives component pipeline state and pushes both lifecycle axes.

The agentic side is the eight moments: `/figma-variable-audit`, `/token-deprecation-pass`, `/component-scaffold`, `/layout-generation`, `/figma-variable-push`, `/add-component`, `/review-component`, and `/extract-learnings` (`CLAUDE.md`, "Agentic moments" index). Each exists because it needs judgment a script structurally can't provide — diffing Figma drift against real usage, deciding whether generated JSX violates a composition rule, adversarially reviewing an ARIA contract.

<!-- IMAGE PLACEHOLDER: two-lane diagram — top lane "recurring: scripts + GitHub Actions" (tokens-check.yml, components-check.yml, sync-tokens.yml with their scripts), bottom lane "judgment: 8 developer-triggered moments in .claude/commands/", with the /add-component loop expanded into its stages: sense (script) -> scaffold (agent) -> gate (script) -> visual checkpoint (human) -> adversarial review (1 subagent) -> PR -->

The economics of the split are explicit in `ROADMAP.md` ("Pivot — Ad-hoc agentic loops"): the system runs on **Claude Pro, where the scarce resource is the rolling usage window, not per-token dollars**. That constraint shapes three binding rules, recorded in ADR-007:

- **Sequential, ≤2 agents.** The one loop that exists (`/add-component`) orchestrates in the main session and spawns exactly one fresh subagent — the adversarial reviewer, where independent context is the entire justification for a second agent. A parallel worker swarm would drain the shared window N× simultaneously and trip rate limits — "the opposite of the goal" (`ROADMAP.md`).
- **Frozen-file handoffs only.** Stages communicate through committed snapshots — `.claude/STATUS_QUO.md` and `.claude/handoff/<Name>.snapshot.json`, both regenerated by `scripts/sense.js` / `scripts/sense-component.js` — never streamed data or per-stage live API calls. This keeps each agent's context small and shields it from rate limits (`CLAUDE.md`, "Frozen-memory snapshots").
- **Deterministic work stays a script.** Sensing, validation, typecheck, build, and a11y checks are `npm` scripts inside the loop's gate, not agent steps (ADR-007).

A loop here means a *bounded* loop: developer-triggered, runs its stages once, stops. Continuous loops, schedulers, and always-on watchers are explicitly out of charter — the documented response to a request for one is to push back and propose a script, an Action, or an existing moment (`CLAUDE.md`, "Ad-hoc loops vs continuous loops"). This is the same conclusion Kavcic reaches from the cost side: agents "trade latency and cost for better task performance," so "find the simplest solution possible, and only increase complexity when needed — don't build an agent because you can. Build one because nothing simpler will do the job" ("Should you build an agent for your design system", https://learn.thedesignsystem.guide/p/should-you-build-an-agent-for-your). The eight moments are precisely the set where nothing simpler does the job; everything else stayed a script. One person maintains the whole system, and that constraint is stated as a design input in `CLAUDE.md`'s first paragraph, not an afterthought.

> **Headline:** Eight developer-triggered moments replace what would otherwise be continuous agent involvement; everything recurring is a plain script or GitHub Action, and the one agentic loop is capped at two sequential agents with frozen-file handoffs (ADR-007) — sized to Claude Pro's usage window and to one maintainer.

---

## 3. Airtable governance: two directions, two owners, one guard

Airtable is the system's governance surface, and the sync is deliberately asymmetric: scripts push what code owns, humans author what judgment owns, and the two never share a column (ADR-010).

<!-- IMAGE PLACEHOLDER: Airtable two-way sync — left "code (repo)" box, right "Airtable" box; top arrow (code -> Airtable, on merge via sync-tokens.yml): airtable-sync.js pushes primitives/semantic/device tokens + component Maturity + derived Implementation; bottom arrow (Airtable -> code, manual npm run airtable:pull:governance): airtable-pull.js pulls token status/owner/successor/notes -> airtable-governance.json and human done/todo -> .claude/component-signoff.json; a shield icon on the top arrow labeled "never overwrite a human done/todo" -->

**Code → Airtable.** On every merge to `main`, `sync-tokens.yml` runs `scripts/airtable-sync.js` to upsert primitives, semantic, and device tokens into three Airtable tables via direct REST — no MCP, no agent (`CLAUDE.md`, "Integrations"). The workflow then runs `scripts/sense.js` and `airtable-sync.js push:components`, mirroring each component's two lifecycle axes (ADR-010): **Maturity** (`beta`/`ready`/`deprecated`, from `component.status` in the metadata — a design judgment made in code via PR) and the derived **Implementation** stage. `sense.js` computes that stage from committed handoff artifacts alone: `.review.json` + `.learnings.json` both present means `in review`; partial loop artifacts mean `in progress`; no loop artifacts means `established` (pre-loop component). It is a pure aggregator with no live API calls (`ROADMAP.md`, Phase 8).

**Airtable → code.** `scripts/airtable-pull.js` (`npm run airtable:pull:governance`) pulls two things back: per-token governance fields — `status` (`active`/`deprecated`), `owner`, `successor` (a dot-path like `color.terracotta.9`), `notes` — into `airtable-governance.json`, and the per-component human sign-off (`Implementation` = `done`/`todo`) into `.claude/component-signoff.json` (`CLAUDE.md`, "Integrations"; ADR-010).

**Who edits what** is the design, not a convention. Humans author exactly two kinds of value in Airtable: token governance decisions (deprecating a token and naming its successor) and the one-bit component sign-off (`done` = "a human did the visual check"; `todo` = a planned component, possibly before any code exists). Everything else is derived and pushed by script. ADR-010's safety rules make the boundary mechanical: `push:components` reads the current `Implementation` cell before writing and **skips it if Airtable already holds a human `done` or `todo`** — the "don't downgrade done" guard — and those rows are exempt from orphan deletion, so a `todo` placeholder survives the sync that would otherwise prune it. Because the pushed axis and the human axis live in separate columns, a script value and a human value can never collide; `Accordion` legitimately reads `Maturity: beta` + `Implementation: done` at once (ADR-010).

The pull is currently a manual step before deprecation or sign-off work; a scheduled Action wrapping `airtable-pull.js` is a planned Phase 6 item, not built (`ROADMAP.md`, Phase 6). Murphy Trueman frames this two-way shape as the general direction design systems are heading — away from a one-way street where "the design system becomes aspirational rather than actual," toward systems where the source of truth is "the system of constraints, patterns, and decisions" flowing both ways under governance that is "collaborative decision-making," not gatekeeping ("The bidirectional design system: When code talks back to design", https://blog.murphytrueman.com/the-bidirectional-design-system/). This repo's version is narrower and stricter: each field flows in exactly one direction, and the directions are enforced by script guards rather than etiquette.

> **Headline:** Governance is a two-way sync with one-way fields: scripts push everything code can derive on every merge, humans author only deprecation decisions and a one-bit sign-off in Airtable, and a hard guard in `airtable-sync.js` ensures no sync ever overwrites a human `done` (ADR-010).

---

## 4. Who benefits, mechanism by mechanism

### Maintainers

The frozen-memory layer means "what is the system's health?" costs **zero live API calls**. `npm run sense` composes `airtable-governance.json`, `token-usage.json` (from `scripts/token-usage.js`, a repo scan of `var(--ds-*)` and `{alias}` references), and the MCP-captured `figma-variables.json` into `.claude/STATUS_QUO.md` and `.claude/component-pipeline.json` — including the actionable migration backlog of deprecated tokens × live usages (`ROADMAP.md`, Phase 8; `CLAUDE.md`, "Frozen-memory snapshots"). The Figma snapshot covers 414 variables across three collections (`ROADMAP.md`, Phase 8). The only recurring manual governance act is the one-bit `done`/`todo` sign-off in Airtable (ADR-010); everything else is derived, pushed, or diffed by script.

### Developers and consumers

- **Metadata-driven scaffolding.** `/component-scaffold` generates a component's four files from the metadata schema (`component.schema.json`, ADR-001), an existing component as template, and Figma design context; `/add-component` wraps it in the verified loop. Component-specific rules (which token an icon inherits, which props are forbidden) live in each component's `usage.antiPatterns` and are read before generating JSX — and hard constraints are enforced at the type level, not just documented (`CLAUDE.md`, "Component implementation rules").
- **Enforced accessibility contracts.** Tier 1 is static `jsx-a11y` lint for all components; Tier 2 is a behavioral test (`<Name>.a11y.test.tsx`, Vitest + Testing Library + `vitest-axe`) asserting state attributes, focus, and keyboard, **required** for interactive components — `scripts/a11y-coverage.js` derives interactivity from metadata and fails CI if the test is missing (ADR-008). A third deterministic check computes WCAG contrast ratios over the built theme CSS on every token PR (`scripts/token-contrast-check.js`, ADR-008 amendment 2026-07-02).
- **Constrained layout generation.** `/layout-generation` produces pages using only the fixed component set and tokens, every structural choice citing a metadata rule, against a fixed landmark grammar (ADR-011) enforced deterministically by `npm run layout:validate` (`CLAUDE.md`, "Layout grammar").

### Reviewers

The adversarial-review loop catches what deterministic gates structurally can't. The concrete proof is the Accordion pilot: the reviewer subagent caught an `aria-controls` **dead reference** — the trigger pointed at a panel that was unmounted from the DOM when collapsed, so the reference was invalid in exactly the state screen-reader users first encounter — a bug the script gate and the axe scan both missed, because no static linter can know a conditional render will remove the referenced node (`ROADMAP.md`, Phase 9; the stage-by-stage write-up is `docs/add-component-loop-case-study.html`, which the roadmap flags as needing a refresh for the current loop shape). The same review flagged that the test suite asserted `aria-controls` only after opening, missing the collapsed state. The gate itself proves a test *passes*; the reviewer judges whether it tests *the right things* (ADR-008). And findings don't evaporate: `/extract-learnings` routes each one into the component's metadata — the Accordion pilot amended 4 metadata sections from 6 findings via PR #10, with 3 findings deliberately skipped as one-off bugs with no generalizable lesson (`ROADMAP.md`, Phase 7) — so the next scaffold doesn't repeat the mistake.

> **Headline:** Every claimed benefit names its mechanism: maintainers read system health from committed files with zero API calls, developers scaffold against machine-validated metadata and a CI-enforced a11y contract, and reviewers get an adversarial pass that caught a real ARIA dead-reference bug no static gate could see.

---

## 5. Business impact

### How mature design systems tell this story

The best-evidenced external number in this space is Sparkbox's controlled study on IBM Carbon: eight developers built the same form page from scratch and then with Carbon, and the design-system builds were **47% faster** (median 4.2 hours → 2 hours, with the Carbon time including familiarization); the top two submissions for visual consistency both used the design system, while accessibility results were mixed ("The Value of Design Systems Study", Sparkbox, https://sparkbox.com/foundry/design_system_roi_impact_of_design_systems_business_value_carbon_design_system). The recurring narrative categories across published case studies are development velocity, component reuse/adoption rate, defect and accessibility-issue density, and consistency — with Cristiano Rastelli adding coverage and qualitative team feedback, and a caution against over-quantifying: "when humans are involved, not everything can be measured," and the goal of a design system is "not … so people can work less, but … so people can work better" ("Measuring the Impact of a Design System", https://didoo.medium.com/measuring-the-impact-of-a-design-system-7f925af090f7). Those are the categories a reader expects; the numbers themselves belong to other companies' products and are not borrowed here.

### What "lite" avoids, counted in agent invocations

This project runs on Claude Pro, where the scarce resource is the rolling usage window, not per-token billing (`ROADMAP.md`, "Pivot — Ad-hoc agentic loops"). So the honest unit of comparison with a hypothetical fully-agentic design is **agent invocations avoided**, and the count comes straight from the workflows:

- Every token-touching PR: 3 deterministic runs in `tokens-check.yml` — `tokens:build` (Style Dictionary), `scripts/token-contrast-check.js`, `scripts/token-diff.js`.
- Every component PR: 6 deterministic runs in `components-check.yml` — token build, `scripts/validate-metadata.js`, typecheck, component build, `scripts/a11y-coverage.js`, `a11y:test`.
- Every merge to `main`: 5 deterministic runs in `sync-tokens.yml` — three `scripts/airtable-sync.js` pushes, `scripts/sense.js`, and the component push.
- On demand: `scripts/airtable-pull.js`, `scripts/token-usage.js`, `scripts/sense-component.js`, `layout:validate`, `npm run lint`.

A single PR-to-merge cycle therefore executes on the order of **14 checks and syncs with zero LLM involvement**. A fully-agentic design — the kind this repo explicitly evaluated and rejected (ADR-007) — routes each through a model call, with no script/agent boundary at all. Kavcic's cost framing makes the same point from the other side: agent workflows consume roughly 4× the tokens of chat interactions and only make economic sense above a real value-per-run threshold ("Should you build an agent for your design system", https://learn.thedesignsystem.guide/p/should-you-build-an-agent-for-your). Beyond cost, every one of these checks is **deterministic** — same input, same verdict — which is exactly the property a CI gate needs and an LLM call can't promise.

**Illustrative estimate — not this project's actual cost.** Claude Pro is not billed per token, so the following is intuition-scaffolding only, with assumptions and arithmetic shown so it's falsifiable. Assume each replaced script run were instead a mid-size agent call of ~15,000 input + 1,000 output tokens, at Claude Sonnet-class API pricing of $3 per million input / $15 per million output tokens (Anthropic pricing, https://platform.claude.com/docs/en/pricing):

- Per call: 15,000 × $3/1M + 1,000 × $15/1M ≈ $0.045 + $0.015 = **$0.06**
- Per PR cycle (~14 calls): ≈ **$0.84**
- At 20 PR cycles/month: 280 calls ≈ **$17/month** — plus the latency and nondeterminism of 280 model calls standing where 280 instant, reproducible script runs stand today.

The dollar figure is deliberately small; the real cost of fully-agentic on this plan is the usage window. Parallel agents drain it N× simultaneously (ADR-007), and 280 recurring calls a month would consume the same budget the eight judgment moments actually need. The bounded design spends the window only where judgment lives: at most 2 sequential agents per loop run, frozen-file handoffs between stages, and no cap-less fan-out anywhere (`/add-component`, ADR-007).

> **Headline:** A fully-agentic version of this system would route ~14 deterministic checks per PR cycle through an LLM; the lite design runs them as scripts for free and spends the constrained Claude Pro usage window only on the 8 moments where judgment is the deliverable — ≤2 agents per loop, sequential, by design, not as a capability limit.

---

## 6. What was considered and turned down

A feature list says what shipped; the judgment is in what didn't.

**Figma as the source of truth — reversed, not just declined.** The original ADR-002 *did* make Figma upstream: primitives were "Figma-owned, never hand-edited." Working the plan revealed that every automation path for that model was gated — Variables REST API (Enterprise), Code Connect (Org/Enterprise), Token Studio free sync (single file vs. this multi-file architecture) — leaving a silent manual re-export on every token change, "directly at odds with the lite-agentic, one-maintainer, CI-friendly goals" (ADR-002, 2026-06-17 amendment). The decision was amended in place rather than papered over, and the consequence embraced: Figma became a mirror, drift detection became an interactive MCP snapshot (`figma-variables.json`), and ADR-007 records the accepted trade-off that drift detection now "depends on a human remembering to refresh" the snapshot — inherent to the plan, "not a gap to fix later."

**The parallel-agent swarm — evaluated and rejected on three false premises.** ADR-007 documents a full blueprint that was considered: a hub-and-spoke router spawning 2–3 parallel workers, Sonnet-router/Haiku-worker cost tiering, Figma variables pulled over REST. All three load-bearing assumptions fail on this setup: parallel runs are cheap on API billing but drain a shared Pro usage window N× at once; the REST endpoint is Enterprise-gated; per-token model tiering assumes API credits the project doesn't use. The blueprint's three *plan-independent* good ideas were kept — frozen state-file handoffs, an adversarial verification stage, on-demand triggering — and the sequential ≤2-agent loop was built instead. The cap is an economic decision, not a capability gap, and the recorded escape hatch preserves the principle: if one reviewer proves insufficient for stateful components, the answer is "a *second sequential* review pass … over going parallel" (ADR-007).

**Appearance-based component merges and renames.** Visual similarity kept suggesting surface changes — most concretely, `ButtonArrow` and the accordion's expand trigger are both ~28–32px circular icon buttons. ADR-009's three-question test kept them apart on role, not looks: one is navigation (bordered at rest, has `disabled`, left/right axis, `aria-label`), the other is disclosure (borderless, `open/collapsed` state, up/down axis, `aria-expanded`) — "they share a circular shape but nothing else load-bearing." The same test sent the ghost ShowMoreLink pattern *into* Button as a `trailingIcon` prop (same role, presentational difference) and absorbed the accordion trigger as a styled element inside `Accordion.module.css` (single parent, no second consumer — extraction deferred until one exists). This mirrors Trueman's argument that machine consumers force purpose-driven naming over shape-driven naming — "your design system is already an API; the question is whether it's a good one," and "structure scales. Vibes don't" ("Your next design system user is an agent", https://blog.murphytrueman.com/your-next-design-system-user/).

**Smaller rejections in the same spirit.** An automated CSS-co-occurrence derivation for the contrast check was implemented and rejected — cross-multiplying every foreground/background token in a file generates pairs that never render together (mutually exclusive state variants), producing dozens of false failures; the hand-curated pair list is "the more 'lite' choice" (ADR-008, 2026-07-02 amendment). The Storybook test-runner + Playwright a11y harness was rejected as over-engineered for a one-person system in favor of jsdom (ADR-008). And wiring Airtable's per-component `version` column was explicitly deferred because neither "what constitutes a version bump" nor "what a consumer does with the number" has a useful answer before the system has multiple consumers (`ROADMAP.md`, Phase 6) — a rejection of ceremony without a customer.

The library stands at **27 components + 2 hooks** (`useCarousel`, `useSlider`): the 24 from the Phase 3–5 batches plus `DropdownMenu`, `Image`, and `TextLink`, each added as an explicit scope expansion (`ROADMAP.md`, Phase 5 — count reconciled 2026-07-02 against `packages/components/src/components/`).

> **Headline:** The system's most senior decisions are refusals: Figma-as-source reversed when the plan made it unautomatable, a parallel-agent blueprint rejected on its own false economics while keeping its three good ideas, and lookalike components kept apart because role — not shape — defines a component (ADR-002, ADR-007, ADR-009).

---

## Sources

**Repository:** `CLAUDE.md`; `ROADMAP.md`; ADR-001, ADR-002, ADR-007, ADR-008, ADR-009, ADR-010, ADR-011 (`docs/decisions/`); `scripts/airtable-sync.js`, `scripts/airtable-pull.js`, `scripts/sense.js`, `scripts/sense-component.js`, `scripts/token-usage.js`, `scripts/token-contrast-check.js`, `scripts/token-diff.js`, `scripts/a11y-coverage.js`, `scripts/validate-metadata.js`, `scripts/validate-layout.js`; `.github/workflows/tokens-check.yml`, `components-check.yml`, `sync-tokens.yml`; `.claude/commands/*` (the eight moments); `docs/add-component-loop-case-study.html` (cited with its staleness caveat per `ROADMAP.md` Phase 9).

**External:**
- Romina Kavcic, "Should you build an agent for your design system" — https://learn.thedesignsystem.guide/p/should-you-build-an-agent-for-your
- Romina Kavcic, "Design tokens that AI can actually read" — https://learn.thedesignsystem.guide/p/design-tokens-that-ai-can-actually
- Murphy Trueman, "Your next design system user is an agent" — https://blog.murphytrueman.com/your-next-design-system-user/
- Murphy Trueman, "The bidirectional design system: When code talks back to design" — https://blog.murphytrueman.com/the-bidirectional-design-system/
- Sparkbox, "The Value of Design Systems Study: Developer Efficiency and Design Consistency" — https://sparkbox.com/foundry/design_system_roi_impact_of_design_systems_business_value_carbon_design_system
- Cristiano Rastelli, "Measuring the Impact of a Design System" — https://didoo.medium.com/measuring-the-impact-of-a-design-system-7f925af090f7
- Anthropic API pricing (illustrative price point only) — https://platform.claude.com/docs/en/pricing

*(A widely-repeated "Shopify reduced development costs 50% with Polaris" claim surfaced during research only via low-quality secondary sources and is deliberately not used.)*
