---
title: "ADR-030 — Spec renderers: generated component pages and a Figma parity check"
---
# ADR-030 — Spec renderers: generated component pages and a Figma parity check

**Date:** 2026-11-10
**Status:** `accepted`
**Amended:** 2026-11-10

## Context

ADR-027 split each component's contract into `<Name>.metadata.json` (how to use it) and `<Name>.spec.json` (how to build it). Both files gate code review and steer the agents, but no human-facing page shows them. The docs site (ADR-022) publishes only the reference pages and ADRs, and Storybook Autodocs covers the API, not usage guidance, anatomy or tokens per part. On the Figma side, all checks run through `/figma-cli` or MCP snapshots; nothing tells a designer, inside Figma, that a component set no longer matches the code contract.

The plan (`.claude/handoff/2026-11-05-spec-renderers.handoff.md`) proposes two deterministic renderers over one shared input: generated component pages on the docs site (Part A) and a Figma plugin that checks parity and then draws spec sheets (Part B). It left twelve decisions open. This ADR records them.

## Decision

**One shared bundle, built, not committed.** `npm run spec:bundle` writes `specs.bundle.json`: every spec with its metadata, resolved token values, Figma variable names and a per-component hash. It is derived and deterministic, so the docs build and the plugin build regenerate it; nothing reads it from the repo. The build fails when a `styles` token path doesn't resolve. Committing it would add a staleness gate for no reader.

**Part A: dynamic `StarlightPage` routes, three sub-pages behind link tabs.** One `apps/docs/src/pages/components/[name]/[...tab].astro` (see the Phase A1 amendment) renders Usage (bare URL), Spec and Accessibility from the bundle. Tabs are links with `aria-current="page"`, M3-style, so each sub-page has its own URL, table of contents and search entry. Rejected: a custom content-collection loader (awkward for three pages per component), Starlight `<Tabs>` on one page (no URL per tab, hidden headings in the TOC), and a single long page. No Figma columns on the web pages; those belong on the Figma sheets. No generated markdown is committed, and the pages sit outside `docs-check` and `/docs-sync` because they are rebuilt from the spec.

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

## Amendment (2026-11-10) — The examples field is a list of props or patterns

The schema step renamed the working field `anatomyProps` to `anatomyExamples` and changed its shape: a list of entries, each either root props or a metadata `usage.patterns` name. A single set of props can't render CardVertical's parts, because they are written in JSX, and it can't show parts that exclude each other (`Favorite` or `Menu` in one `Action` slot). The field is specified in the ADR-027 amendment of the same date. Two parts no example can render are left to the render-test step: CardVertical's `MenuPanel` (opens on interaction) and TextField's `Placeholder` (a pseudo-element).

The backfill doesn't use `TODO` placeholders, as the Decision section implies: a `TODO` string fails `spec:validate`. Button and CardVertical were backfilled first; the other specs carry no `decisions` or `ruledOut` until someone writes them, and their docs pages show "none recorded".

## Amendment (2026-11-10) — data-part markers on Button and CardVertical

The convention from the Decision section, as built.

- **Marker placement.** Each part's element sets `data-part="<anatomy name>"` before `{...rest}`. When a part is built on another library component, the outer name wins on the shared element: CardVertical's Favorite is a Button whose `<button>` reads `data-part="Favorite"`, not `"Root"`.
- **Parts inside a nested component.** An outer component can't mark them, so they keep the inner component's own marker. The spec says which marker that is with `builtOnPart`: `FavoriteGlyph` is found as `[data-part=Favorite] [data-part=Icon]`. A Figma nested instance works the same way: its layers keep the inner component's names. A Button prop that renamed its internal markers was rejected because it adds API surface for one consumer.
- **Parts no example can render.** They carry `notRendered` with a reason. The test skips them, and the docs overlay will list them as not shown. CardVertical's `MenuPanel` is the first case: `DropdownMenu` renders nothing until opened, and `CardVertical.a11y.test.tsx` already covers it open. Putting a click into the example was rejected, because it can't cover TextField's `Placeholder` pseudo-element, so an exemption would still be needed.
- **Pattern examples render through stories.** A metadata pattern tree is notation, not code. A `{ "pattern": "overflow-menu" }` example renders the story named after the pattern in PascalCase (`OverflowMenu`). CardVertical's `WithFavorite` and `WithMenu` stories were renamed `FavoriteSaved` and `OverflowMenu`. A `story` field on metadata patterns was rejected because `/layout-generation` would read it 27 times per run.
- **Button's label.** It is now a plain `<span data-part="Label">`, rendered only when children are present, so no empty flex item adds a gap.
- **Test and CI.** `npm run anatomy:test` (`packages/components/src/anatomy.test.tsx`, run in `components-check.yml`) renders each spec's examples and fails on any part with no marker. With three markers removed on purpose, it reported exactly the five expected parts, including both glyphs. The ADR-019 screenshot check passed at 0.000% for all 54 shots.
- **Scope.** Only specs with `anatomyExamples` are tested. That's Button and CardVertical today; Phase A3 extends it to all 27.

## Amendment (2026-11-10) — Phase A1 pages as built

Button and CardVertical have Usage, Spec and Accessibility pages, as tables and text only.

- **Route file.** `[name]/[...tab].astro`, not `[[tab]].astro`: Astro has no double-bracket optional segment, and a rest parameter left undefined gives the bare Usage URL.
- **Sidebar highlight.** Starlight marks a sidebar link current only on an exact path match, so `/spec/` and `/accessibility/` highlighted nothing. A Starlight route middleware (`apps/docs/src/route-data.ts`) marks the component's Usage link current on all three routes. A sidebar entry per tab was rejected: it would triple the Components group, and the tab bar already links the sub-pages.
- **Bundle loading.** The pages import `dist/specs.bundle.json` as a JSON module. Reading it with `fs` from `import.meta.url` broke once Vite bundled the page into `dist/`. ADR links resolve through the `docs` content collection, so a `decisions[].adr` value with no published ADR renders as plain text.
- **A11y tier in the bundle.** Each component carries `a11y: { tier, test, backlog }`, derived with the same `isInteractive` rule `a11y-coverage.js` uses, so the Accessibility page states the tier the gate enforces instead of re-deriving it.
- **Builds.** `docs:build` and `docs:serve` run `spec:bundle` first. `docs-build.yml` builds tokens and also triggers on spec, metadata, token source and bundle-script changes.
- **Which components.** A list of two in `apps/docs/components.mjs`; Phase A3 removes the filter.

## Amendment (2026-11-10) — Phase A2 spike: the overlay ships, with a depth fallback

The live overlay from decision 3 ships. `@astrojs/react` renders each `anatomyExamples` entry from component source inside Starlight, and a script measures every `data-part` element (the lookup `anatomy.test.tsx` uses) and draws numbered markers in an SVG over it. The examples pick up Starlight's `data-theme`, which is the attribute the token CSS keys on, so they follow the site's light/dark switch with no extra wiring.

- **Depth fallback.** All 21 markers on CardVertical did not read: the Meta row badges covered "12 Hours", "Certified" and "Completed", and colliding badges were pushed off their parts. An anatomy three or more levels deep now marks only its top two levels (CardVertical: Root, Media, Progress, Body) on the first example, and a Mermaid tree (`astro-mermaid`, already installed) shows every part. Shallower anatomies keep the full overlay on every example (Button: 4 parts). Marker numbers are the anatomy table's row numbers, so the table is the legend. Gutter markers with leader lines were considered and not built: more layout code for a case the tree already covers.
- **Library CSS.** The package's built `index.css` carries a global reset (`* { margin: 0; padding: 0 }`, `body` styles) that would restyle the site. The pages import component source (CSS Modules) and `tokens.css` only; the reset is re-applied inside `.ds-example`.
- **Pattern examples.** Rendered from the story's args on `meta.component`, without Storybook's runtime; story decorators are skipped.
- **Fonts.** Component pages load the brand fonts through frontmatter `head`, as Storybook's `preview-head.html` does; other pages don't.

