---
title: "ADR-001 — Component Metadata Schema for Machine-Readable Design System"
---
# ADR-001 — Component Metadata Schema for Machine-Readable Design System

**Date:** 2026-06-11
**Amended:** 2026-10-07
**Status:** `accepted`

## Context

The design system roadmap includes developer-triggered **agentic moments** — component scaffolding and layout generation among them — that read structured per-component context to do their work. (These were originally framed as "Phase 3 agentic loops"; the lite-agentic model later replaced always-on loops with a fixed set of developer-triggered moments, now Phase 7.) For those to work, agents need structured context about each component — not just its props and styles, but its purpose, constraints, anti-patterns, and relationships.

Without a shared schema defined upfront, each component would accumulate ad-hoc documentation in inconsistent shapes, making it impossible to build reliable tooling on top.

Two format options were evaluated:
- **Markdown spec files** — human-readable, low friction to write, used by hvpandya.com's approach
- **JSON metadata files** — machine-readable, validates against a schema, higher initial cost to author

Research by Indeed (Diana Wolosin, Into Design Systems 2025) benchmarked 8 MCP configurations across 1,056 prompts and found JSON reduced token cost by ~80% vs Markdown with equal or better accuracy. The reason: JSON is unambiguous — explicit keys, explicit values, no parsing required.

The schema structure was synthesised from three sources:
- **giorris.dev** — base structure (`usage`, `variants`, `aiHints.selectionCriteria`, `antiPatterns`)
- **hvpandya.com** — `anatomy` and `tokens` (explicit list of semantic token paths per component)
- **LLM Component Schema Standard** (petrilahdelma) — `generativeRules` for context-aware agent instructions

## Decision

All components in `packages/components/src/` will ship with a co-located `ComponentName.metadata.json` file validated against `packages/components/component.schema.json`.

The schema defines seven required top-level properties: `component`, `usage`, `variants`, `states`, `tokens`, `accessibility`, and `relationships`.

Key design choices:
- `status` (`draft` / `stable` / `deprecated`) lives inside `component.status`, not as a top-level section — status is a property of the component itself, not a parallel concern
- `usage` splits agent guidance into `keywords` (intent-matching terms) and `when` (scenario guidance)
- `usage.antiPatterns` requires all three fields (`scenario`, `reason`, `alternative`) — partial guidance is not useful to an agent
- `relationships` is the richest section for layout generation: `accepts` and `containedBy` enforce parent-child constraints; `neverPairWith` prevents illegal sibling combinations; `compositionPatterns` provides named, tested starting points; `layoutBehavior` describes fill/hug/fixed width and display type
- `tokens` categorises semantic paths by type (`color`, `spacing`, `typography`, `borderRadius`, `other`) — aligns with the three-layer token model and supports deprecation analysis
- `figmaNodeId` is an optional field inside `component` to support Figma ↔ component traceability
- `additionalProperties: false` is enforced throughout — schema drift is caught at validation time

### Deliberately excluded (do not re-add without a new ADR)

These came from the source inspirations, or from an early draft of the schema, and were intentionally left out. They are recorded so they are not reintroduced as oversights:

- **`anatomy`** — part-by-part structural documentation. Human-readable and doesn't reduce agent token cost; it lives in Storybook stories instead.
- **`aiHints` / `generativeRules`** — catch-all sections for agent instructions. Guidance is instead distributed where it carries structural meaning: `usage.keywords`, `usage.when`, `relationships.compositionPatterns`, and `relationships.layoutBehavior`. (`aiHints` was briefly present in the schema and removed in commit `30e769d`.)
- **`useCases`** — a flat scenario array. Replaced by the `usage.keywords` (intent-matching) + `usage.when` (scenario guidance) split, which serves both component selection and layout generation.

The schema must be defined and reviewed before any component is built so that the first component (Button) establishes the pattern correctly.

## Consequences

- Every new component requires a metadata file — this adds authoring overhead per component
- The schema becomes a contract: changes to it are breaking for any tooling built on top (MCP server, Airtable sync, Storybook metadata panel)
- Agents consuming this system get reliable, token-efficient context without needing to parse implementation code
- The `tokens` section creates a living map of which semantic tokens are actually in use — useful for deprecation analysis
- The expanded `relationships` section is the primary input for the layout generation agentic moment — `accepts`/`containedBy` are structural rules an agent must not violate
- Excluding `anatomy` reduces authoring overhead without losing machine-readable value; human-readable anatomy can live in Storybook stories instead
- Schema validation can be added to CI as a lightweight check alongside the token build

## Amendment (2026-06-17) — Named variant axes, unified taxonomy, enforced validation

A foundation review before Phase 5b found the schema and the committed metadata had drifted: 7 of 11 metadata files failed the schema, and the schema could not express a component with more than one variant axis (Button had bolted on illegal top-level `sizes`/`shapes` keys). Three refinements:

1. **`variants` is now a map of named axes.** It changed from a single `{ options, default, purpose }` object to an object keyed by axis name (`variant`, `size`, `shape`, …), each axis holding `{ options, default, purpose }`. A component with one visual axis uses a single key named `variant`; a component with no visual variation declares `variant` with one `default` option; `default` may be `null` for an axis that is off unless set (e.g. Button `shape` for icon-only mode). Rationale: Button (variant + size + shape), TextField (icon + size + shape), and every Phase 5b/5c component (Avatar `size`, Chip `state`, PaginationArrows `direction` + `state`) have multiple independent axes. The old single-axis shape could not represent them honestly.

2. **One taxonomy, enforced.** `component.category` ∈ `atom | molecule | organism | layout` and `component.type` ∈ `interactive | display | container | input` are applied consistently across all files. Earlier files used a parallel ad-hoc vocabulary (`primitive`, `typography`, `media`, `action`) that validated against nothing. Mapping: layout primitives → `layout`/`container`; Text/Heading/Icon → `atom`/`display`; Button → `atom`/`interactive`; form components and Card keep `molecule` with `input`/`container`.

3. **Validation is enforced in CI** — realising the final consequence above. `scripts/validate-metadata.js` (ajv, draft 2020-12) validates every metadata file plus the example against the schema and checks that `component.name` matches its folder; `.github/workflows/components-check.yml` runs it alongside typecheck and build on every PR touching components. Schema/metadata drift can no longer merge silently.

`accessibility.notes` (optional string) was also added — several components carried guidance the `role`/`ariaAttributes`/`keyboardInteractions` fields could not hold.

The contract warning above still holds: this was a breaking change to the `variants` shape, so all 11 metadata files plus `component.metadata.example.json` and the component-scaffold command prompt were migrated in the same change.

## Amendment (2026-07-23) — `relationships` renamed to `composition` (recorded retroactively)

Commit `d89782a` (2026-06-24) reshaped the relationship section without a matching amendment here; this records it so the ADR prose matches the live schema:

1. **`relationships` → `composition`.** The top-level section is named `composition`; the seven required properties are `component`, `usage`, `variants`, `states`, `tokens`, `accessibility`, `composition`.
2. **`compositionPatterns` moved to `usage.patterns`.** Named, proven compositions live under `usage` alongside `keywords`/`when`/`antiPatterns` — they are guidance for choosing and combining the component, not structural constraints.
3. **`neverPairWith` dropped, absorbed into `usage.antiPatterns`.** Five files had populated it (the three Card variants' mutual-exclusion rules, Chip↔Button, Image↔Avatar). Those constraints survive as anti-patterns — e.g. Card's "Using Card as a sibling of CardVertical or CardHorizontal in the same layout group" — where each carries a `reason` and `alternative` instead of a bare name list; self-nesting rules moved to `layoutBehavior.canNest`. Per the "deliberately excluded" convention above, do not re-add it without a new ADR.

`composedOf` (internal library dependencies) has been part of the section since the original schema. References to `relationships` elsewhere in this ADR are preserved as written; read them as `composition`.

## Amendment (2026-10-07) — `tokens` lists what the component itself reads, enforced

`tokens` was hand-written and never checked against the code. Issue #117 found 11 of 27 components out of step with their CSS Modules. Seven left out tokens their CSS reads (AppHeader missed nine). Others listed tokens their CSS never reads, either stale (Text listed `font.weight.medium`; its CSS uses `bold`) or applied by a child component (CardVertical listed `color.text.subtle`, which reaches it through `<Text color="subtle">`).

**Decision.** `tokens.*` lists exactly the tokens the component itself reads: `var(--ds-*)` in its CSS Module or its `index.tsx`. A TSX template prefix counts, so Avatar's `` var(--ds-size-avatar-${size}) `` covers `size.avatar.*`. A token applied by a child component (a Text color, a Stack gap, a Heading size) belongs to the child's metadata, not the parent's.

`scripts/validate-metadata.js` enforces both directions. A token read by the CSS Module but not listed fails, and so does a listed token that neither file reads.

**Why this rule:** it is the only one a script can check. It also keeps the token map complete for deprecation analysis: every token a component renders is read by some component's CSS, so it is listed in that component's metadata. The route a child token takes is recorded where it is useful to a builder, in the component spec's `anatomy[].builtOnProps` (ADR-027).

**Alternative considered:** waiting for ADR-027 to move `tokens` into the spec, where `spec:validate` already enforces this for the two pilot components. That would leave 25 components unchecked until the pilot is decided. If ADR-027 is accepted, the check moves with the section.

