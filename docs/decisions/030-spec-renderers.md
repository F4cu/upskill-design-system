---
title: "ADR-030 — Spec renderers: generated component pages and a Figma parity check"
---
# ADR-030 — Spec renderers: generated component pages and a Figma parity check

**Date:** 2026-11-10
**Status:** `accepted`

## Context

ADR-027 split each component's contract into `<Name>.metadata.json` (how to use it) and `<Name>.spec.json` (how to build it). Both files gate code review and steer the agents, but no human-facing page shows them. The docs site (ADR-022) publishes only the reference pages and ADRs, and Storybook Autodocs covers the API, not usage guidance, anatomy or tokens per part. On the Figma side, all checks run through `/figma-cli` or MCP snapshots; nothing tells a designer, inside Figma, that a component set no longer matches the code contract.

The plan (`.claude/handoff/2026-11-05-spec-renderers.handoff.md`) proposes two deterministic renderers over one shared input: generated component pages on the docs site (Part A) and a Figma plugin that checks parity and then draws spec sheets (Part B). It left twelve decisions open. This ADR records them.

## Decision

**One shared bundle, built, not committed.** `npm run spec:bundle` writes `specs.bundle.json`: every spec with its metadata, resolved token values, Figma variable names and a per-component hash. It is derived and deterministic, so the docs build and the plugin build regenerate it; nothing reads it from the repo. The build fails when a `styles` token path doesn't resolve. Committing it would add a staleness gate for no reader.

**Part A: dynamic `StarlightPage` routes, three sub-pages behind link tabs.** One `apps/docs/src/pages/components/[name]/[[tab]].astro` renders Usage (bare URL), Spec and Accessibility from the bundle. Tabs are links with `aria-current="page"`, M3-style, so each sub-page has its own URL, table of contents and search entry. Rejected: a custom content-collection loader (awkward for three pages per component), Starlight `<Tabs>` on one page (no URL per tab, hidden headings in the TOC), and a single long page. No Figma columns on the web pages; those belong on the Figma sheets. No generated markdown is committed, and the pages sit outside `docs-check` and `/docs-sync` because they are rebuilt from the spec.

**Anatomy parts are marked in rendered HTML with `data-part`.** Each `anatomy[].name` appears as `data-part="<name>"` on its element: the code equivalent of ADR-023's rule that part names equal Figma layer names, and the same pattern as Ark UI / Zag.js (`data-part`) and shadcn/ui (`data-slot`). Bare-text parts such as Button's `Label` are wrapped in an element. A render test renders each component and fails when a declared part is missing; a static grep of `index.tsx` was rejected because it can't tell whether the part actually renders. Optional parts are switched on by a new optional spec field (working name `anatomyProps`) holding the props that render every part; the render test, the anatomy overlay and the plugin all read it from the bundle. A dedicated Storybook story was rejected because it would make the test and the docs depend on story files.

**Anatomy diagram: live component with an SVG overlay**, leaning, confirmed or replaced by the Phase A2 spike. The docs site renders the real component with `@astrojs/react` and draws numbered markers from `data-part` positions. If CardVertical's 21 markers don't read clearly, it falls back to a Mermaid tree plus top-level markers; the spike records which ships.

**Per-component decisions live in the spec.** Two optional `spec.json` fields: `decisions[]` (`{ decision, reason?, adr? }`) and `ruledOut[]` (`{ option, reason, source? }`). `spec:validate` checks that every `adr` resolves to a file in `docs/decisions/`. They are backfilled by hand with `TODO`s, read by the docs (Spec → "Why it's built this way") and by `/review-component`, and kept out of `/component-scaffold`'s context (ADR-013). No dates; git history has them. This keeps small per-component choices out of the ADR set, which stays small.

**Part B: a flag-only Figma parity plugin.**

- **Workspace:** `apps/figma-parity`, a consumer like `apps/showcase`; nothing imports it.
- **Working name:** "Figma parity". It's named after the check, not the sheets.
- **Rules:** `token-binding`, `prop-coverage`, `part-names`, `stale-sheet`.
- **v1 never writes to the published library's components.** Fixes go through `/figma-cli` and the fidelity decision path. A per-finding "bind to spec token" action is a v2 candidate.
- **Spec sheets:** drawn on a dedicated Specs page that links back to each component set, not next to the sets, so the published library layout is untouched. Each sheet frame carries `setPluginData('specSheet', …)`, so regenerating replaces it instead of duplicating it.
- **Results:** exported as `.claude/figma-parity.json`, a frozen snapshot next to the others. `sense.js` reads it, and `npm run status` warns when the capture is older than the last spec change.

## Consequences

- The public docs can't drift from the component: they are rendered from the file every check reads. The cost is that usage guidance must be written as structured data in metadata, not as prose on a page.
- `data-part` becomes an implementation convention every component must follow, enforced by the render test. Adding a part to `anatomy[]` without marking it in code fails CI.
- ADR-027 is amended, and the spec schema changes, when `anatomyProps`, `decisions[]` and `ruledOut[]` land, together with a line in `packages/components/AGENTS.md`. That amendment ships with the schema change, not before.
- `docs-build.yml` gains spec files and the bundle script as triggers.
- Figma drift becomes visible in `npm run status` and agent context without CI ever calling Figma. The cost is that the snapshot is only as fresh as the last manual plugin run, hence the staleness warning.
- The plugin is loaded by hand in Figma desktop; no agent or CI can run it. Plugin API access on the current plan (local variables, `boundVariables`, `componentPropertyDefinitions`) is verified in Phase B0 before plugin code merges. If it isn't available, Part B is amended or dropped here.
- This ADR is amended when Part B starts, rather than superseded by a separate ADR.
