# ADR-008 — Behavioral a11y verification tier, gated by component complexity

**Date:** 2026-06-22
**Amended:** 2026-07-14
**Status:** `accepted`

## Context

The a11y gate was **static only**: `npm run lint` runs ESLint + `eslint-plugin-jsx-a11y` over
`packages/components/src`. That catches markup smells visible without rendering — missing `alt`,
invalid roles, unlabelled inputs — but cannot verify the **dynamic contract** a screen-reader user
actually experiences: that `aria-expanded` flips when an Accordion header toggles, that focus lands
correctly, that the expanded region is associated and announced, that keyboard (Enter/Space/arrows)
drives it. `@storybook/addon-a11y` is installed but is a manual, in-browser axe panel — not an
automated CI gate, and still snapshot-only (no keyboard/state-change assertions).

ROADMAP Phase 3/9 deferred an axe-core runtime behind a Storybook test-runner that was itself blocked
by a Storybook version conflict. That framing is what stalled the work; the components package is now
fully on Storybook 10, so the original blocker is moot regardless.

The `Accordion` (Phase 5d, the pending `/add-component` pilot) is where this gap bites — its entire
accessibility story is behavioral. `Badge` (the shipped pilot) has none. Applying behavioral testing
to every component would write near-empty tests for ~18 display/landmark components and burn
time/usage on components with no dynamic contract.

Options considered for the harness:

1. **Storybook test-runner + Playwright + axe** — play functions in a real headless browser. Closest
   to real rendering, but needs Playwright browser installs and a running Storybook server in CI;
   heavy for a one-person lite-agentic system.
2. **Vitest + Testing Library + `vitest-axe` (jsdom)** — no browser. Asserts the behavioral ARIA
   contract (state attributes, focus order, keyboard via `user-event`) plus an axe rule scan, as a
   fast deterministic CI script.
3. **Agentic-only** — the loop's reviewer runs an APG checklist; no repeatable machine gate.

## Decision

**A two-tier a11y model, with Tier-2 gated by derived component interactivity, run on Vitest +
Testing Library + `vitest-axe` in jsdom (Option 2).**

- **Tier 1 (all components):** static `jsx-a11y` lint — unchanged, stays default.
- **Tier 2 (interactive components only):** a co-located `<Name>.a11y.test.tsx` asserting the dynamic
  contract + an axe scan. Playwright/Storybook test-runner (Option 1) was rejected as
  over-engineered: jsdom covers the *behavioral* contract that's the actual gap, and the
  layout-dependent rules jsdom can't judge (color-contrast, visible focus ring) stay with the static
  lint, the addon-a11y panel, and visual review — out of this tier's scope. Option 3 was rejected as
  the sole mechanism because it isn't a repeatable gate and costs usage-window per run; the agentic
  reviewer instead *judges coverage completeness* on top of the deterministic tests.

**Interactivity is derived from existing metadata — no schema change, no per-component migration.**
`scripts/a11y-coverage.js` computes:

```
isInteractive(meta) =
  meta.component.type ∈ {interactive, input}
  OR meta.accessibility.role matches an interactive ARIA role (word-boundary)
  OR a keyboardInteraction exists whose key is beyond plain Tab/Shift+Tab and is not "native browser behaviour"
```

The bare "has any keyboardInteraction" signal was deliberately **not** used — "Tab moves focus" and
native scroll appear across landmark/container metadata and over-include (AppHeader, Breadcrumb,
ScrollArea). The refined rule resolves to exactly the seven genuine widgets: Button, ButtonArrow,
Chip, Checkbox, Select, TextField, DropdownMenu (plus Accordion when built). An `accessibility.pattern`
field naming the APG pattern was considered and rejected — it would touch every component's metadata
and duplicate what the test file already encodes; ADR-001 is **not** amended.

The coverage script **enforces completeness** (interactive ⇒ must have a test) and carries a shrinking
`scripts/a11y-backlog.json` ledger that waives pre-existing interactive components pending backfill,
so turning the CI gate on doesn't redden `main`. New interactive components cannot be waived; the
ledger fails if an entry becomes stale (covered, no longer interactive, or gone).

## Consequences

- **The behavioral contract is now machine-verified for the components that have one**, in CI and in
  the `/add-component` Stage-2 gate, as a deterministic script (fits the charter: agents do only what
  a script can't).
- **The deferred axe-core item is unblocked** via the jsdom path, sidestepping the Storybook
  test-runner the original blocker assumed.
- **The loop's adversarial reviewer (Stage 3) gains a real a11y job**: judge whether the test covers
  the right things (every metadata `keyboardInteraction`, the toggling state attribute, focus, APG
  semantics) — completeness judgment a passing test can't prove. See ADR-007 amendment.
- **Scoped cost:** no near-empty tests for display components; Badge's path is unchanged.
- **Trade-off accepted — jsdom is not a browser.** Color-contrast, visible focus ring, and real-AT
  (NVDA/VoiceOver) behavior are out of scope and stay with visual review + the addon-a11y panel. The
  axe `color-contrast` rule is disabled in tests because jsdom can't compute it.
- **Trade-off accepted — the backlog is debt.** Six pre-existing interactive components ship waived;
  the ledger keeps the debt visible and shrinking until empty, at which point the waiver branch and
  file can be removed.
- Revisit if the plan gains Figma/browser CI capacity (a real-browser axe pass could supplement
  jsdom) or if jsdom proves too lossy for a specific widget (escalate that component to a Storybook
  play-function test rather than switching the whole tier).

## Amendment (2026-07-02) — Third tier: deterministic token-level color-contrast check

Color-contrast was explicitly out of scope for both tiers above — Tier 1's static lint doesn't render
anything, and Tier 2 disables axe's `color-contrast` rule because jsdom can't compute layout/paint. It
was left to manual visual review and the Storybook `addon-a11y` panel. A manual audit (2026-07-02,
issue #20) found 12 failing text/icon/border pairs in the light theme and 6 in dark shipping silently —
proof the manual-only path wasn't catching real regressions, including a primary Button label at
3.70:1 against a 4.5:1 requirement.

Color-contrast turns out not to need a browser at all: it's pure math (WCAG relative luminance) over
*resolved* color values, and Style Dictionary already resolves every alias to a concrete hex/rgba in
the built CSS (`dist/css/theme.{light,dark}.css`). That sidesteps the jsdom limitation that kept the
rule disabled in Tier 2 — the gap wasn't "contrast checking is hard," it was "jsdom can't paint," and
the built output is already painted, in the sense that matters for this math.

**Decision:** add a third, independent, deterministic check — `scripts/token-contrast-check.js`
(`npm run tokens:contrast-check`), wired into `tokens-check.yml` on every PR touching token source. It
is not a Tier (it doesn't gate on component interactivity or metadata) and it doesn't touch
`a11y-coverage.js`; it runs against the token build directly, independent of any one component.

Foreground/background pairs are **hand-curated** in the script (grouped by component, with the
rendering context documented inline), not derived by scanning CSS Modules for co-occurring custom
properties. An automated derivation was implemented and rejected during this work: pairing every
foreground token referenced in a file against every background token in that same file over-generates
— a single component's mutually-exclusive state variants (e.g. Button's default/disabled/outlined)
get cross-multiplied into pairs that never actually render together, producing dozens of false
failures with no real defect behind them. The curated list is the more "lite" choice: it's exactly as
large as what's actually shipped, each entry is traceable to a real render, and the convention (add a
pair when a component's rendered foreground/background combination changes) is stated once, in the
script's header comment, rather than requiring a cascade-resolving CSS parser to stay correct.

The check surfaced two additional near-miss failures in the very token family the 2026-07-02 manual
fix touched (`text.selected` and `text.brand`, each ~4.35:1 against a 4.5:1 requirement on hover/
selected overlay backgrounds) that the manual/visual pass missed. Rather than force a token change
into this PR — the only available fix, a primitive scale step, overshoots and collides visually with
`text.feedback.error` — these are tracked in `scripts/token-contrast-waivers.json`, a shrinking ledger
in the same shape as `scripts/a11y-backlog.json` (stale entries fail the check), linked to issue #21
for a deliberate design fix.

### Consequences

- Color-contrast for real component surfaces is now machine-verified in CI, closing the gap this ADR
  originally left as an accepted trade-off.
- The curated-pairs convention adds a small, explicit maintenance step to changing a component's
  color usage — the same shape as `scripts/a11y-backlog.json`'s discipline, not a new pattern.
- Two known failures are tracked, not hidden or force-fixed under time pressure; the waiver ledger's
  stale-entry check ensures they can't be silently forgotten once resolved.

## Amendment (2026-07-14) — Zero-maintenance story axe sweep underneath the tiers (issue #72)

Tier 2 covers only the components `a11y-coverage.js` derives as interactive, and only what each
hand-written test asserts. Every other component's stories — and every new story added to a covered
component — got no automated axe pass at all. Storybook's portable stories close that gap without a
per-component test file: one generic test (`src/a11y-stories.sweep.test.tsx`, run by
`vitest.stories.config.ts` as `npm run a11y:stories`) globs every `*.stories.tsx`, composes each story
with the preview annotations (theme/brand decorators included), renders it in jsdom, and runs axe.

**Decision:** add the sweep as a third automated layer *underneath* the tiers, in `components-check.yml`
alongside the existing gates. It is deliberately **not** Option 1 (Storybook test-runner / real
browser) reopened: it runs in the same jsdom environment as Tier 2, with `color-contrast` disabled for
the same reason — layout-dependent rules stay with `tokens:contrast-check` and visual review. The
sweep respects `addon-a11y` story parameters (`parameters.a11y.test: 'off'` skips a story;
`parameters.a11y.config.rules` overrides rule defaults), so known exclusions live on the story, where
the addon panel also reads them.

The sweep does not change Tier-2 semantics: it checks each story's *initial render* only, while
Tier-2 tests assert the dynamic contract (state toggling, focus, keyboard) axe cannot see.
`a11y-coverage.js` still tracks behavioral-test existence and is untouched. On landing, the sweep
immediately caught a real violation (DropdownMenu's standalone-listbox story lacking an accessible
name), confirming it earns its place.

### Consequences

- Baseline axe coverage now grows with every story at zero marginal cost — a new story is axe-checked
  in CI with no test file written.
- Story quality becomes load-bearing: a story that renders a component in an invalid isolation (e.g.
  an unlabelled listbox) now fails CI and must either be fixed or carry an explicit
  `parameters.a11y` exclusion on the story itself.
- The sweep runs all stories in one jsdom pass (~2s for 123 stories), so the CI cost is negligible.
