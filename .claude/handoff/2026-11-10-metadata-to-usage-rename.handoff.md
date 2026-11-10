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
