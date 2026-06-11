# ADR-001 — Component Metadata Schema for Machine-Readable Design System

**Date:** 2026-06-11
**Status:** `accepted`

## Context

The design system roadmap includes Phase 3 agentic loops (component scaffolding, token drift detection, auto-documentation). For those to work, agents need structured context about each component — not just its props and styles, but its purpose, constraints, anti-patterns, and relationships.

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

The schema defines ten top-level sections: `component`, `status`, `usage`, `anatomy`, `tokens`, `variants`, `states`, `accessibility`, `relationships`, and `aiHints`.

Key design choices:
- `usage.antiPatterns` requires all three fields (`scenario`, `reason`, `alternative`) — partial guidance is not useful to an agent
- `tokens` uses semantic paths (e.g. `color.background.button.$root`) not primitives — aligns with the three-layer token model
- `figmaNodeId` is included as an optional field to support Figma ↔ component traceability in Phase 3
- `status` (`draft` / `stable` / `deprecated`) enables Airtable governance and drift detection
- `additionalProperties: false` is enforced throughout — schema drift is caught at validation time

The schema must be defined and reviewed before any component is built so that the first component (Button) establishes the pattern correctly.

## Consequences

- Every new component requires a metadata file — this adds authoring overhead per component
- The schema becomes a contract: changes to it are breaking for any tooling built on top (MCP server, Airtable sync, Storybook metadata panel)
- Agents consuming this system get reliable, token-efficient context without needing to parse implementation code
- The `tokens` section creates a living map of which semantic tokens are actually in use — useful for deprecation analysis
- Schema validation can be added to CI as a lightweight check alongside the token build
