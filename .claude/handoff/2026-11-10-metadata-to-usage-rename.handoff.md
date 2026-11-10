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

## Rename blast radius (measured 2026-11-10)

27 data files plus about 50 live references outside `.claude/handoff/archive/`:

- **Schema and gate:** `component.schema.json`, `scripts/validate-metadata.js` and the `metadata:validate` npm script; `components-check.yml` and one other workflow.
- **Scripts:** `lib.js`, `sense.js`, `sense-component.js`, `status.js`, `spec-bundle.js`, `generate-spec.js`, `validate-spec.js`, `validate-layout.js`, `generate-pattern-schema.js`, `component-risk.js`.
- **Docs site:** `apps/docs/src/pages/components/[name]/[...tab].astro`.
- **Agent context:** `AGENTS.md`, `packages/components/AGENTS.md`, `packages/tokens/AGENTS.md`, and 7 commands in `.claude/commands/` (`extract-learnings`, `layout-generation`, …).
- **Docs:** ADR-001, -013, -026, -027, -029; `docs/02`, `06`, `07`, `08` (glossary), `10`, `11`, `12`; `docs/case-study-source/*`. Docs-check coupling: touched sources need same-PR doc touches.
- **Leave as is:** `.claude/handoff/archive/*`, `scripts/harness-ablation/results/*` and `scripts/pattern-accuracy-harness` recorded results. They are history, and the measured prompts used the old name.

## Steps when unblocked

1. Audit other design systems → proposed field map (old → new) recorded in this handoff.
2. Amend ADR-001 (dated amendment: rename + relabel + rationale), and note it in ADR-027.
3. `git mv` the 27 files; migrate field names with a one-off script; rename the schema/validator if the labels change (`component.usage.schema.json`?, `usage:validate`).
4. Update the live references above; leave history as is.
5. Gate: full `AGENTS.md` gate set + `npm run lint` + `npm run claudemd:check` + `npm run docs:check` + `npm run sense`.
6. Re-run the pattern-accuracy harness to check that `/layout-generation` accuracy hasn't regressed with the new labels.
