---
status: active
created: 2026-11-10
completed:
---

# Rename `<Name>.metadata.json` → `<Name>.usage.json`, after a schema and labelling review

**Goal.** Rename the 27 per-component `metadata.json` files to `usage.json`. The rename is blocked on a review of the schema's structure and field labels (`packages/components/component.schema.json`), which will start with an audit of how other design systems structure and label the same information. Do the rename and the relabel together, in one breaking change and one ADR amendment, not two migrations.

## Progress

Tick an item when it's done, and add the date and commit or PR. Details live in the linked sections. The second relabel and option D land together, in one migration and one ADR-001 amendment.

**Rename** (see "Steps when unblocked")
- [x] Step 1: audit other systems, field map old → new (2026-11-10)
- [x] Step 2: ADR-001 amendment, note in ADR-027 (2026-11-10, `deb5b6d`)
- [x] Step 3: `git mv` the 27 files, migrate fields, `component.usage.schema.json` + `usage:validate` (2026-11-10, `9c7e057`)
- [x] Step 4: live references updated: scripts, docs site, CI, agent context, docs (2026-11-10, `9c7e057`)
- [x] Step 5: full gate set + `lint` + `claudemd:check` + `docs:check` + `sense`, all pass, run locally on `main` (2026-11-10, at `117271b`). The rename went straight to `main` and `components-check.yml` runs on PRs only, so this local run is the record
- [x] ~~Step 6: re-run the pattern-accuracy harness~~ Not possible: frozen at `044d28f`

**Rename follow-ups** (step 7)
- [ ] Editorial pass: variant `useWhen` situation-first, descriptions open on a category noun, prop-usage lines out of top-level `useWhen`, px sizes to spec (26 components)
- [ ] GitHub issue: narrow `BadgeProps` to omit `onClick`/`onKeyDown`, and `IconProps` to omit `color`/`fill`/`stroke`/`role`/`aria-*` (Icon's old rule text noted only `children` is omitted)
- [ ] The 9 documented-only constraints enforced by `spec:validate`

**Second relabel** (see "Follow-up: second relabel")
- [x] Naming decisions recorded (2026-11-10, `c5db130`)
- [x] Content sweep of the `rules` (2026-11-10, see "Content sweep result")
- [x] Schema + `validate-usage.js`: `composition.donts` `{case, because, instead}`, `composition.patterns` `{name, useWhen, tree?}` (tree transitional), `notFor.instead` description, pattern-name uniqueness check (2026-11-10)
- [x] Migrate the 27 files (key moves by script) and write each kept pattern's `useWhen` situation-first (2026-11-10)
- [x] Readers: `validate-spec.js`, docs site component page, `/layout-generation`, `/extract-learnings`, `/component-scaffold`, `packages/components/AGENTS.md`, docs 02/06/10/11/12 (2026-11-10)
- [x] ADR-001 amendment (relabel + D): second 2026-11-10 amendment

**Pattern stories** (see "Follow-up: pattern trees vs stories")
- [x] Choose A, B, C or D: D (2026-11-10)
- [x] Triage the 62 patterns: 23 kept + new `page-landmarks`, 39 removed, approved and applied 2026-11-10 (see "Pattern triage"; Card `content-card` was missing from the table and merged into Button `card-actions`)
- [x] Figma: deleted the 6 CardVertical state frames (`2871:8064` default-card, `2871:8090` in-progress-card, `2871:8118` completed-card, `2871:8207` placeholder-favorite, `2871:8234` favorite-progress, `2871:8277` title-only) from "CardVertical examples" (`2871:8034`) via figma-cli, 2026-11-10. Read-back: Preset row = favorite-saved, overflow-menu; Parts row = custom-meta, instructor-row, grouped-meta. The component set (`52:4270`) is the variant matrix; example frames are for compositions only
- [ ] Figma example sections for the other owners, after their stories exist: a `<Name> examples` section per component with one instance-only frame per pattern id (Accordion, Breadcrumb, Button ×4, CardHorizontal ×3, Checkbox, Chip, Divider, TextField ×2, TextLink, ScrollArea `scrollable-list`). `page-landmarks`, `card-carousel` and `native-scroll-carousel` go on the Layout Examples page (ADR-023 2026-10-06). Today only CardVertical has a section, so designers can't see the other compositions in Figma
- [ ] Gate for frames ↔ patterns: a committed snapshot of example-frame names per component (captured interactively via figma-cli, like `figma-variables.json`; Figma reads stay out of CI), which `usage:validate` compares against `composition.patterns` names
- [x] `/layout-generation`'s "Recurring patterns": the show-more and carousel recipes shrink to pointers at `CourseModuleList` / `CardCarousel`, keeping only the showcase classes (`carousel-outer`, `hide-on-mobile`); the other subsections stay (2026-11-10)
- [x] `<Name>.patterns.stories.tsx` for the 12 owners (24 exports); `usage:validate` fails when exports ≠ pattern names (negative-tested); `anatomy:test` and `AnatomyOverlay` read the patterns file; the axe sweep's glob already covers it (149 story tests pass); screenshots stay `--default` only, so no new baselines. CardVertical's 5 composition stories moved out of `CardVertical.stories.tsx` (`Composed` → `CustomMeta`); `src/stories/` CourseModuleList, Carousel, SettingsForm, FooterHighlights deleted; docs page links each pattern to its story (2026-11-10)
- [x] Drop `patterns[].tree` from schema, example and files (2026-11-10). Also fixed docs 04 (`rules` → `donts`) and 08 (removed `composedOf` drift mention)
- [ ] Check method chosen and run: first real `/layout-generation` runs, or a pre-registered layout eval with and without patterns (ADR-029)

**Close-out**
- [ ] Gate passes on the final migration
- [ ] Handoff `status: done`, `npm run handoff:tidy`

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
| **Call-site prop use** | 37 | open+defaultOpen, missing `label`, raw `style` on Box/Button/Card/Icon/TextLink, "·" in CardHorizontal strings | split: ~11 raw-style restatements → delete (`AGENTS.md` grammar + `validate-layout` style check already cover them); prop combinations and required props (~14) → `spec.json` `constraints`; content format (~12, e.g. CH#6/#7/#9, PB#1) → `spec.json` prop descriptions *(as built: documented-only constraints, see step 3)* |
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
2. ~~Amend ADR-001 (dated amendment: rename + relabel + rationale), and note it in ADR-027.~~ Done 2026-11-10. The amendments describe the target state and land before the migration; steps 3–6 make them true.
3. ~~`git mv` the 27 files; migrate field names with a one-off script; rename the schema/validator if the labels change (`component.usage.schema.json`?, `usage:validate`).~~ Done 2026-11-10, committed together with step 4.
   - The schema is `component.usage.schema.json`, the example is `component.usage.example.json` (now a copy of Button), and the check is `scripts/validate-usage.js` / `npm run usage:validate`. Beyond the schema, the validator checks that `notFor.instead` is a component (null needs a `note`), that `limits.if` names a real axis and option, that `useWhen` keys are options, and that no `metadata.json` is left behind.
   - All 106 anti-patterns were placed, each by an explicit table entry in the one-off script (kept in the scratchpad, not committed): notFor 34 · rules 27 · limits 1 (two Button limits) · spec constraints 10 · spec decisions 6 · a11y note 1 · `packages/components/AGENTS.md` 1 · deleted 26. The deletions break down as: inline-style restatements 9, raw container div 1, `nests: false` 4, `containedBy` or part rules already exclude it 4, duplicates of Card's one-card-type rule 4, `label`/`href` already required by type 4.
   - Patterns deduped: `certified-badge` stays on CardHorizontal, `form-field-stack` on TextField.
   - Content changed: Button's `useWhen` and variant text (the worked example); CardVertical `size` and DropdownMenu `listRole` lines moved to option level. Badge's "not type-enforced" gap was dropped from `because`. Candidate GitHub issue: narrow BadgeProps to omit onClick/onKeyDown.
   - Bytes: 112,495 → 82,154 (−27%), plus about 3 KB of spec constraints that `/layout-generation` will also read, so about −24% net. That's under the 30–35% estimate, because the editorial pass hasn't run yet.
   - **Editorial pass still to do** (not mechanical; can follow the rename): rewrite variant `useWhen` values situation first (T7) and descriptions to open on a category noun (T6) in the other 26 components; take prop-usage lines out of top-level `useWhen` (e.g. CardVertical's progress/Completed/action lines); move px sizes from variant text to spec.
4. ~~Update the live references above; leave history as is.~~ Done 2026-11-10.
   - Scripts: `readComponentMetadata` → `readComponentUsage` (`lib.js`) and every caller; `spec-bundle` key `metadata` → `usage`; `sense-component` snapshot key `metadata` → `usage`; `generate-pattern-schema` buckets on `type: "layout"` and its `composedOf` drift check is gone (drift still 0); `generate-spec` lost its dead strip-sections block.
   - `validate-layout`: `checkButtonEmphasis` replaced by `checkComposition`, driven by each `usage.json`'s `limits` and `nests`. Same errors as before for the accent rule (tested on a fixture), plus self-nesting. Showcase pages: no new violations.
   - Docs site component page: Not for / Composition (limits + rules) / Prop rules sections; "Built from" derived from spec anatomy `builtOn`.
   - CI: `components-check.yml` runs `usage:validate`. The job name "Typecheck, build, validate metadata" was kept on purpose, in case branch protection requires it by name. `docs-build.yml` path filter, `.claude/settings.json` allow-list.
   - Agent context: root and `packages/components` `AGENTS.md`, `CLAUDE.md` (2 table cells), commands (`extract-learnings` routing rewritten, `component-scaffold`, `layout-generation` now reads `spec.constraints`, `add-component`, `review-component`, `token-deprecation-pass`, `figma-cli`), the `run-storybook` skill.
   - Docs: 00, 02, 04, 05, 06, 07, 08 (glossary entry renamed "Component usage file"), 10 (sections rewritten), 11, 12, each with a dated frontmatter note.
   - **Left as history:** ADRs other than 001/027, `docs/case-study-source/*`, both harnesses and their tasks (frozen, see step 6), archived handoffs, the other active handoffs.
5. Gate: full `AGENTS.md` gate set + `npm run lint` + `npm run claudemd:check` + `npm run docs:check` + `npm run sense`.
6. ~~Re-run the pattern-accuracy harness~~ **Not possible:** the harness is frozen at `044d28f` and `harness:run` exits on HEAD (ADR-029 amendment 2026-10-12, `scripts/frozen-eval.js`). ADR-001's amendment now says so. Options: a new pre-registered eval on the current schema (ADR-029 says a new question gets its own eval), or treat the first real `/layout-generation` run as the check.
7. Open follow-ups: the editorial pass (step 3), the Badge type-enforcement issue (step 3), the 9 documented-only constraints now on the `spec:validate` backlog, the second relabel (below, decided, not applied), and pattern trees vs stories (below, leaning D).

## Follow-up: second relabel (decided 2026-11-10, not applied)

A review of `Button.usage.json` after the rename found the composition labels still unclear. Decisions:

| Change | Why |
|---|---|
| `composition.rules` → `composition.donts` | All 28 entries are don't→do pairs (Atlassian/Primer do/don't), not conditions. "rules" read like another `useWhen`. |
| `donts[].do` → `donts[].instead` | Same shape as `notFor`: `{case, because, instead}`, one shape to learn. |
| `notFor[].instead` stays | Rejected renaming it to `use`: readers infer a component from the value and context, and `validate-usage.js` already rejects prose there. Add to the schema description: "a fixed-set component name, not prose". In `donts`, `instead` is prose. |
| `patterns[].description` → `patterns[].useWhen` | Most of the 62 descriptions restate the tree ("A Box wrapping a Stack…"). A situation-first line is what matches a pattern to a brief (T2). Rewriting them is editorial, not mechanical. |
| `patterns` → `composition.patterns` | Top level answers *pick this component?* (`useWhen`, `notFor`, `variants`), `composition` answers *how to assemble it*; patterns sit next to `donts`. **Readability only:** no script gains, and no measurable agent gain (the harness is frozen). Path changes: `validate-spec.js` (pattern names for `anatomyExamples`), `validate-usage.js`, schema, docs page, commands. |
| `patterns[].name` stays | It's an id, not prose: it ties the usage pattern, the Storybook story (PascalCase), the Figma example frame (ADR-023) and `spec.anatomyExamples[].pattern`. Rejected `case` (prose elsewhere) and `validPatterns` (claims a check nothing performs; `donts` already supplies the contrast). `id` would be acceptable if `name` ever confuses. |
| `patterns[].tree` | Name is fine (React's "component tree"; `anatomy`/`example`/`composition` collide). Under option D below, the field is dropped. |

Open, content not labels: Button's two current `rules` look misfiled. The danger one repeats `variants.variant.useWhen.danger` (move its *because* there, drop the rule); the media-overlay one is a wrong pick (`notFor`, `instead: "CardVertical"`, parts in `note`). Sweep the other 27 rules the same way: the Chip group name, ProgressBar `label` and Icon accessible name are accessibility contract (`spec.accessibility`); DropdownMenu `position:relative` and ScrollArea `max-content` are spec constraints.

Do this together with option D (if chosen) in one migration and one ADR-001 amendment.

### Content sweep result (2026-11-10)

There were 26 entries, not 28. 7 changed, 19 stayed:

- **To `notFor`:** Button's media-overlay rule (`instead: "CardVertical"`), Breadcrumb on root pages (`null`, omit it), Divider as a container border (`null`, use the container's border).
- **Deleted:** Button's danger rule (`variants.variant.useWhen.danger` already says it), Divider margin and Image raw `<img>` (layout grammar restatements), Image + Avatar (duplicates Image's `notFor` → Avatar).
- **Trimmed:** CardVertical Media (the implementor sentence moved to a `spec.decisions` entry), CardVertical completion (case narrowed to Badge, since the no-completed-prop part was already a spec decision), Icon color (dropped the type-gap prose; the IconProps narrowing goes with the Badge issue).
- **Reversed from the plan: a11y entries stay as don'ts.** Chip group name, ProgressBar `label`, Icon accessible name and Heading `as`/`size` are caller obligations, and `/layout-generation` reads only `spec.constraints`. `spec.accessibility` is the component's own contract (builder and reviewer readers), so where the two overlap they're two sides of one fact, not duplicates.
- **Stayed, issue filed:** DropdownMenu `position:relative` and ScrollArea `max-content` don't fit `spec.constraints` (no prop trigger; the schema routes placement to usage), and the ScrollArea fix needs an inline style the grammar bans. #151 moves both fixes inside the components.

## Follow-up: pattern trees vs stories (leaning D, raised 2026-11-10)

**Problem.** Pattern `tree`s are hand-written shorthand that nothing parses: a tree can name a missing component, an invalid prop, or a nesting that `accepts`/`containedBy` forbid, and no gate notices. Other systems (Atlassian, Polaris, Primer, shadcn) show each example as name + short "when" line + live render + real code; none uses an abstract tree notation.

**What exists.** The pattern `name` is already a reference: `anatomy:test` and the docs `AnatomyOverlay` render the story named after it (`overflow-menu` → `OverflowMenu`). Only **5 of 62** patterns have a same-named story (measured 2026-11-10); `packages/components/AGENTS.md` requires one only for parts compositions.

**Rejected: replace `tree` with a link to the story.** `/layout-generation` reads all 27 usage files whole and would have to open story files (imports, meta, args, every other story) per pattern, which breaks the compact frozen-file read and costs far more tokens than a one-line tree. The name is already the link, so a URL field would duplicate a convention.

**Options:**

| | What | Cost | Gain |
|---|---|---|---|
| A. Leave as is | Trees stay hand-written and unchecked | None | None; drift stays possible |
| B. Parse trees | `validate-usage.js` parses each tree and checks component names, prop options, `accepts`/`containedBy` | A small grammar plus parser | Trees become checked data; no new stories |
| C. Stories as source, trees generated | Every pattern gets a same-named story; a script derives `tree` from its JSX (the approach `generate-pattern-schema.js` already uses) into `usage.json`; a staleness gate fails on drift; `usage:validate` fails when a pattern has no story | ~57 stories plus a generator | One source; docs can embed a live render plus code like other systems; tree can't disagree with code |

| **D. Thin patterns, stories by name (leaning)** | `patterns` become `{ name, useWhen }`, with no `tree`. Each pattern is one export in a new `<Name>.patterns.stories.tsx` named in PascalCase. `/layout-generation` reads names + `useWhen` for all 27 components and opens a patterns story file **only for the patterns it picks**. `usage:validate` fails when the exports and the pattern names differ. | Stories for the ~57 patterns without one, or delete the patterns that don't earn one | No code in metadata; the code is real and type-checked; one source |

B and C overlap: C makes B unnecessary, and B is a cheaper first step if C never happens. D drops the tree that B and C maintain.

**Why D.** The trees have been in the schema since its first version (`30e769d`, 2026-06-14), but nothing ever measured whether `/layout-generation` uses them. Its other inputs already determine most trees: `accepts`/`containedBy`/`limits`/`nests` (enforced by `validate-layout`), the `useWhen` lines, `component-patterns.json` (measured 13 → 4 violations, ADR-013), its own "Recurring patterns" section, and Figma design context. What a pattern adds is a *named, approved* shape, and the name and `useWhen` carry that.

**Precedent.** Systems keep examples as code and point to them from metadata. Polaris docs frontmatter: `examples: [{fileName, title, description}]`. Atlassian: an `examples/` folder, one file per example. GOV.UK Frontend: named examples as data, which serve as docs, test fixtures and previews. Primer React: `<Name>.docs.json` lists story ids, and stories are split by purpose (`.stories.tsx`, `.features.stories.tsx`, `.examples.stories.tsx`), which is the model for the separate `.patterns.stories.tsx`. The Storybook MCP manifest generates agent-facing snippets from stories. Nobody hand-writes a tree in metadata. Recalled from their public repos, not re-checked 2026-11-10. Code Connect doesn't fit: it maps one Figma component to its code, not compositions, and it's Enterprise/Org-only (ADR-002).

**Why a separate `.patterns.stories.tsx`.** `<Name>.stories.tsx` holds states and options (axe sweep, screenshots). Compositions go in their own file so the layout agent opens a small file, and exports ↔ pattern names can be compared exactly. `anatomy:test` and `AnatomyOverlay` look stories up by name, so they need to read the second file too. Check that the screenshot and a11y scripts pick up the new glob.

**Decision (2026-11-10): D.**

### Pattern triage (approved and applied 2026-11-10)

Test for keeping a pattern: it records a decision the writer can't get from `accepts`/`containedBy`/`limits`/`useWhen` (weight, landmarks, parts use, a11y wiring, placement), and a consumer builds it. Delete: a preset's prop combination (that's a state story), a component's internal markup, trivial "Heading + Text in a Stack" shapes, duplicates, and trees that break the grammar or contradict a `notFor`.

**Keep: 24 patterns (23 existing + new `page-landmarks`; 5 already have stories, 19 need one)**

| Owner | Pattern | Story source |
|---|---|---|
| Accordion | `course-module-list` (was `course-curriculum`, takes in the show-more recipe) | move `stories/CourseModuleList.stories.tsx` |
| Box | `page-landmarks` (merges `page-main`, `page-header`, `page-section`, `page-footer`, `container`, AppHeader `full-page-layout`) | new; AppHeader goes directly under main, per `/layout-generation` (the old AppHeader tree wrapped main in a Stack, which contradicted it) |
| Breadcrumb | `page-header-trail` | new |
| Button | `form-actions`, `destructive-confirm`, `card-actions`, `hero-cta` (takes in Heading `hero-block`) | new; `card-actions` and `form-actions` are cited by `limits` |
| CardHorizontal | `started-courses-list`, `footer-recommendations`, `certified-badge` | `footer-recommendations` from `stories/FooterHighlights.stories.tsx`; `certified-badge` needs a story-local CSS Module |
| CardVertical | `favorite-saved`, `overflow-menu`, `custom-meta`, `instructor-row`, `grouped-meta` (have stories), `card-carousel` (was `discover-carousel`, takes in ButtonArrow `carousel-paginator`, `saved-courses-carousel` and the carousel recipe) | move `stories/Carousel.stories.tsx` |
| Checkbox | `notification-preferences` (takes in Card `preferences-section`) | new |
| Chip | `filter-bar` (takes in `filter-bar-single`; same tree, single-select is page logic, said in `useWhen`) | new |
| Divider | `section-break` | new |
| ScrollArea | `native-scroll-carousel`, `scrollable-list` | new; both trees use inline styles (#151; `scrollable-list` → a height prop or Box `maxHeight`) |
| TextField | `form-field-stack` (takes in Card `form-section`, Stack `form-field-group`), `inline-name-row` | `form-field-stack` from `stories/SettingsForm.stories.tsx`; `inline-name-row` rewritten with Box `grow` (the tree had a banned `style={{flex:1}}`) |
| TextLink | `author-credit` | new |

**Delete: 38**

- **Preset prop combinations, already state stories** (6): CardVertical `default-card`, `in-progress-card`, `completed-card`, `placeholder-favorite`, `favorite-progress`, `title-only`. Check the CardVertical Figma examples section for frames named after them.
- **A component's internal markup, not a consumer composition** (5): Avatar `nav-user-chip` (AppHeader), DropdownMenu `user-context-menu` and `custom-select` (AppHeader, Select), Image `card-thumbnail` and ProgressBar `course-progress` (CardHorizontal). DropdownMenu gets a consumer pattern once #151 lands.
- **Merged into a kept pattern** (14): Card `content-card` → Button `card-actions` (missed in the first draft, found by the migration script); Box `page-main`, `page-header`, `page-section`, `page-footer`, `container`; AppHeader `full-page-layout`; Heading `hero-block`; ButtonArrow `carousel-paginator`; CardVertical `saved-courses-carousel`; Card `preferences-section`, `form-section`; Stack `form-field-group`; Chip `filter-bar-single`.
- **Trivial, no decision recorded** (11): Accordion `faq-list`, Avatar `profile-header`, Badge `card-category-row` (`grouped-meta` covers badge-in-meta), Box `padded-surface`, Heading `titled-section`, Text `body-section`, Stack `content-block`, `card-body`, Icon `icon-label-pair` (`certified-badge` covers icon + text color), Image `hero-banner`, VideoFrame `video-preview-card`.
- **Contradict another rule** (3): Inline `form-actions-row` (accent first, the opposite of Button `form-actions`), `nav-bar` (rebuilds AppHeader), `tag-group` (Text as tags; Badge/Chip exist).

Renames (`course-curriculum`, `discover-carousel`) are not counted as deletions: 6 + 5 + 14 + 11 + 3 = 39 removed, 23 kept, 39 + 23 = 62; `page-landmarks` is new, so 24 patterns after.

14 components end up with no patterns (AppHeader, Avatar, Badge, ButtonArrow, Card, DropdownMenu, Heading, Icon, Image, Inline, ProgressBar, Stack, Text, VideoFrame). The schema doesn't require `patterns`.

**Recurring patterns in `/layout-generation`:** "Accordion with show-more" and "Card carousel with arrows" become `course-module-list` and `card-carousel`, so those two sections shrink to a pointer. The other subsections (fonts, column padding, inverted text, logos, AppHeader prop mapping) aren't compositions and stay.

**Existing `src/stories/` examples:** CourseModuleList, Carousel, SettingsForm and FooterHighlights move to their owners' `.patterns.stories.tsx`. CourseSlider and `layout/Layout.stories.tsx` (Landing Page) stay as page-level examples.

**Before committing to D:**
1. Triage the 62 patterns: write a story, or delete the pattern. Some are likely filler.
2. Decide what happens to `/layout-generation`'s "Recurring patterns" section (carousel, CourseModuleList). Those shapes probably become patterns with stories.
3. Check it: the harness is frozen, so either treat the first real `/layout-generation` runs as the check, or pre-register a new layout eval (ADR-029) with and without patterns.
