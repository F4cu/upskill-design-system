---
status: active
created: 2026-11-05
completed:
---

# Spec renderers: component pages on the docs site first, then a Figma spec-sheets plugin

A first draft plan to render the committed ADR-027 spec files (`packages/components/src/components/<Name>/<Name>.spec.json`) in two places from one shared bundle:

- **Part A:** a generated component page per spec on the Starlight docs site (`apps/docs`, ADR-022).
- **Part B:** a small Figma plugin that draws annotated spec sheets next to each component set in the main Figma file (`t4F3b1p03loOX9IpNXRaYR`).

Part A comes first. It's cheaper, it's public (one URL anyone can open, no Figma access needed) and it proves the bundle and the section layout before any plugin code exists. Nothing here is decided. Work through **Open decisions**, record the outcome in a new ADR (next free number: 030), then build in the phases below. Facts were checked on `main` on 2026-11-05.

## Why

- **One contract, three outputs.** The spec already drives code review (`/review-component`, `spec:validate`). Rendering it on the docs site and in Figma makes the same anatomy, props, tokens, states and a11y rules visible to readers and designers, with no hand-written docs to drift.
- **Why the docs site first:** the site builds from the repo already, but publishes only the reference pages and ADRs (loader pattern in `apps/docs/src/content.config.ts`). No component pages exist. Adding them is incremental work on a pipeline that's already deployed.
- **Why a plugin after that:** the public repo has no standalone Figma tooling yet. All Figma work goes through `/figma-cli` (third-party) or MCP snapshots. Annotations next to the component set reach designers where they work. Reference point: [Spectacular](https://spectacular.systems/) goes Figma → spec, extracting anatomy, props, layout, styling and modes into schema-valid YAML/Markdown deterministically. This plugin is the reverse and much smaller, repo spec → Figma annotations. That matches ADR-002's code-first direction, and it's the only direction plan limits leave open: the Variables REST API and Code Connect are Enterprise/Org-only. The Plugin API isn't plan-gated the same way. *Verify this in Phase B0*, especially `figma.variables` read access on the current plan.
- **Consistent with the system's rules:** no AI calls (both are deterministic renderers), no live API calls (specs are bundled at build time, see "frozen-file handoffs" in `CLAUDE.md`), no new always-on automation.

## Shared input: the spec bundle (Phase 0)

| Input | Path | Used for |
|---|---|---|
| Spec files (27 components) | `packages/components/src/components/*/*.spec.json`, schema `packages/components/component.spec.schema.json` | `anatomy` (with `parent`, `builtOn`, `builtOnProps`, `when`), `props` (with `figma.surface/property/set`), `constraints`, `states`, `accessibility`, `styles` (per part, `when` conditions, token paths, `literal` + `reason`, `template`, `sameAs`), `figma.sets[].nodeId` and `figma.divergences` |
| Built tokens | `packages/tokens/dist/js` (or `dist/css`) | Resolving a token path to its value for labels (e.g. `space.inline.sm = 8px`) |
| Figma variable mirror | `packages/tokens/figma-variables.json` | Mapping a token path to its Figma variable name (`space.inline.sm` → `space/inline/sm`) and skipping recorded representational divergences |

A script (working name `npm run spec:bundle`, in `scripts/`) writes one `specs.bundle.json`: every spec, resolved token values, Figma variable names and a hash per spec. Both renderers read only this file. It's derived, so it's built in CI and not committed (see Open decision 4).

- **Done when:** the bundle builds after `tokens:build`, every token path in every spec's `styles` resolves to a value (otherwise the build fails, the same rule `spec:validate` applies), and the output is byte-identical across two runs.

## The five sections (same in both renderers)

1. **Anatomy.** Parts with name, element, role, required / `when`, `builtOn` / `builtOnProps`, and nesting from `anatomy[].parent`. CardVertical (21 parts, 4 levels) is the stress test.
2. **Props.** Prop, type, options, default, Figma surface and property. `code-only` props are shown and labelled, not hidden, because that's what designers usually lack.
3. **Styles and tokens.** Per part and condition: CSS property → token path → resolved value. Literals show their `reason`.
4. **States and accessibility.** States with their ADR-025 `kind` and trigger, role, ARIA attributes, keyboard interactions table, focus note (ADR-028).
5. **Constraints and divergences.** `constraints[]` with `reason` and `enforcedBy`, and `figma.divergences[]` with the decision on each.

Where a spec has nothing for a section, the renderer says "none recorded". It never fills the gap. For example, 25 of 27 specs have empty `constraints`; see `2026-10-12-spec-rollout-followups.handoff.md` item 3.

## Part A: component pages on the docs site

### How it fits ADR-022

- Today the `docs` collection loads markdown from the repo-root `docs/` folder through `glob()`, and the sidebar is derived from filenames in `astro.config.mjs` (`pagesIn`). Nothing is hand-maintained.
- **Leaning:** render component pages straight from the bundle, with no generated markdown files to commit or keep in sync. That's either a second content collection with a custom loader over `specs.bundle.json`, or a dynamic route (`src/pages/components/[name].astro`) using Starlight's `StarlightPage` so pages keep the site chrome. Add a "Components" sidebar group derived from the bundle, the same way `referencePages` is derived from filenames.
- `docs-build.yml` only triggers on `docs/**` and `apps/docs/**`. Add `packages/components/src/components/**/*.spec.json` and the bundle script so a spec change rebuilds the site on its PR.
- These pages aren't `docs/NN-*.md` reference pages, so they sit outside `docs-check` and `/docs-sync`, like the splash page (ADR-022 amendment 2026-09-23). They can't go stale; they're rebuilt from the spec.

### Phase A1: Button and CardVertical, all five sections as tables

- **Done when:** both pages build on the PR check, every row traces to a field in the spec, and pages pass the site's existing light/dark and keyboard checks.

### Phase A2: anatomy diagram

Target look: numbered markers on the rendered component plus a numbered legend, as in the [M3 card guidelines](https://m3.material.io/components/cards/guidelines). Those images look hand-exported from Figma, so they show the look, not a way to generate it. Spectacular draws on the Figma canvas from named layers, which is Part B's method, not Part A's.

**Options (checked 2026-11-10):**

- **Live component with an SVG overlay (leaning).** The page renders the real component at build time with `@astrojs/react` (the only new dependency). A small script on the page measures each part's position and size and draws numbered markers in an SVG over it. The legend comes from `anatomy[]`. It follows theme and brand, and can't drift from code because it *is* the code. No diagram library.
- **Screenshot at build time.** Playwright opens the Storybook story, reads each part's position and size, and writes an SVG with the screenshot embedded. Works without JavaScript, but needs one image per theme and makes the build heavier. Fallback only.
- **Mermaid tree** (`astro-mermaid` already installed). Shows how parts nest, not where they sit. Use it next to the overlay for deep nesting (CardVertical, 4 levels), not instead of it.

**Prerequisite: no component marks its parts in the rendered HTML** (Open decision 9). On 2026-11-10, no component under `packages/components/src` set `data-part`, `data-slot` or anything like it. The spec names the parts, and Figma layer names point to them (ADR-023). Code has no equivalent, so the overlay has nothing to find. This is a missing implementation convention, not a missing contract layer: `spec.json` already holds the structure the diagram needs.

- Button's `Label` is bare text with no wrapping element. Either wrap it, or measure the text node with a DOM `Range`.
- Optional parts with a `when` condition (Button's `Icon`, `TrailingIcon`) render only with the right props. The diagram needs a set of props that turns them all on. That could be an optional spec field or a dedicated Storybook story.

**Spike:**

1. Add `@astrojs/react` to `apps/docs` and confirm a component renders inside Starlight with its CSS Modules and `tokens.css`.
2. Add `data-part` to Button and CardVertical only, and build the overlay.
3. Check whether CardVertical's 21 markers still read clearly. If they don't, fall back to a Mermaid tree plus markers on the top-level parts only. Record which one ships.

### Phase A3: all 27 components

- Generate every page, link each one to its Storybook story and its spec file on GitHub, and add one line to `00-start-here.md` pointing to the Components section.

## Part B: Figma spec-sheets plugin

One auto-layout frame per component, with the five sections, placed next to its component set (`figma.sets[].nodeId`) or on a Specs page (Open decision 6). Styled with the UpSkill library's own text styles and variables, so the docs are built with the system they document. Part A's page layout is the reference for section order and wording.

**Not in scope:** Figma → spec extraction (Spectacular's direction), publishing to Figma Community, any LLM call, Code Connect, multi-brand sheets (Figma stays single-brand, ADR-012).

### Phase B0: spike (no plugin code merged)

- Set up a development plugin (manifest + TypeScript + esbuild) and load it in Figma desktop via *Plugins → Development → Import plugin from manifest*. **This is a manual step for Facundo;** an agent can't do it.
- Confirm on the current plan: reading local variables and `boundVariables` on nodes from the Plugin API; `setPluginData` on created frames.
- Check that layer names match `anatomy[].name` for Button (`57:1265`, `54:1192`) and CardVertical (ADR-023: part names = Figma layer names). Record any mismatches; they're findings, not things to fix silently.

### Phase B1: Button, text sections

- Sections 2, 4 and 5 as a generated frame.
- **Idempotent:** the frame carries `setPluginData('specSheet', { component, specHash, generatedAt })`. Regenerating replaces the frame and never duplicates it.
- **Done when:** running it twice on Button gives one sheet, and every row matches the Button page from Part A.

### Phase B2: anatomy markers

- An instance of the default variant with numbered markers on each layer matching an anatomy part, plus the legend. When a part has no matching layer, the legend shows it as "not found in Figma" rather than skipping it. Button, then CardVertical.

### Phase B3: token redlines and mismatch flags

- Section 3, plus redlines on the instance (padding, gap, height, radius) labelled with the token. For each `styles` entry that maps to a Figma property (padding, gap, height, width, radius, fill, stroke), read the node's bound variable and flag it when it differs from the spec token or when the value is unbound.
- **Known-answer test:** the open items in `2026-10-13-figma-fidelity-follow-ups.handoff.md` are already-traced differences. Without being told about them, the plugin should flag:
  - ButtonArrow's glyph stroke (`color/icon/*` in Figma vs `color.text.*` in the spec)
  - Checkbox's `_Checkbox/Box` 18×18 with no size binding (spec: `size.icon.sm`)
  - Write down which of these it flags *before* running it, in line with the repo's honest-outcome rule. A miss is a result, not something to tune away quietly.

### Phase B4: all 27 components and staleness

- Generate all sheets in one run. The plugin compares each sheet's stored `specHash` with the bundle and marks stale sheets. That's the drift signal for Figma docs; nothing in CI calls Figma.
- Decide whether `sense.js` should report sheet staleness from a committed snapshot (only if there's a frozen file to read; no live calls).

## Open decisions

1. **ADR-030 scope:** one ADR for the bundle plus both renderers, or one for the bundle and docs pages now and an amendment when the plugin starts. Leaning one ADR, amended per part.
2. **Docs pages:** custom collection loader or dynamic `StarlightPage` route (see Part A). Either way, no generated markdown committed.
3. **Anatomy diagram on the web:** live component with an SVG overlay (leaning), screenshot at build time, or Mermaid tree only (Phase A2). Depends on decision 9.
4. **Bundle committed or built:** built in CI (recommended; it's derived) or committed as a frozen file. Committed would let `sense.js` read it, but it's one more file to keep in sync.
5. **Plugin workspace location:** `apps/figma-spec-sheets` (a consumer, like `apps/showcase`) or `packages/figma-plugin`. Leaning `apps/`, since nothing imports it.
6. **Where sheets live in the Figma file:** next to each set on the component pages, or a dedicated Specs page that links back to the set. A dedicated page is less risky for the library's published layout.
7. **Plugin mismatch policy:** flag only, or also offer "bind to spec token" (writing to Figma). Leaning flag-only for v1; writing is `/figma-cli`'s job and goes through the fidelity handoff's decision path.
8. **Name:** "spec sheets" is a working name for the plugin. Pick something that doesn't read as a copy of Spectacular.
9. **Part names in rendered HTML:** each anatomy part's element carries `data-part="<anatomy name>"`. That's the code equivalent of ADR-023's rule that part names equal Figma layer names. Other libraries do the same (Ark UI / Zag.js use `data-scope` + `data-part`, newer shadcn/ui components use `data-slot`), and it also gives tests and styles a stable hook. Sub-questions:
   - **Enforcement:** a check in `spec:validate`, or a test that renders each component, that every `anatomy[].name` appears as a `data-part` in the output.
   - **Bare-text parts** like Button's `Label`: wrap them in an element, or let the overlay measure the text node.
   - **Optional parts:** add an optional spec field listing props that render every part, or use a Storybook story.
   - **Where it's recorded:** other code and tooling will depend on this convention, so it needs an ADR (part of ADR-030, or its own) plus a line in `packages/components/AGENTS.md`. The spec schema doesn't change unless the optional-props field is added.

## Measurement (for the case study; decide before Phase A1)

- Time to document Button by hand, using the same five sections, vs. generating its page. Time it; don't estimate it.
- Phase B3 known-answer result: how many of the traced fidelity items the plugin flags, and how many new ones.
- Until measured, the portfolio and CV say "built", never a number.

## Portfolio follow-up (outside this repo)

- **After Part A:** link the Components section from the UpSkill agentic case study (P3) as live evidence of generated documentation, and update `~/projects/ds-jobs/profile/index.md` (C4).
- **After Phase B2 or later:** screenshots or a short screen recording of a generated Button and CardVertical sheet, and update `index.md` again (E3, and the "Custom design-system tooling" gap in §5).
- Only claim what has shipped.

## Done when

- ADR-030 accepted.
- **Part A:** the docs site has a generated page for each of the 27 specs, rebuilt on every spec change, with no hand-maintained files.
- **Part B:** the plugin lives in its workspace with a README on loading it in Figma desktop; sheets for all 27 components generate from the bundle, regenerate in place, and mark stale sheets.
- The timing and the Phase B3 known-answer result are recorded in `docs/case-study-source/08-measured-impact.md`.
