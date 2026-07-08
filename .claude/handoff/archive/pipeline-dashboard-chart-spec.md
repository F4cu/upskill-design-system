---
status: done
created: 2026-07-07
completed: 2026-07-07
---

# Chart spec — T5 dashboard views (design handoff)

Design spec for the T5 chart primitive and the three data mappings in
`.claude/handoff/archive/pipeline-dashboard.handoff.md` §T5. Implementation target:
`apps/showcase`. All file shapes and token names below were verified against the
real committed files on 2026-07-07 — do not "correct" them from intuition.

Grounding files read for this spec:

- `.claude/handoff/archive/pipeline-dashboard.handoff.md` (T5 + Chart implementation)
- `packages/tokens/src/theme/light.json`, `packages/tokens/src/theme/dark.json`
- `packages/tokens/dist/css/theme.light.css` (built var names verified)
- `.claude/component-pipeline.json`
- `packages/tokens/airtable-governance.json` (note: lives in `packages/tokens/`, not repo root)
- `packages/tokens/token-usage.json` (same location)
- `packages/tokens/figma-variables.json` (same location)
- `scripts/airtable-pull.js` (governance file producer)
- `scripts/token-contrast-check.js` (curated `PAIRS` list, ~line 74)
- The `dataviz` skill (form heuristic, status-color rule, mark specs, legend rule)

T2's prebuild copy step must therefore copy `airtable-governance.json`,
`token-usage.json`, and `figma-variables.json` from `packages/tokens/`, not the
repo root.

---

## 1. The chart primitive — `SplitChart`

**Files:** `apps/showcase/src/pipeline/SplitChart.tsx` +
`apps/showcase/src/pipeline/SplitChart.module.css` (app-internal, ADR-009
question 3 — not a DS component; do not add metadata/stories for it).

One component, two variants (segmented horizontal bar / donut), one data shape.
It renders **categorical splits of counts that sum to a whole** — nothing else.
Single-value metrics keep using `ProgressBar` (handoff rule).

### 1.1 Prop API

```ts
export type SplitTone =
  | 'success'      // healthy / done / in sync
  | 'warning'      // attention soon / mid-pipeline
  | 'danger'       // blocking backlog / real drift / deprecated
  | 'brand'        // active-work bucket (in progress)
  | 'neutral'      // baseline / pre-loop bucket
  | 'neutralFaint';// not-started / lowest-salience bucket

export interface SplitDatum {
  label: string;   // legend text, e.g. "in review"
  value: number;   // non-negative integer count
  tone: SplitTone;
}

export interface SplitChartProps {
  data: SplitDatum[];        // fixed order; renders segments AND legend in this order
  title: string;             // accessible name; rendered as the <figcaption>
  variant?: 'bar' | 'donut'; // default 'bar'
  centerLabel?: string;      // donut only: unit word under the center total, e.g. "components"
}
```

Rules baked into the component (from the dataviz skill's non-negotiables):

- **Order is identity.** Segment order and legend order are exactly `data` order;
  never re-sort by value. Callers pass the status enum in its canonical order
  (defined per view in §§2–4). Color follows the entity, never its rank.
- **Zero-value entries** are omitted from the SVG (no zero-width rect / zero arc)
  but **kept in the legend** with value `0` — the legend is the stable identity
  surface across snapshots.
- **All-zero / empty `data`:** render the `<figcaption>` and the legend (all
  values 0) plus a `<Text color="subtle">` "No data in snapshot" line; no SVG.

### 1.2 `tone` → semantic token mapping

Tokens verified to exist in both `theme/light.json` and `theme/dark.json` and in
the built `dist/css/theme.light.css`. Fill colors are the *icon/graphic*-strength
feedback steps, not the pale `background.feedback.*` washes — chart marks need
mid-to-strong steps against a card surface (dataviz skill: marks visible against
the surface; status palette reserved for state).

| `tone` | CSS custom property | Light resolves to | Dark resolves to |
|---|---|---|---|
| `success` | `var(--ds-color-icon-feedback-success)` | `color.teal.11` | `color.teal.dark.9` |
| `warning` | `var(--ds-color-icon-feedback-warning)` | `color.amber.9` | `color.amber.7` |
| `danger` | `var(--ds-color-icon-feedback-error)` | `color.red.9` | `color.red.dark.9` |
| `brand` | `var(--ds-color-background-brand)` | `color.brand.9` | `color.brand.dark.9` |
| `neutral` | `var(--ds-color-icon-subtle)` | `color.neutral.10` | `color.neutral.dark.10` |
| `neutralFaint` | `var(--ds-color-background-media-strong)` | `color.neutral.4` | `color.neutral.dark.4` |

Implementation: one CSS-module class per tone (`.toneSuccess` …
`.toneNeutralFaint`) setting `fill`/`background-color` to the `var()` — never an
inline color style (layout-grammar inline-style rule) and never a raw hex.
Because these vary with `data-theme`, light/dark both work with zero JS.

`neutral` vs `neutralFaint` are two grey lightness steps — legal for adjacent
segments only because the legend carries identity (never color alone) and a
lightness gap survives CVD. Do not add more tones; if a view ever needs a 7th
category, fold buckets, don't invent a chart palette (handoff: "never a new
chart-specific palette").

### 1.3 Bar variant geometry

- One horizontal `<svg>` spanning the available width (`width="100%"`,
  `viewBox` computed from a nominal 100-unit width), fixed height **12px**.
- Segments are `<rect>`s proportional to `value / total`, laid left→right in
  `data` order.
- **2px gap between adjacent segments**, showing the card surface through
  (dataviz mark spec: 2px surface gap between fills). Simplest: 2px of empty
  space between rects — no strokes.
- Outer pill rounding: wrap the SVG in a div with
  `border-radius: var(--ds-border-radius-full); overflow: hidden` rather than
  per-rect corner math.
- Each `<rect>` gets a child `<title>` = `"{label}: {value} ({pct}%)"` — the
  minimal hover layer. No tooltip framework; the legend already shows every
  value, so selective-labeling is satisfied without on-mark numbers.

### 1.4 Donut variant geometry

- Square `<svg>` (~160px), segments as stroked `<circle>`/`<path>` arcs,
  stroke width ~16px, starting at 12 o'clock, clockwise in `data` order.
- **2px surface gap between arc segments** (same spacer rule as the bar).
- Center: the total count as a large `<Text>` (or `<Heading>`) plus
  `centerLabel` in `<Text color="subtle">` beneath it — rendered as HTML
  absolutely centered over the SVG, not as SVG `<text>` (keeps typography in DS
  components per the "string props go through Text/Heading" rule).
- Same per-segment `<title>` hover as the bar.

### 1.5 Variant choice rule

`variant` is an explicit prop; callers choose by this rule (from the dataviz
form heuristic):

- **Donut** only when: part-of-whole, **≤ 3 segments**, and the center total is
  itself a headline number worth reading first.
- **Segmented bar** for everything else — always for ≥ 4 segments, and whenever
  segments must be compared against each other rather than against the whole.

Applied to the three views: Maturity → `donut` (3 buckets, "how many components"
is the headline); Implementation → `bar` (5 buckets); Figma drift → `bar`
(reads as a left-to-right "attention → fine" scale); governance backlog →
`bar`, one per layer (§3).

### 1.6 Accessibility markup (exact pattern)

The SVG is decorative; the legend is the accessible data surface.

```tsx
<figure aria-labelledby={captionId} className={styles.splitChart}>
  <figcaption id={captionId}>
    <Text as="span" color="subtle">{title}</Text>
  </figcaption>
  <svg aria-hidden="true" focusable="false" …>…</svg>
  <ul className={styles.legend}>
    {data.map((d) => (
      <li key={d.label} className={styles.legendItem}>
        <span aria-hidden="true" className={`${styles.swatch} ${toneClass[d.tone]}`} />
        <Text as="span">{d.label}</Text>
        <Text as="span" color="subtle">{d.value}</Text>
      </li>
    ))}
  </ul>
</figure>
```

- `<ul>` legend below the SVG; every datum appears as swatch + label + value —
  identity and magnitude are real text, never color-alone. Screen readers get
  caption + list; the aria-hidden SVG adds nothing they'd miss.
- Swatch: ~12px square `<span>`, `border-radius: var(--ds-border-radius-xs)`,
  tone class for background — `aria-hidden` because the adjacent label names it.
- Label/value text always through `<Text>` (component implementation rules) and
  always in text tokens (`text.default` / `text.subtle`), **never** tinted with
  the segment color (dataviz: text wears text tokens).
- A legend is always rendered, even for a single non-zero segment — these are
  status splits, and the zero buckets stay visible (§1.1).
- No keyboard interaction to build: nothing here is operable; hover `<title>` is
  progressive enhancement only.

---

## 2. Component lifecycle view — data mapping

**Source:** `.claude/component-pipeline.json` (copied by T2). Real shape:
`{ generatedAt: string, components: [{ name, type, maturity, implementation,
signedOff, reviewedAt, learningsBackfilled }] }`. `implementation` is already
the merged final value (sense.js derives loop stages; Airtable `done`/`todo`
wins) — do **not** re-derive anything from `signedOff`/`reviewedAt`.

**Chart A — Maturity split** (`variant="donut"`, `centerLabel="components"`,
`title="Maturity"`). Count `components[].maturity` by value; total =
`components.length` (center number). Fixed `data` order and tones:

| order | label (= JSON value) | tone |
|---|---|---|
| 1 | `ready` | `success` |
| 2 | `beta` | `warning` |
| 3 | `deprecated` | `danger` |

Current snapshot sanity check: 27 components, all `beta` → donut is one amber
ring, center "27", legend shows `ready 0 / beta 27 / deprecated 0`. That is
correct output, not a bug.

**Chart B — Implementation split** (`variant="bar"`, `title="Implementation"`).
Count `components[].implementation` by value:

| order | label (= JSON value) | tone | rationale |
|---|---|---|---|
| 1 | `done` | `success` | human-signed-off |
| 2 | `in review` | `warning` | loop artifacts present, awaiting close-out |
| 3 | `in progress` | `brand` | active work |
| 4 | `established` | `neutral` | pre-loop baseline, no review yet |
| 5 | `todo` | `neutralFaint` | planned, not started |

Current snapshot: `in review` = 5 (Accordion, Badge, Button, Icon, Select),
`established` = 22, others 0.

Both charts sit above the per-component drill-down table (handoff: one chart
per view, table underneath). Caption the pair with `generatedAt` ("as of …").

---

## 3. Token governance view — data mapping

**Sources:** `packages/tokens/airtable-governance.json` ×
`packages/tokens/token-usage.json`.

**Governance real shape:** top-level keys `$comment`, `primitives`, `semantic`.
Each section maps dot-path → `{ status: 'active'|'deprecated', owner, successor,
notes }` (nullable except status). **There is no `device` section** —
`scripts/airtable-pull.js` `TABLES` pulls only the Primitive/Semantic tables.
So the view renders **two per-layer bars (primitives, semantic), not three**.
Skip `$`-prefixed keys when iterating. The mirror only contains tokens that have
governance data in Airtable (currently 5 primitives, 0 semantic) — label
denominators "governed tokens", not "all tokens".

**Usage real shape:** `{ css: { "--ds-…": string[] }, aliases:
{ "dot.path": string[] } }` — CSS-var references in built-output consumers, and
`{alias}` references in token source, each mapping to the files containing them.

**Computed values, per layer `L ∈ {primitives, semantic}`:**

```js
const cssVar = (p) => '--ds-' + p.replace(/\./g, '-');   // color.terracotta.9 → --ds-color-terracotta-9
const inUse  = (p) => (usage.css[cssVar(p)]?.length ?? 0) > 0
                   || (usage.aliases[p]?.length ?? 0) > 0;

for each token path p in governance[L] (skip keys starting with '$'):
  status === 'active'                → activeCount
  status === 'deprecated' && !inUse(p) → deprecatedUnusedCount
  status === 'deprecated' &&  inUse(p) → deprecatedInUseCount   // THE backlog
```

**"Deprecated-in-use backlog" definition:** `deprecatedInUseCount` — tokens
Airtable marks `deprecated` that still have ≥ 1 reference in either usage index.
This is the count that blocks `/token-deprecation-pass`, and the number a
maintainer scans for first (handoff §T5.2).

**Rendering:** one `SplitChart variant="bar"` per layer, each under a layer
heading that deep-links to its Airtable table (T3 convention:
`https://airtable.com/appBfY2arkReKQNit/tblAl09uImcO1VPeb` Primitives,
`…/tblxMSyL7EFIXltqX` Semantic). Fixed `data` order and tones per bar:

| order | label | tone |
|---|---|---|
| 1 | `deprecated in use` | `danger` |
| 2 | `deprecated (unused)` | `warning` |
| 3 | `active` | `success` |

Also surface the cross-layer `deprecatedInUseCount` sum as the section's
headline stat (a plain `<Text>`/`<Heading>` number — not a chart; single value).
Current snapshot: 5 active / 0 / 0 in primitives; semantic bar renders its
empty state (§1.1).

---

## 4. Figma drift view — data mapping

**Source:** `packages/tokens/figma-variables.json`. Real shape (top-level):
`$comment`, `fileKey`, `capturedAt` ("2026-07-07"), `capturedVia`, `summary`
(`{ Primitives: 288, Theme: 106, Device: 60 }`), `representationalDivergences`
(`{ reason, variables: string[] }`, 27 names), `collections`
(`{ Primitives|Theme|Device: { modes, variables } }`),
`figmaExtrasAwaitingDecision` (`{ reason, variables: string[], note }`, 13 names).

**Honesty constraint:** this file is an annotated mirror, not a diff. Value-level
drift (a hex differing between code and Figma) is computed interactively by
`/figma-variable-audit`, not stored here — so the dashboard's "real drift" is
exactly the snapshot's own annotation lists, nothing more. Caption the chart
with `capturedAt` ("as of 2026-07-07 …").

**Three-way split, precise definitions** (verified against the real file):

```js
const extras  = new Set(figma.figmaExtrasAwaitingDecision.variables);   // 13
const repDiv  = new Set(
  figma.representationalDivergences.variables.filter(v => !extras.has(v)) // 14
);
// total = per-collection variable-name counts, summed (450 unique names but
// count per (collection, name) pair — matches `summary`: 288+106+60 = 454)
let realDrift = 0, expected = 0, inSync = 0;
for (const col of Object.values(figma.collections))
  for (const name of Object.keys(col.variables))
    extras.has(name) ? realDrift++ : repDiv.has(name) ? expected++ : inSync++;
```

- **Real drift** = membership in `figmaExtrasAwaitingDecision.variables` —
  Figma variables with no corresponding code token, owner decision pending (the
  13 orphaned Device line-height vars from the removed indirection layer,
  per the file's own `note`).
- **Expected representational divergence** = membership in
  `representationalDivergences.variables` **minus** the extras — the 14
  `font/line-height/1`–`14` unitless ratios Figma can only hold as px
  (CLAUDE.md "Figma representational constraints": divergence by construction,
  not drift; never flagged).
- **In sync** = every other (collection, variable) pair.
- **Precedence:** the 13 extras appear in *both* top-level lists in the real
  file — `figmaExtrasAwaitingDecision` wins. Without this rule the categories
  double-count.

Current snapshot: real drift 13 / expected 14 / in sync 427 (total 454).

**Rendering:** one `SplitChart variant="bar"` (3 segments but the whole is 454
variables — the center-total headline reads worse than the left-anchored
"needs attention" sliver, so bar, not donut). Fixed order and tones:

| order | label | tone |
|---|---|---|
| 1 | `real drift` | `danger` |
| 2 | `expected divergence` | `neutral` |
| 3 | `in sync` | `success` |

`expected divergence` is deliberately `neutral`, not `warning` — it is *fine*
by definition; amber would tell the viewer to act on something that never needs
action (the handoff requires it "visually distinct from real drift", and grey
vs red does that without a false alarm). Given the 13/14/427 proportions, the
first two segments will be slivers — the legend values carry the exact counts,
which is why the legend is mandatory (§1.6).

---

## 5. Contrast-check cross-reference (for the implementing engineer — do NOT add these yourself in this task; list them in the PR and update `scripts/token-contrast-check.js` per its curated-pairs convention)

The charts render inside `Card`, whose surface is
`--ds-color-background-container-elevated` (verified via `token-usage.json`:
`Card/Card.module.css`). New foreground(fill)/background pairs this feature
introduces, none currently in the script's `PAIRS` list (~line 74):

| Foreground (segment/swatch fill) | Background |
|---|---|
| `--ds-color-icon-feedback-success` | `--ds-color-background-container-elevated` |
| `--ds-color-icon-feedback-warning` | `--ds-color-background-container-elevated` |
| `--ds-color-icon-feedback-error` | `--ds-color-background-container-elevated` |
| `--ds-color-background-brand` | `--ds-color-background-container-elevated` |
| `--ds-color-icon-subtle` | `--ds-color-background-container-elevated` |
| `--ds-color-background-media-strong` | `--ds-color-background-container-elevated` |

Notes for whoever adds them:

- These are **graphical objects**, not text — the applicable WCAG bar is 1.4.11
  non-text contrast (3:1), not 4.5:1. If the script only knows a text threshold,
  annotate the entries (comment or a threshold field) rather than waiving.
- `--ds-color-background-media-strong` (`neutral.4`) against the elevated card
  is expected to be low-contrast in light mode. It is legal here **only**
  because identity is never carried by color alone (legend, §1.6); if the
  check fails at 3:1, that is a real finding — either bump the `neutralFaint`
  mapping to a darker step or record it in
  `scripts/token-contrast-waivers.json` with this rationale, per the shrinking-
  ledger convention. Decide in the implementation PR, not silently.
- If any chart ends up rendered directly on the page background instead of in a
  `Card`, add the same six foregrounds against
  `--ds-color-background-container-page` too.
- Legend text introduces no new pairs — it uses the existing `text.default` /
  `text.subtle` on card surfaces already covered by component usage.
