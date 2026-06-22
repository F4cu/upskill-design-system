# ADR-008 — Behavioral a11y verification tier, gated by component complexity

**Date:** 2026-06-22
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
