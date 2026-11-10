---
status: active
created: 2026-11-10
completed:
---

# Rename `<Name>.metadata.json` → `<Name>.usage.json`, after a schema and labelling review

**Goal.** Rename the 27 per-component `metadata.json` files to `usage.json`. The rename is blocked on a review of the schema's structure and field labels (`packages/components/component.schema.json`), which will start with an audit of how other design systems structure and label the same information. Do the rename and the relabel together, in one breaking change and one ADR amendment, not two migrations.

## Why `usage.json`

Since ADR-027 split the builder data (anatomy, props, states, styles, a11y) into `<Name>.spec.json`, the metadata file only holds the information for *choosing and combining* components, which `/layout-generation` reads for all 27 components on every run. "Usage" describes that role better than the generic "metadata".

**Not a reason:** an industry convention. A 2026-11-10 search found no established `usage.json` convention. Agent-facing systems use a mix of names (`*.meta.ts`, `metadata/index.json`, `component-usage.toon`, …). The case for the rename is the meaning alone.

## Current shape (what the review covers)

| Section | Fields | Notes |
|---|---|---|
| `component` | `name`, `category` (atom/molecule/organism/layout), `type` (interactive/display/container/input), `status` (beta/ready/deprecated), `description`, `figmaNodeId` | `status` is the Maturity axis pushed to Airtable (ADR-010) |
| `usage` | `keywords`, `when`, `patterns`, `antiPatterns` | Clashes with the new file name: `Button.usage.json → .usage.when` |
| `variants` | Named axes, each with `options`, `default`, `purpose` | Prohibited combinations live in `purpose` prose (ADR-027 Context) |
| `composition` | `accepts`, `composedOf`, `containedBy`, `layoutBehavior`, `parts` | `parts` = ADR-023 compound parts |

## Open questions for the audit

1. **Inner `usage` key.** Once the file is called `usage.json`, rename this section (`guidance`? `selection`?) or flatten its fields to the top level.
2. **Labelling.** Compare each field name with how other systems label the same idea: `when` vs `whenToUse`/`useCases`, `antiPatterns` vs `whenNotToUse`/`don'ts`, `patterns` vs `examples`, `containedBy` vs `parents`, `category` (atomic-design levels) vs a functional taxonomy.
3. **Structure.** Should `variants` stay here, given the selection reader needs it but `spec.json` `props` duplicates the axes? Should `component.status` move, given it is lifecycle, not usage?
4. **What `/layout-generation` actually reads.** Any field it doesn't use costs tokens 27 times per run (ADR-027 Context, point 1). Check against the pattern-accuracy harness before adding fields.

Suggested audit set: Polaris, Carbon, Atlassian, Primer, Spectrum, GOV.UK, plus any agent-facing manifests (Custom Elements Manifest, design-system MCP servers) for machine-readable labelling.

## Prior art: `design-session/toolkit-research` (read 2026-11-10)

That project has already run this audit for its own pattern library: `usage-docs-benchmark.md` (GOV.UK, Carbon, Atlassian, Polaris, Primer, 11-02), `judgment-recheck.md` (Figma guidelines, Southleft, Storybook, Carbon, 10-31) and `archive/component-contracts.md` §4 and §12 (contract fields, naming rules). Start from those notes and only fill in the gaps (Spectrum, Material 3). Takeaways for this schema, checked against `Button` and `Badge`:

| # | Takeaway | Seen here | Candidate change |
|---|---|---|---|
| T1 | **Split by reader, picking vs building**: their contract has the same two blocks as ADR-027. This backs the rename: `usage.json` *is* the picking block. | Some of Button's `antiPatterns` are build rules ("passing raw design values via style", "defaulting the type attribute" on *new* components). Badge's "not type-enforced" is a spec gap. | Move build rules to `spec.json` (`constraints` / `ruledOut`). `usage.json` keeps only wrong *picks*. |
| T2 | **Write `pick_when` as a situation, not a description.** 57 of 195 of their entries described the component, so only someone who already knew the answer matched them (D-246). | Button `when`: "Triggering a form submit, modal open, or in-page state change" describes the component. Most others are good situations. | Rename `when` → `pickWhen` (or `useWhen`), with a writing rule: a situation the reader is in. |
| T3 | **`avoid_when`: `case` · `because` · `instead`, with `instead` as an id.** Every "don't" names its replacement and why. Others list related components with no reason. | `antiPatterns` already has `scenario`/`reason`/`alternative`, but `alternative` is prose ("Use Chip, which renders…"). | `alternative` → `instead: "<Component>"` (validated against the fixed set) plus an optional note. Lookalikes are then *derived*, not written. |
| T4 | **Lookalikes as data.** Overlapping descriptions cause wrong picks; naming the difference raised accuracy 8–38% (ToolScope, their R6). | "Distinct from Chip" is buried in Badge's `description`. | Derived from T3's `instead`. No new field. |
| T5 | **Other systems' names in keywords.** "badge" means a count in Atlassian and a status word in Polaris; aliases make lookup find the right entry (U6, D-244). | Button keywords include noise ("click", "interactive"). Badge lacks "lozenge"/"tag" disambiguation versus Chip. | Keywords become aliases plus need phrases, with a cap. Rename to `aliases` if that's all they hold. |
| T6 | **Description opens on one category noun:** "A <noun> that/with …" (Primer, Atlassian, U7). No rules or limits in it. | Button's description carries counts, ADR-024 and a11y claims. | Writing rule plus a lint on the first words. |
| T7 | **Variants say "when · what".** Prohibited combinations become data, not prose. | `purpose` mixes when, what and px sizes. "Requires the icon prop and an aria-label" is prose (already flagged in ADR-027). | `purpose` → `when` per option. Sizes and requirements go to `spec.json`. |
| T8 | **Content and overflow** (GOV.UK copy templates per state, Carbon overflow, U1/U3): the strongest missing section in their benchmark. | Badge's "long sentences" anti-pattern is really an overflow rule. Nothing about label copy for Button. | Optional `content` (copy rules, `long:` what wraps or truncates). Weigh against the 27-files-every-run cost. |
| T9 | **Known problems kept apart from rules** (GOV.UK "research on this component", their `Known:` strength, U4). | Badge's anti-pattern `reason` holds a known gap. | Probably not a field here: known gaps → GitHub issues or `spec.json`. Decide during the audit. |
| T10 | **Field-name grammar** (AIP-140): lists and maps plural, scalars singular, relations as predicates. | `when` (list, singular). `composedOf`/`containedBy`/`accepts` are fine predicates. | Apply as a rule across all renamed fields. |
| T11 | **Group by purpose, not atomic level** (Material 3: action · selection · input · navigation · containment · communication, their T4). | `category` atom/molecule/organism/layout doesn't help a picker. `type` partly does. | Replace or add a purpose `group`. Check what `/layout-generation` and `sense.js` read `category` for first. |
| T12 | **Not borrowed by them, nor here**: changelog (git + ADRs), props table (`spec.json`), live demos (Storybook), a separate Related section (derived from T3). | — | — |

Placement candidates (not picking info): `component.status` (lifecycle, ADR-010) and `figmaNodeId` (`spec.json` already has `figma`). Moving them affects `airtable-sync` and `sense.js`.

Caveat: their library has 195 entries read through a CLI shortlist. Here `/layout-generation` reads all 27 files whole, so every added field (T8 especially) costs 27× per run. Measure with the pattern-accuracy harness before and after.

## Direction (decided 2026-11-10): thin picking, rich composition

toolkit-research is weighted toward **picking**: 195 entries, many lookalikes, and an agent shortlisting 2–3 from a problem statement. That isn't this system's problem:

- **27 components with mostly distinct roles, read whole.** `/layout-generation` reads all 27 files on every run, so nothing is searched. When a layout starts from Figma, the instance on the canvas usually decides the component.
- **The hard part here is composition.** It's knowing the weight per container (a card's lead action is `neutral`, never `accent`), what nests where, and which tree a region uses. That knowledge lives in `usage.patterns` (64 trees), `composition`, `variants.purpose` and the anti-patterns about weight and containment.
- **Evidence:** nothing in `scripts/`, `apps/` or `.claude/commands/` reads `usage.keywords`. Only the schema mentions it. 106 anti-patterns across the set: sort them into wrong picks, composition rules and build rules during the audit.

What that does to the takeaways:

| | Change |
|---|---|
| T5 keywords | **Drop the field.** No reader; costs tokens 27× per run. |
| T2 when lines | Keep `when` short, or fold it into `description`. No new picking field. |
| T3/T4 `instead` / lookalikes | **Only for real lookalike groups:** Badge/Chip, Card/CardHorizontal/CardVertical, Button/ButtonArrow/TextLink. |
| T8 content / overflow | Not in usage. Long-text behaviour goes to `spec.json` if anywhere. |
| T11 group by purpose | Low priority. |
| T1 build rules → `spec.json` | Unchanged; still the biggest cleanup. |
| `patterns`, `composition`, weight rules | **The part to invest in.** Labels should make composition the main content of the file. |

The name still fits: "usage" covers *how to use* a component, not only *when to pick* it. **Change the audit's focus to match:** study how other systems document composition (GOV.UK patterns built from components, shadcn blocks, Atlassian/Polaris do and don't pairs on placement, ADR-013's pattern aggregate) more than their when-to-use pages, which toolkit-research has already covered.

## Audit (step 1, run 2026-11-10)

### What the 27 files hold and who reads it

112 KB in all. Bytes by section: `antiPatterns` 35.8 KB (32%), `patterns` 16.8 KB, `variants` 10.7 KB, `component` 10.0 KB, `composition` 7.7 KB, `when` 6.9 KB, `keywords` 2.1 KB.

| Field | Script readers | Agent readers | Verdict |
|---|---|---|---|
| `usage.keywords` | none | none | drop |
| `usage.when` | docs page | `/layout-generation` cites it | keep |
| `usage.patterns` | docs page, `validate-spec` | `/layout-generation`, `/component-scaffold`, `/extract-learnings` | keep; core |
| `usage.antiPatterns` | docs page | `/extract-learnings` writes it; `/layout-generation` reads it whole | split (below) |
| `variants.*.purpose` | docs page | `/layout-generation` reads it whole | relabel |
| `composition.accepts` / `containedBy` | `validate-metadata` (cross-refs); `validate-layout` checks **parts only**, not component-level | `/layout-generation` cites both | keep; enforce component-level too |
| `composition.parts` | `validate-metadata`, `validate-layout`, `generate-spec`, `validate-spec`, `generate-pattern-schema` | — | keep |
| `composition.composedOf` | `generate-pattern-schema` (drift check against JSX), docs page ("Built from") | — | drop: derived from JSX, which the drift check already scans |
| `layoutBehavior.widthBehavior` | none | `/layout-generation` cites it | keep, flatten |
| `layoutBehavior.displayType` | none | none | drop (derivable from the CSS) |
| `layoutBehavior.canNest` | none | none | keep as data, **and enforce it** (replaces 5 anti-patterns) |
| `component.category` | `generate-pattern-schema` (only `=== "layout"`) | — | replace with `type: "layout"` |
| `component.type` | `generate-pattern-schema` | — | keep |
| `component.status` | ~12 scripts (`lib`, `sense`, `airtable-sync`, `status`, …) | — | keep in place: moving it buys nothing in a 27-file read and breaks the Airtable push |
| `component.figmaNodeId` | `airtable-sync`, `sense-component` | `/add-component`, `/component-scaffold` | duplicates `spec.figma.sets[0].nodeId`. Move its readers to spec and drop it |

### The 106 anti-patterns, sorted

| Kind | Count | Examples | Home |
|---|---|---|---|
| **Wrong pick** (use X instead) | 35 | Badge#0 → Chip, Select#1 → Checkbox, Image#1 → Avatar | `usage.json` `notFor`, `instead` as a component id |
| **Composition** (placement, nesting, weight, grouping, mixing) | 30 | Button#1 (accent in a repeated item), Card#4/CH#1/CV#0 (mixing card types), Chip#3, CV parts rules | `usage.json` `rules`. 5 are "X inside X" (Accordion#1, Card#0, ScrollArea#2, Text#1, Stack#1) → derived from `nests: false` |
| **Call-site prop use** | 37 | open+defaultOpen, missing `label`, raw `style` on Box/Button/Card/Icon/TextLink, "·" in CardHorizontal strings | split: ~11 raw-style restatements → delete (`AGENTS.md` grammar + `validate-layout` style check already cover them); prop combinations and required props (~14) → `spec.json` `constraints`; content format (~12, e.g. CH#6/#7/#9, PB#1) → `spec.json` prop descriptions |
| **Implementation** (inside the component or for new components) | 4 | Accordion#4/#5, DropdownMenu#2, Button#5 | `spec.json` `decisions` / `accessibility.notes`; Button#5 is cross-component → `packages/components/AGENTS.md` |

**This changes T1.** Only 4 rules are true build rules. The ~26 call-site rules moving to `spec.json` are still read by the *layout writer*, who sets those props. `/layout-generation` doesn't read `spec.json` today, so moving them without changing that reader is a likely regression. The options are (a) `/layout-generation` also reads `spec.constraints` (small: most components have 0–2), or (b) they stay in usage as `rules`. The harness decides. Default (a): constraints are machine-checkable, prose rules aren't.

Duplicates to collapse: Box#4 = Stack#2; CV#0 ≈ CV#3 ≈ CH#1 ≈ CH#3 ≈ Card#4 (one "one card type per section" rule, owned by Card); patterns `certified-badge` (CH, CV) and `form-field-stack` (Select, TextField) each on one owner.

### How other systems document composition

| Source | What they do | What it means here |
|---|---|---|
| **Carbon** button usage | Weight as a per-region budget: "only one primary button" per screen, "not including the application header, modal dialog, or side panel"; "Do not use two high-emphasis buttons in a button group"; >3 actions → menu. | Same model as ADR-024, but stated as a **count per container**. Our version is prose in 3 places (Button `when`, `purpose`, antiPattern #1) plus a hard-coded check in `validate-layout`. |
| **Curtis, Figma slots for repeating items** | Slot rules live in spec data, not Figma: permitted items (`anyOf`), `minItems`/`maxItems`, slot named for its purpose (`items`, not `children`). Figma "preferred instances" are only a suggestion. | Our `accepts` has the `anyOf` but no counts. CV#9 ("only a single Action in Media") and CV#7 ("exactly one Title") are counts written as prose. |
| **GOV.UK patterns** | Patterns are **separate pages** for a task ("Check answers"). They name the components and give placement, order and copy rules, not a component tree. | Our `patterns` are per-component trees. Fine for 27 components read whole. No separate patterns file: a whole read gains nothing. |
| **shadcn registry** | Composition as data: `registryDependencies` (what an item is built from), `type: registry:block` for multi-component compositions, `categories`. | Confirms dropping `composedOf` here: the dependency list is derived from code, not written by hand. |
| **Atlassian primitives** | Box = container with tokens, Inline/Stack nested inside; no fixed card, Box is used to build card-like components; `use-primitives` ESLint rule suggests the primitive. | Our layout-primitive anti-patterns (Box#0, Inline#0, Stack#0) are the same lint, written as prose. Low value, keep as picks. |
| **Custom Elements Manifest** | `slots[]` with name + description; **no parent/child field**. | Our `accepts`/`containedBy`/`parts` go further than the main machine-readable standard. Keep the names. |
| **Storybook MCP manifest** | Props, usage snippets and types from static analysis. No composition fields found. | Nothing to borrow for composition. |

Takeaway: no system has a better composition *vocabulary* than `accepts`/`containedBy`/`parts`. What two of them add is **counts** (Carbon per region, Curtis per slot). Our counts are prose, apart from one hard-coded check.

### Proposed field map (old → new)

```
component.name                  → component.name
component.category              → (dropped; "layout" joins component.type)
component.type                  → component.type   (+ "layout")
component.status                → component.status (unchanged, ADR-010)
component.description           → component.description (rule: opens "A <noun> that …", no counts/ADRs/a11y claims — T6)
component.figmaNodeId           → (dropped; readers use spec.figma.sets[0].nodeId)
usage.keywords                  → (dropped)
usage.when                      → useWhen         (flattened; component-level situations only — per-variant lines move down a level; self-describing lines removed — T2)
usage.patterns                  → patterns        (flattened; unchanged shape; 2 duplicates deduped)
usage.antiPatterns (35 picks)   → notFor[]: { case, because, instead }   instead = fixed-set name | null + optional note
usage.antiPatterns (30 comp.)   → composition.rules[]: { case, because, do }
usage.antiPatterns (37 + 4)     → spec.json constraints / prop descriptions / decisions; AGENTS.md; or deleted as restatements
variants.<axis>.purpose         → variants.<axis>.useWhen   (per option; px sizes and requirements moved to spec — T7)
composition.composedOf          → (dropped; derived from JSX by generate-pattern-schema)
composition.accepts             → composition.accepts
composition.containedBy         → composition.containedBy
composition.parts               → composition.parts
composition.layoutBehavior.widthBehavior → composition.width
composition.layoutBehavior.displayType   → (dropped)
composition.layoutBehavior.canNest       → composition.nests  (enforced by validate-layout)
(new, candidate)                → composition.limits[]: { if: {prop: value}, max, per: "region"|"repeated"|"parent" }
```

`limits` would turn the hard-coded accent check in `validate-layout` into data (`Button: {if:{variant:"accent"}, max:1, per:"region"}` and `max:0, per:"repeated"`) and would carry CV#7/#9's counts. Add it only if the migration can drive `validate-layout` from it. Otherwise it's another field the agent reads but nothing enforces.

Expected effect: drop keywords, `composedOf`, `displayType`, `category`, `figmaNodeId`, about 40 relocated or deleted anti-patterns and the duplicates. That should cut roughly 30–35% of the bytes `/layout-generation` reads on every run, while composition (patterns, rules, accepts, counts) becomes most of the file. To be checked with the harness (step 6), not taken on trust.

### Decisions (2026-11-10)

1. **Call-site prop rules (~26):** move to `spec.json`; `/layout-generation` also reads `spec.constraints`. ✅
2. **`composition.limits`:** in this migration, and the hard-coded accent check in `validate-layout` is replaced by checking against the `limits` data. ✅
3. **`figmaNodeId`:** stays in `component` for now. The field map line above that drops it is void.
4. **`useWhen` at both levels.** ✅ Top-level `useWhen` (list) answers *when this component*. `variants.<axis>.useWhen` (map, option → string) answers *which option*. Top-level lines that name a variant move down a level, so the two never say the same thing. Option value: the situation first, then at most one clause on how it looks (to map Figma instances). Sizes in px, required props, and "never in X" go to `spec.json` / `composition.limits`.

   Button, worked example:

   ```jsonc
   "useWhen": [
     "An action happens in place and the URL doesn't change: a form submits, a dialog opens, a panel expands",
     "An icon-only control in a toolbar, table row or inline action group (set shape)"
   ],
   "variants": {
     "variant": {
       "options": ["accent", "neutral", "transparent", "danger"],
       "default": "neutral",
       "useWhen": {
         "accent": "The one action a decision region exists for: form or dialog footer, hero. Brand fill.",
         "neutral": "Everyday and supporting actions, and the lead action in a card or other repeated item. Bordered.",
         "transparent": "Low-weight actions inline with content ('Show more', Close) and a card's second action. No fill at rest.",
         "danger": "Destructive or irreversible actions (delete, deactivate), next to a neutral Cancel. Error fill."
       }
     },
     "size": {
       "options": ["sm", "md", "lg"],
       "default": "md",
       "useWhen": {
         "sm": "Dense UI: table rows, inline actions, toolbars.",
         "md": "Most page contexts.",
         "lg": "Hero sections, prominent calls to action, touch-first flows."
       }
     },
     "shape": {
       "options": ["square", "round"],
       "default": null,
       "useWhen": {
         "square": "Icon-only actions in toolbars, table rows and inline groups. Small rounded corners.",
         "round": "Floating actions or controls next to an avatar. Circular."
       }
     }
   }
   ```

   Moved out: "never inside a repeated item" → `composition.limits` (`{if:{variant:"accent"}, max:0, per:"repeated"}`, `max:1, per:"region"`); px heights and the transparent inset note (ADR-024 amendment) → `spec.json`; "requires icon and aria-label" is already `spec.constraints` `icon-only-needs-icon-and-name`.

### Where each anti-pattern lands (Button worked example)

```jsonc
// usage.json — wrong picks: top level, instead = fixed-set name or null
"notFor": [
  { "case": "Navigation that changes the URL",
    "because": "Renders <button>; a URL change needs an <a> for semantics and middle-click/open-in-tab.",
    "instead": "TextLink" }
],
// usage.json — composition: prose rules + countable limits
"composition": {
  "accepts": [], "containedBy": ["Box", "Stack", "Inline", "Card"],
  "width": "hug", "nests": false,
  "limits": [
    { "if": { "variant": "accent" }, "max": 1, "per": "region",
      "because": "Variants are absolute weights; the region's one decision gets accent (ADR-024)." },
    { "if": { "variant": "accent" }, "max": 0, "per": "repeated",
      "because": "N cards would render N competing primaries." }
  ],
  "rules": [
    { "case": "accent or neutral on a destructive action",
      "because": "Weight alone doesn't signal consequence; delete styled as the main CTA trains users to click it.",
      "do": "variant=danger next to a neutral Cancel (pattern destructive-confirm)." },
    { "case": "transparent or neutral icon button over an image or video",
      "because": "No opaque background, so glyph contrast depends on the pixels underneath.",
      "do": "Reuse the parent's media-overlay parts (CardVertical Favorite/Menu: icon.on-media + halo)." }
  ]
}
```

- Button#4 (raw `style`) → deleted: `validate-layout` style check + `AGENTS.md` grammar.
- Button#5 (new native-button wrappers default `type="button"`) → `packages/components/AGENTS.md`.
- Prop combinations from other components → `spec.json` `constraints`, e.g. Accordion#6: `{ "id": "controlled-xor-uncontrolled", "if": { "open": "*" }, "forbid": { "defaultOpen": ["*"] }, "reason": "…", "enforcedBy": [] }`. Empty `enforcedBy` = backlog item in `spec:validate`.
- "X inside X" (Card#0 etc.) → `composition.nests: false`, no prose.
- `notFor.instead` validated against the fixed set by `validate-metadata`; `null` when the alternative is outside the library (native radio, spinner). Note: Button#3's current alternative ("anchor tag styled to match") predates TextLink. The migration should re-check each `instead` against the current set.
- `/extract-learnings` routing must learn the three destinations (`notFor`, `composition.rules`/`limits`, `spec.constraints`).

## Rename blast radius (measured 2026-11-10)

27 data files plus about 50 live references outside `.claude/handoff/archive/`:

- **Schema and gate:** `component.schema.json`, `scripts/validate-metadata.js` and the `metadata:validate` npm script; `components-check.yml` and one other workflow.
- **Scripts:** `lib.js`, `sense.js`, `sense-component.js`, `status.js`, `spec-bundle.js`, `generate-spec.js`, `validate-spec.js`, `validate-layout.js`, `generate-pattern-schema.js`, `component-risk.js`.
- **Docs site:** `apps/docs/src/pages/components/[name]/[...tab].astro`.
- **Agent context:** `AGENTS.md`, `packages/components/AGENTS.md`, `packages/tokens/AGENTS.md`, and 7 commands in `.claude/commands/` (`extract-learnings`, `layout-generation`, …).
- **Docs:** ADR-001, -013, -026, -027, -029; `docs/02`, `06`, `07`, `08` (glossary), `10`, `11`, `12`; `docs/case-study-source/*`. Docs-check coupling: touched sources need same-PR doc touches.
- **Leave as is:** `.claude/handoff/archive/*`, `scripts/harness-ablation/results/*` and `scripts/pattern-accuracy-harness` recorded results. They are history, and the measured prompts used the old name.

## Steps when unblocked

1. ~~Audit other design systems → proposed field map (old → new) recorded in this handoff.~~ Done 2026-11-10 (see "Audit"). Open: the three decisions listed there.
2. Amend ADR-001 (dated amendment: rename + relabel + rationale), and note it in ADR-027.
3. `git mv` the 27 files; migrate field names with a one-off script; rename the schema/validator if the labels change (`component.usage.schema.json`?, `usage:validate`).
4. Update the live references above; leave history as is.
5. Gate: full `AGENTS.md` gate set + `npm run lint` + `npm run claudemd:check` + `npm run docs:check` + `npm run sense`.
6. Re-run the pattern-accuracy harness to check that `/layout-generation` accuracy hasn't regressed with the new labels.
