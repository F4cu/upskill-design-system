---
sources:
  - scripts/a11y-coverage.js
  - scripts/token-contrast-check.js
  - scripts/a11y-backlog.json
  - scripts/token-contrast-waivers.json
  - docs/decisions/008-behavioral-a11y-tier.md
  - docs/decisions/007-verified-component-loop.md
  - .github/workflows/tokens-check.yml
# clock reset 2026-07-10: tokens-check.yml gains concurrency + PR-only trigger + npm ci base build; contrast gate still runs on every token PR, page still accurate
# clock reset 2026-07-12: ADR-007 gains a renamed-review-path parenthetical (#64 docs sweep); this page uses no review-path vocabulary, still accurate
# clock reset 2026-07-13: #70 adds a deprecation-sync check step to tokens-check.yml; the contrast gate this page describes is unchanged, still accurate
# clock reset 2026-07-23: ADR-007 promoted proposed→accepted (exit condition met: Accordion 2026-07-09, 12 ledger runs) — status flip + amendment only, loop mechanics unchanged, page still accurate
---
# Accessibility

## What it is

Accessibility verification runs in three tiers plus a zero-maintenance baseline sweep, each deterministic and CI-gated ([ADR-008](decisions/008-behavioral-a11y-tier.md), amended 2026-07-02 and 2026-07-14):

1. **Tier 1 — static lint, all components.** Every component's markup is checked for accessibility mistakes visible without ever rendering it — missing labels, invalid roles (`npm run lint`, which runs ESLint + `eslint-plugin-jsx-a11y` over `packages/components/src`).
2. **Tier 2 — behavioral tests, interactive components only.** Each interactive component gets tests proving it actually works the way a keyboard or screen-reader user experiences it — state attributes toggling, focus, keyboard — plus a scan with axe (the industry-standard automated accessibility rule checker). These assertions of the dynamic ARIA contract live in a co-located `<Name>.a11y.test.tsx` (Vitest + Testing Library + `vitest-axe`, jsdom).
3. **Tier 3 — token-level contrast math.** Every curated text-on-background color pairing is verified to meet WCAG's minimum contrast ratios (`npm run tokens:contrast-check`, which computes WCAG relative-luminance contrast ratios against the *built* theme CSS).

Underneath the tiers, a **story axe sweep** (`npm run a11y:stories`, 2026-07-14 amendment, issue #72) renders *every* Storybook story via portable stories in jsdom and runs axe on its initial render — so baseline coverage grows automatically with each new story, no test file written. It complements Tier 2 rather than replacing it: axe sees only the rendered snapshot, not keyboard, focus, or state changes.

## Why it's built this way

### Static lint can't see the dynamic contract

ADR-008's context section states the gap directly: static lint "catches markup smells visible without rendering — missing `alt`, invalid roles, unlabelled inputs — but cannot verify the **dynamic contract** a screen-reader user actually experiences: that `aria-expanded` flips when an Accordion header toggles, that focus lands correctly, that keyboard (Enter/Space/arrows) drives it." The Accordion — the `/add-component` pilot — is exactly where this bites, because its entire accessibility story is behavioral.

Three harness options were weighed. Storybook test-runner + Playwright + axe (a real browser) was rejected as "heavy for a one-person lite-agentic system" — Playwright installs plus a running Storybook server in CI. An agentic-only APG checklist was rejected because it's not a repeatable machine gate and costs usage-window per run. The pick: **Vitest + Testing Library + `vitest-axe` in jsdom** — no browser, fast, deterministic.

### Gated by *derived* interactivity, not applied everywhere

Requiring behavioral tests for every component would "write near-empty tests for ~18 display/landmark components." Instead, `scripts/a11y-coverage.js` derives interactivity from existing metadata (no schema change): a component is interactive if `component.type ∈ {interactive, input}`, **or** its `accessibility.role` is an interactive ARIA role, **or** it declares a keyboard interaction beyond plain Tab / native scroll. A naive "has any `keyboardInteraction`" rule was explicitly rejected — it over-includes `AppHeader`, `Breadcrumb`, and `ScrollArea` via native-scroll Tab behavior. The derivation resolves to the genuine widgets: `Button`, `ButtonArrow`, `Chip`, `Checkbox`, `Select`, `TextField`, `DropdownMenu` (plus `Accordion` once built). Non-interactive components (`Badge`, `Divider`) need no test.

### The jsdom trade-off, accepted and then partially closed

jsdom is a simulated browser environment that runs inside Node — it builds the DOM and accessibility structure of a page without rendering any pixels, which is why it's fast but can't judge layout or color. Because of that, three things stay out of Tier 2's scope: color contrast, visible focus rings, and real assistive-technology behavior (NVDA/VoiceOver) — those remain visual review plus Storybook's `addon-a11y` panel, and axe's `color-contrast` rule is disabled in the tests.

The 2026-07-02 amendment closed the contrast gap from a different direction. A manual audit (issue #20) found 12 failing pairs in the light theme and 6 in dark shipping silently — including a primary Button label at **3.70:1** against the 4.5:1 requirement. Since contrast is pure math over resolved colors, it doesn't need a browser at all: `scripts/token-contrast-check.js` computes WCAG relative-luminance ratios against the built theme CSS, wired into `tokens-check.yml` on every PR touching token source. Since the brand layer landed it is brand-aware: it discovers every `dist/css/brand.*.css` and resolves each pair against `theme.{light,dark}.css` per brand, so every brand × theme combination is checked.

The checked pairs are **hand-curated**, grouped by component with the rendering context documented inline — *not* auto-derived from CSS co-occurrence. That derivation was tried and rejected: mutually exclusive state variants (Button default/disabled/outlined) get cross-multiplied into pairs that never actually render together, producing dozens of false failures. The curation convention — add a pair whenever a component changes what text/icon/border color renders against what background — is stated in the script's header and restated in `.claude/rules/components.md`, the path-scoped rule loaded when touching component code.

## How it works, concretely

The three gates a PR runs:

```bash
npm run lint                  # Tier 1 — jsx-a11y static checks, all components
npm run a11y:coverage         # Tier 2 completeness — fails if an interactive component lacks its test
npm run a11y:test             # Tier 2 — behavioral tests + axe scan (jsdom)
npm run a11y:stories          # Baseline sweep — axe over every story's initial render (jsdom)
npm run tokens:contrast-check # Tier 3 — WCAG contrast math over built theme CSS
```

The sweep (`packages/components/src/a11y-stories.sweep.test.tsx`) respects `addon-a11y` story parameters: set `parameters.a11y.test: 'off'` on a story to skip it, or `parameters.a11y.config.rules` to override individual axe rules — exclusions live on the story, where Storybook's a11y panel also reads them. `color-contrast` is disabled for the same jsdom reason as Tier 2; Tier 3 covers it.

New Tier 2 tests are modelled on `packages/components/src/Button/Button.a11y.test.tsx`. Two shrinking ledgers keep known debt visible instead of silently waived:

- `scripts/a11y-backlog.json` — pre-existing interactive components pending test backfill. New interactive components **cannot** be added to it, and stale entries fail the check. The backfill is complete: the ledger is currently empty, exactly as a shrinking ledger should end up.
- `scripts/token-contrast-waivers.json` — tracked contrast failures (e.g. the ProgressBar fill `background.progress` on `background.neutral.subtle` at ~1.6–2.8:1 against the 3:1 non-text requirement, across brand/theme combinations, linked to issue #22), same shrinking-ledger convention.

The screenshot-baseline gate ([ADR-019](decisions/019-screenshot-baseline-visual-regression.md)) sits below these tiers rather than inside them, and it follows the same "trust promoted on evidence" pattern as the shrinking ledgers above: it runs advisory in CI today, with a documented escalation path — CI-generated baselines, then blocking once diff ratios are quiet — rather than being trusted as a hard gate from day one. See [Self-improving loops](11-self-improving-loops.md).

Tier 2 is also wired into the verified component loop: the [ADR-007](decisions/007-verified-component-loop.md) amendment adds `a11y:coverage && a11y:test` to the loop's deterministic gate, and the adversarial reviewer judges coverage *completeness* — every metadata `keyboardInteraction`, every toggling state attribute, focus behavior, and APG semantics — not just whether the existing tests pass. See [Agentic moments](06-agentic-moments.md).

## Related

- ADRs: [008 — Behavioral a11y tier](decisions/008-behavioral-a11y-tier.md) (+ 2026-07-02 and 2026-07-14 amendments), [007 — Verified component loop](decisions/007-verified-component-loop.md) (gate amendment)
- Scripts: `scripts/a11y-coverage.js`, `scripts/token-contrast-check.js`, `scripts/a11y-backlog.json`, `scripts/token-contrast-waivers.json`
- Commands: `npm run lint`, `npm run a11y:coverage`, `npm run a11y:test`, `npm run a11y:stories`, `npm run tokens:contrast-check` — see the [CLI reference](07-cli-reference.md)
