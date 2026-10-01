---
status: active
created: 2026-09-30
completed:
---

# CardVertical subcomponents — rollout plan

Approved proposal: https://claude.ai/artifact/J2neFtFKcYaGFgeTQ5CY2U (v4). It is the spec; this file sequences the work.

## Decisions locked in the proposal

- **Preset + parts.** `<CardVertical …props />` stays as the preset, rebuilt from `CardVertical.*` parts. The only new preset prop is `action`. No breaking change; Homepage and CourseOverview are untouched.
- **Dot namespace** via `Object.assign`. Parts are reachable only as `CardVertical.X`, and each part throws when rendered outside `Root`.
- **Parts:**
  - fixed: `Root`, `Media`, `Progress`, `Title`, `Duration`, `Certified`, `Favorite`, `Menu`
  - slot: `Action`, which takes exactly one `Favorite` or `Menu`
  - open: `Body` = `Stack gap="sm"`, `Meta` = `Inline gap="sm" wrap align="center"`
- **Open parts** accept `children` only, with no layout-prop pass-through. Custom spacing comes from nesting a `Stack` or `Inline` inside. Parts never set an outer margin (Braid / React Spectrum model).
- **Accepts:**
  - `Body`: `Title` (required, first), `Meta`, `Stack`, `Inline`, `Text`, `Badge`, `Avatar`
  - `Meta`: `Duration`, `Certified`, `Text`, `Badge`, `Icon`, `Inline`
- **Favorite:** `pressed` / `defaultPressed` / `onPressedChange`; `aria-pressed`; accessible name "Save" + Title via `aria-labelledby`.
- **Menu:** reuses `DropdownMenu` `items` + `onSelect`; `aria-haspopup="menu"` / `aria-expanded`; Esc, outside click and focus return follow AppHeader.
- **Button gains `variant="elevated"`** (token `color.background.button.elevated`, currently unused). Icon gains `more-vertical`. ProgressBar accepts `aria-labelledby`.
- **Naming contract (code ↔ Figma):** same names, values and defaults. Booleans are states that default to `false`. Figma layer names match part names. Scope is CardVertical only; the system-wide naming audit is a separate issue.

## Step 0: before writing code

- [x] Read Curtis, ["Subcomponents"](https://nathanacurtis.substack.com/p/subcomponents-753ce9f6600a) (2022) and ["Space in Design Systems"](https://nathanacurtis.substack.com/p/space-in-design-systems-188bcbae0d62) (2016). Medium blocks WebFetch, but these Substack copies of the same posts load. Done 2026-10-01: **neither contradicts the open-part / no-gap model.** Background reading only: ADR-023 does not cite either article or its author. It cites the ds101 wiki where a page covers the point, and otherwise states the point as the system's own decision.
  - **Cite ds101.** [Component API design](https://f4cu.github.io/ds101/component-api-design/): "common configurable, uncommon composable", and ready-made examples as the safeguard (our `usage.patterns` + stories). [Component composition in code](https://f4cu.github.io/ds101/component-composition-in-code/): subcomponent definition, dot namespace via `Object.assign`. [Component composition in Figma](https://f4cu.github.io/ds101/component-composition-in-figma/): slot = swappable nested instance.
  - **State as our own decision (ds101 doesn't cover it).**
    - Part taxonomy: `Media` narrows `Image`, `Action` enumerates allowed children, open parts are typed containers with `accepts`.
    - Spacing ownership: the container owns spacing between parts, never a margin on the child. Braid is the external precedent.
    - Context guard that throws outside `Root`.
    - Figma instance swap resets overrides unless layer names match; that's the reason for the layer-name half of the naming contract (PR 4).
  - **Space: already adopted (ADR-004).** inset/stack/inline concepts, t-shirt names, no `padding`/`margin` in token names, grid kept separate. `gap` on `Stack`/`Inline` replaces margin-based stacking, which is what makes the no-margin rule cheap. Component CSS already has no outer margins. Cite ADR-004, not an article. No ADR-004 change.

## PR 1: convention + tooling (branch `subcomponents/foundations`)

This PR has no component changes. It makes parts a first-class concept so the later PRs pass the gates.

- [ ] **ADR-023 — subcomponents and compound components** (`docs/decisions/023-subcomponents-compound-components.md`, from `000-template.md`). It covers:
  - when to split: a second real use case, run through the ADR-009 three-question test
  - dot namespace + context guard
  - preset + parts ("common configurable, uncommon composable")
  - fixed / slot / open part kinds, and the no-margin rule
  - the naming contract with Figma
  - sources: the ds101 pages, plus Braid and React Spectrum as precedent; no individual authors (Step 0 notes above)
  - one line of cross-reference in ADR-009
- [ ] **Schema:** `packages/components/component.schema.json` gets an optional `composition.parts[]` with these fields:
  - `name` (PascalCase)
  - `kind`: `fixed` | `slot` | `open`
  - `description`
  - `builtOn`: library component or `null`
  - `required`
  - `accepts`: component or sibling-part names; `slot`/`open` only
  - `containedBy`: parent part names
  - `additionalProperties: false`, matching the rest of the schema
- [ ] **`scripts/validate-metadata.js`:** part names must be unique. Each `accepts` entry must be a fixed-set component or a sibling part. `accepts` is not allowed on `fixed` parts. A `builtOn` value must be a real component folder.
- [ ] **`scripts/validate-layout.js`:** the fixed-set check (line ~210) currently rejects `<CardVertical.Root>`. Allow `Parent.Part` when `Parent` is in `FIXED_SET` and `Part` is declared in `Parent`'s metadata `composition.parts`. Also enforce each open part's `accepts` for direct children and the one-child rule for `slot`.
- [ ] **`scripts/generate-pattern-schema.js`:** check that its AST scan handles `JSXMemberExpression` and doesn't count parts as components. Regenerate `.claude/component-patterns.json`.
- [ ] **Rule pointer:** a short "Subcomponents (ADR-023)" block in `.claude/rules/components.md`. CLAUDE.md gets at most one line under Component scope ("parts are not new components; see ADR-023"). `npm run claudemd:check`.
- [ ] **Docs (docs-check coupling):** the schema and validator changes make these pages stale, so touch them in this PR.
  - `docs/02-component-lifecycle.md`
  - `docs/10-machine-readable-metadata.md` (parts block)
  - `docs/12-taming-non-determinism.md`
  - `docs/08-glossary.md` (add "subcomponent / part", "slot", "open part")
  - `docs/04-layout-grammar.md` (dotted names are allowed in layouts)
- **Gate:** `npm run metadata:validate && npm run layout:validate apps/showcase/src/pages/*.tsx && npm run docs:check && npm run claudemd:check`. Add a throwaway fixture layout that uses a dotted part to prove the validator accepts it and rejects an undeclared part, then delete the fixture.
- **Review:** `/code-review` on the diff (standard path).

## PR 2: prerequisites in existing components (branch `component/card-vertical-prereqs`)

- [ ] **Icon:** add a `more-vertical` glyph to `IconName` + `paths` in `components/Icon/index.tsx`, plus a metadata note.
- [ ] **Button:** add `variant="elevated"`.
  - CSS: bg `color.background.button.elevated`, text `color.text.default`, hover `color.background.button.outline.hover`.
  - Metadata `variants` purpose: "icon-only actions over media".
  - Story.
  - Add the elevated pair to the curated `PAIRS` in `scripts/token-contrast-check.js`.
- [ ] **ProgressBar:** accept `aria-labelledby` as an alternative to `label` (typed so that one of them is required). Update metadata a11y and the `ProgressBar` a11y test.
- **Gate:** `npm run metadata:validate && npm run typecheck && npm run build && npm run lint && npm run a11y:coverage && npm run a11y:test && npm run tokens:contrast-check && npm run screenshot:check`. Approve only the new Button baseline; existing baselines must not change.
- **Review:** `/code-review` (standard path). The changes are small and additive.

## PR 3: CardVertical parts (branch `component/card-vertical`, via `/review-component CardVertical`, full path)

- [ ] **`components/CardVertical/index.tsx`:**
  - `CardVerticalContext` holds `size` and `titleId` (`useId`). A `useCardVertical()` guard throws "CardVertical.X must be rendered inside CardVertical.Root".
  - One function per part. `Media` is a relative wrapper around `Image` with no overflow clipping, so the menu panel isn't cut off.
  - `Action` rejects anything other than exactly one child.
  - The preset `CardVertical` composes the parts, with `action?: ReactNode` as its only new prop.
  - `export const CardVertical = Object.assign(CardVerticalPreset, { Root, Media, Action, Favorite, Menu, Progress, Body, Title, Meta, Duration, Certified })`.
  - Part prop types are exported from `src/index.ts`.
- [ ] **`CardVertical.module.css`:** part classes, the overlay slot (`position:absolute`, inset from space tokens), and the pressed heart (`fill: currentColor` with the brand icon token). No margins and no raw values.
- [ ] **`CardVertical.metadata.json`:**
  - `composition.parts` (all 11); `composedOf` += `Button`, `DropdownMenu`, `Stack`, `Inline`.
  - `accessibility` gains the Favorite/Menu keyboard interactions, which makes `a11y:coverage` treat the card as interactive.
  - `states` += `favorite-pressed`, `menu-open`.
  - `usage.patterns`: the 8 gallery states + `instructor-row` + `grouped-meta`.
  - `antiPatterns`: two actions on one card, `gap`/margin on parts, wrapping `Root` in `<a>`, `Heading` instead of `Title`.
- [ ] **Stories:**
  - Existing stories are unchanged (regression proof).
  - Add `WithFavorite`, `WithMenu`, `Composed`, `InstructorRow`, `GroupedMeta`.
  - Set `subcomponents` in the Storybook meta so Autodocs lists the part props.
- [ ] **`CardVertical.a11y.test.tsx`:**
  - Favorite toggles `aria-pressed` and has a name that includes the title.
  - Menu opens with Enter/Space, arrow keys move between items, Esc closes and returns focus, and an outside click closes it.
  - A part outside `Root` throws.
- **Gate:** `npm run metadata:validate && npm run typecheck && npm run build && npm run lint && npm run a11y:coverage && npm run a11y:test && npm run a11y:stories && npm run screenshot:check && npm run patterns:generate && npm run sense`.
  - Existing CardVertical baselines and both showcase pages must render pixel-identical. That identity is the proof the preset didn't change.
  - Approve new baselines only for the new stories.
- **Review:** `/review-component CardVertical` (one adversarial subagent), then `/extract-learnings CardVertical`. Check `scripts/pattern-accuracy-harness/tasks/component-cardvertical.json` still matches the component's props (ADR-013 measures scaffold regressions).

## PR 4: Figma alignment (interactive, developer present; `/figma-cli`)

Run through `/figma-cli` (figma-cli `eval` over Figma Desktop; Figma MCP only as fallback if it can't connect). Its hard rules apply: show the commands, no deletes without naming each node, names come from `CardVertical.metadata.json` (so PR 3 must be merged first).

- [ ] **Read first.** One `figma-cli eval` on node `52:4270` (`getNodeByIdAsync`) returning its component property definitions and layer tree (names + ids only). Record the current property and layer names in this file before changing anything.
- [ ] **Plan and confirm.** Write the rename map (layer → part name) and the property list below into this file; confirm with the developer before writing, since it touches CardVertical and the shared Button set.
- [ ] **Rename layers** to part names in one `eval`.
- [ ] **Properties** in one `eval` (`addComponentProperty` / `editComponentProperty`): `Size` variant (sm/lg); `Action` instance swap (None / Favorite / Menu); `Favorite › Pressed` boolean; `Menu › Expanded` boolean (design-only state); `Certified` boolean; `Progress` layer toggle; text properties for `Title` / `Duration`.
- [ ] **Button `elevated` round variant** with `heart` / `more-vertical`: clone an existing round variant via `eval`, rename it per Button metadata `variants`, and bind its fill to the `color/background/button/elevated` variable (`$bind`). That variable is already in Figma (`figma-variables.json`, 2026-10-01 capture); never create variables here, that's `/figma-variable-push`.
- [ ] **Verify.** Re-read with `eval` (property names and layer names match the metadata) and `figma-cli verify 52:4270 --measure`. `figma-cli undo` reverts the last operation if needed.
- Nothing to commit unless drift notes or this file change. Update the `figma-file-variable-drift` memory if any representational divergence appears. Code Connect is Enterprise-gated, so it's out of scope.

## After: follow-up issues (file, don't do)

- [ ] System-wide property naming audit: one vocabulary (`variant`/`size`/`shape`), plus a deterministic script comparing metadata `variants` with Figma component properties. Start only after PR 4 has tested the naming contract on CardVertical. Shape:
  - **Read Figma once, then diff with a script.** One `/figma-cli` read captures every component set's property names, types, values, defaults and layer names into a committed snapshot (e.g. `figma-components.json`, same frozen-snapshot pattern as `figma-variables.json`). A script diffs it against the metadata files: cheap reruns, CI-able later. The new snapshot + script is a tooling contract, so it needs an ADR or an ADR-002 amendment.
  - **Fix mostly on the Figma side.** Figma renames are a cheap `/figma-cli` batch. Code prop renames are breaking, so do them only where the code vocabulary itself is inconsistent.
  - **Batch by family** (buttons, form inputs, cards), not all components at once, so each confirmation stays reviewable.
- [ ] Watch for a second use case (CardHorizontal / Card). The ADR-023 test decides whether another component gets parts.
- [ ] Refresh the `docs/*-case-study.html` write-ups if they reference CardVertical's API.

## Verification (end to end)

1. Homepage and CourseOverview screenshots are unchanged. The preset is a pure refactor.
2. Storybook: all 10 compositions render in light and dark and in both brands. Keyboard-only run-through of Favorite and Menu.
3. `npm run layout:validate` passes a layout that uses `CardVertical.Root`, and fails a layout that uses `CardVertical.Bogus` or `<CardVertical.Body gap="lg">` (the latter is a TypeScript error).
4. `run-ledger.json` gains the PR 3 review run.
