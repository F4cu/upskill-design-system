---
sources:
  - scripts/a11y-coverage.js
  - scripts/token-contrast-check.js
  - scripts/a11y-backlog.json
  - scripts/token-contrast-waivers.json
  - docs/decisions/008-behavioral-a11y-tier.md
  - docs/decisions/007-verified-component-loop.md
  - .github/workflows/tokens-check.yml
---
# Accessibility

## What it is

Accessibility verification runs in three tiers, each deterministic and CI-gated ([ADR-008](decisions/008-behavioral-a11y-tier.md), amended 2026-07-02):

1. **Tier 1 — static lint, all components.** `npm run lint` runs ESLint + `eslint-plugin-jsx-a11y` over `packages/components/src`.
2. **Tier 2 — behavioral tests, interactive components only.** A co-located `<Name>.a11y.test.tsx` (Vitest + Testing Library + `vitest-axe`, jsdom) asserting the dynamic ARIA contract — state attributes toggling, focus, keyboard — plus an axe scan.
3. **Tier 3 — token-level contrast math.** `npm run tokens:contrast-check` computes WCAG relative-luminance contrast ratios against the *built* theme CSS.

## Why it's built this way

### Static lint can't see the dynamic contract

ADR-008's context section states the gap directly: static lint "catches markup smells visible without rendering — missing `alt`, invalid roles, unlabelled inputs — but cannot verify the **dynamic contract** a screen-reader user actually experiences: that `aria-expanded` flips when an Accordion header toggles, that focus lands correctly, that keyboard (Enter/Space/arrows) drives it." The Accordion — the `/add-component` pilot — is exactly where this bites, because its entire accessibility story is behavioral.

Three harness options were weighed. Storybook test-runner + Playwright + axe (a real browser) was rejected as "heavy for a one-person lite-agentic system" — Playwright installs plus a running Storybook server in CI. An agentic-only APG checklist was rejected because it's not a repeatable machine gate and costs usage-window per run. The pick: **Vitest + Testing Library + `vitest-axe` in jsdom** — no browser, fast, deterministic.

### Gated by *derived* interactivity, not applied everywhere

Requiring behavioral tests for every component would "write near-empty tests for ~18 display/landmark components." Instead, `scripts/a11y-coverage.js` derives interactivity from existing metadata (no schema change): a component is interactive if `component.type ∈ {interactive, input}`, **or** its `accessibility.role` is an interactive ARIA role, **or** it declares a keyboard interaction beyond plain Tab / native scroll. A naive "has any `keyboardInteraction`" rule was explicitly rejected — it over-includes `AppHeader`, `Breadcrumb`, and `ScrollArea` via native-scroll Tab behavior. The derivation resolves to the genuine widgets: `Button`, `ButtonArrow`, `Chip`, `Checkbox`, `Select`, `TextField`, `DropdownMenu` (plus `Accordion` once built). Non-interactive components (`Badge`, `Divider`) need no test.

### The jsdom trade-off, accepted and then partially closed

jsdom cannot judge layout or color, so three things stay out of Tier 2's scope: color contrast, visible focus rings, and real assistive-technology behavior (NVDA/VoiceOver) — those remain visual review plus Storybook's `addon-a11y` panel, and axe's `color-contrast` rule is disabled in the tests.

The 2026-07-02 amendment closed the contrast gap from a different direction. A manual audit (issue #20) found 12 failing pairs in the light theme and 6 in dark shipping silently — including a primary Button label at **3.70:1** against the 4.5:1 requirement. Since contrast is pure math over resolved colors, it doesn't need a browser at all: `scripts/token-contrast-check.js` computes WCAG relative-luminance ratios against the built theme CSS, wired into `tokens-check.yml` on every PR touching token source. Since the brand layer landed it is brand-aware: it discovers every `dist/css/brand.*.css` and resolves each pair against `theme.{light,dark}.css` per brand, so every brand × theme combination is checked.

The checked pairs are **hand-curated**, grouped by component with the rendering context documented inline — *not* auto-derived from CSS co-occurrence. That derivation was tried and rejected: mutually exclusive state variants (Button default/disabled/outlined) get cross-multiplied into pairs that never actually render together, producing dozens of false failures.

## How it works, concretely

The three gates a PR runs:

```bash
npm run lint                  # Tier 1 — jsx-a11y static checks, all components
npm run a11y:coverage         # Tier 2 completeness — fails if an interactive component lacks its test
npm run a11y:test             # Tier 2 — behavioral tests + axe scan (jsdom)
npm run tokens:contrast-check # Tier 3 — WCAG contrast math over built theme CSS
```

New Tier 2 tests are modelled on `packages/components/src/Button/Button.a11y.test.tsx`. Two shrinking ledgers keep known debt visible instead of silently waived:

- `scripts/a11y-backlog.json` — pre-existing interactive components pending test backfill. New interactive components **cannot** be added to it, and stale entries fail the check. The backfill is complete: the ledger is currently empty, exactly as a shrinking ledger should end up.
- `scripts/token-contrast-waivers.json` — tracked contrast failures (e.g. the ProgressBar fill `background.progress` on `background.neutral.subtle` at ~1.6–2.8:1 against the 3:1 non-text requirement, across brand/theme combinations, linked to issue #22), same shrinking-ledger convention.

Tier 2 is also wired into the verified component loop: the [ADR-007](decisions/007-verified-component-loop.md) amendment adds `a11y:coverage && a11y:test` to the loop's deterministic gate, and the adversarial reviewer judges coverage *completeness* — every metadata `keyboardInteraction`, every toggling state attribute, focus behavior, and APG semantics — not just whether the existing tests pass. See [Agentic moments](06-agentic-moments.md).

## Related

- ADRs: [008 — Behavioral a11y tier](decisions/008-behavioral-a11y-tier.md) (+ 2026-07-02 amendment), [007 — Verified component loop](decisions/007-verified-component-loop.md) (gate amendment)
- Scripts: `scripts/a11y-coverage.js`, `scripts/token-contrast-check.js`, `scripts/a11y-backlog.json`, `scripts/token-contrast-waivers.json`
- Commands: `npm run lint`, `npm run a11y:coverage`, `npm run a11y:test`, `npm run tokens:contrast-check` — see the [npm scripts reference](07-npm-scripts-reference.md)
