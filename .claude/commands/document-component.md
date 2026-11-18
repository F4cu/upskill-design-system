---
description: Build a component's docs-site page (Usage, Spec, Accessibility, Decisions tabs) from its committed usage.json and spec.json — write its placement and accessibility files, pick its featured decisions, set its page config, publish it, and open a PR. Does not author usage.json or spec.json (that's npm run spec:generate and the review loop), apart from a one-off edit pass on decisions written before the reader-facing rule. Use when publishing a component page on the docs site, or bringing an existing page up to the page rules.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Document component

**Invariant that must survive:** The page is rendered from the committed `<Name>.usage.json` and `<Name>.spec.json` (ADR-030). This moment writes only page-side files and page config. The one exception is the decision edit pass on `spec.json` `decisions[]`, which rewords entries and never deletes or merges them, because agents read every entry. Every figure is a story or a staged sample, never a screenshot. Output reaches `main` only through a `document/<kebab-name>` PR, after the developer has reviewed the built page.

**Trigger:** Developer, `/document-component <Name>`. One component per run.

**When to use:** A component in the fixed set gets its docs-site page (Phases A4/A5 of the spec-renderers handoff), or a published page needs bringing up to the page rules below. Not for a component with no `spec.json`: run `npm run spec:generate -- <Name>` and fill it first (CLAUDE.md, Common tasks).

## Inputs (read all before starting)

- `packages/components/src/components/<Name>/<Name>.usage.json` and `<Name>.spec.json`: the page's source. `variants`, `notFor`, `composition` (`patterns`, `limits`, `donts`) drive Usage; `anatomy`, `states`, `constraints`, `styles` drive Spec; `accessibility` is the contract the Accessibility tab summarises; `decisions[]` drives the Decisions tab.
- `<Name>.stories.tsx` and `<Name>.patterns.stories.tsx`: every figure on the page renders from these exports.
- The page template `apps/docs/src/pages/components/[name]/[...tab].astro` and `apps/docs/components.mjs`: `PUBLISHED`, `FAMILIES`, `FEATURED_PATTERNS`, `CONTENT_OPTIONS`, `OMIT_SECTIONS`, `OMIT_EVERYWHERE`, `TABS`/`tabsFor`. Also `STAGED` in `apps/docs/src/components/stories.tsx` (overlays).
- The templates, as built: `apps/docs/src/placement/{types.ts,Button.tsx,CardVertical.tsx,Dialog.tsx}` and `apps/docs/src/accessibility/{types.ts,Button.tsx,CardVertical.tsx,Dialog.tsx}`. Copy their shape; the type comments are the field contract.
- ADR-030, especially the 2026-11-16 (staged overlays) and 2026-11-18 (four tabs, page rules) amendments. ADR-027 amendment 2026-11-18 for `topic`, `featured` and `notes`.

## Page rules

- **R1. Opening section.** Named by the variant axis (`AXIS_TITLES` in `apps/docs/src/pages/components/[name]/[...tab].astro`). A component with no axis but optional content props opens with "Content": add a `CONTENT_OPTIONS` entry (each option is the `Default` story with changed `args`, plus a Use when line restating `usage.json`). With neither, the opening section is the `Default` live example.
- **R2. Placement file on every published page:** `apps/docs/src/placement/<Name>.tsx`. Each Do is a pattern story (`source: { patterns: '<name>' }`), at most 4. Each Do pairs with a Don't that is visible, chosen in this order: a `notFor` entry (wrong component), a `limits` entry, then a `donts` entry that can be drawn. A behavioural don't (focus, keyboard, events) never becomes a box; it goes into the keyboard advice (R5) or stays agent-facing in the spec. The build throws when a `source` doesn't resolve in `usage.json`.
- **R3. Captions** are 120 characters at most (the page throws). A Do starts with a verb. A Don't names the mistake, then the consequence.
- **R4. Prop rules enforced only by `type`** are not rendered. This is automatic; nothing to write.
- **R5. Accessibility file on every published page:** `apps/docs/src/accessibility/<Name>.tsx`. At most 4 use cases (what a person using assistive technology must be able to do). Labeling and keyboard advice are one or two sentences each. Choose `marks` for the labeling figure. For the keyboard figure, set `focusTarget`, `order` (a sample with more than one Tab stop), `orderNearest` (stops at both ends of the sample), `orderFrom` (focus opens on a stop other than the first and Tab stays inside, as in a modal), `ringOn`, `tableRows`. ARIA attributes, the key table and the test tier stay in `spec.json`. Every claim in the advice must match the spec's `accessibility` block; nothing checks this for you.
- **R6. Decisions tab:** featured decisions only, at most 8, filtered by `topic`. The rest stay in `spec.json`, reached through the page's "Spec source" link. Not featured: an entry that restates a system-wide rule (an ADR, `AGENTS.md`) or repeats `usage.json` without adding why.
- **R7. No empty sections.** A section with no data is left out automatically. A section with data that adds little to this page goes in `OMIT_SECTIONS` (Dialog's States); say why in the PR.
- **R8. Overlays render staged** (non-modal, inert, no backdrop). No figure may depend on modality. A new overlay component goes in `STAGED`.

## Decision edit pass (one-off, for entries written before the rule)

The rule is in the `decisions[]` description of `packages/components/component.spec.schema.json`, and `npm run spec:validate` enforces the mechanical part. Skip this pass when every entry already passes and reads well.

- `decision` says what was chosen; `reason` says why, for a reader of the docs page. Short, plain words, one idea per sentence, "you" for the person using the component, code names in backticks. No internal jargon ("bleed", "consumer", "glyph", "Root").
- Provenance (dates, which review caught it), detailed mechanics, and guidance to reviewers or agents move to `notes`. Move text; never drop it.
- Every entry has a `topic`: `visual` (spacing, layout, structure, look), `behaviour` (focus, keyboard, events, state sync) or `platform` (native elements, browser support, workarounds). One right label per entry.
- Mark at most 8 `featured: true` (R6). A component with no featured entry and nothing else for the tab gets no Decisions tab (`tabsFor`).
- Apply the same reader-facing rule to `ruledOut[]` reasons and `figma.divergences` (they also gain `notes`); none of these are featured.

## Steps

1. Read the inputs. List what R1–R8 need for this component: opening section, Do/Don't pairs with their sources, use cases, marks and keyboard options, featured decisions, sections to omit. Show this list to the developer before writing files; it is the API-proposal checkpoint of this moment.
2. Run the decision edit pass if needed, then `npm run spec:validate`.
3. Write the placement and accessibility files and any `components.mjs` config (`CONTENT_OPTIONS`, `FEATURED_PATTERNS`, `OMIT_SECTIONS`), and add `<Name>` to `PUBLISHED`. If a story the page needs is missing (a pattern story, a state story), stop and report it. Adding stories is component work, outside this moment.
4. Gate: `npm run spec:validate && npm run docs:build`. Fix and repeat until green.
5. Visual check in the running docs site (`docs:serve` or `astro dev`): every tab in light and dark, and at 375px with no figure scrolling sideways. Compare the page's length and shape with Button and CardVertical. Ask the developer to review the page and apply what they ask for.
6. Branch `document/<kebab-name>`, commit, open a PR against `main`. If `npm run docs:check` asks for a doc touch, add it in the same PR.

## Invariants (must survive any edit to this file)

- **Does not author `usage.json` or `spec.json`.** Wrong or missing guidance found while documenting (a missing `notFor`, a wrong limit) is reported as a finding for `/extract-learnings` or a GitHub issue, not fixed here. The decision edit pass is the only exception.
- **Never deletes or merges a `decisions[]`, `ruledOut[]` or `figma.divergences` entry.** Shortening the page is done with `featured`, never by removing agent context.
- **Figures are code.** Every picture renders a story or a hand-built sample from library components, staged when the component is in `STAGED`.
- **No subagent, no MCP, no live API calls.** The developer's page review is the review stage.

## Output

```
## <Name> page
Tabs: Usage · Spec · Accessibility [· Decisions]
Opening: <axis title | Content | Example>
Placement: <n> Do / <n> Don't (sources)
Accessibility: <n> use cases; keyboard: <options set>
Decisions: <featured>/<total> featured (<topics>); edit pass: <n> entries reworded | skipped
Omitted sections: <list + reason> | none
Findings for /extract-learnings or issues: <list> | none
Gate: spec:validate ✓ docs:build ✓ · visual: light/dark ✓ 375px ✓
PR: <url>
```

## Success signal

The gate passes, the developer approves the built page, and the PR is open on `document/<kebab-name>`.
