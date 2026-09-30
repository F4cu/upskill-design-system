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

- [ ] Read Curtis, "Subcomponents" and "Space in Design Systems" (Medium blocked WebFetch, so the developer pastes the text). Adjust the ADR text if either contradicts the open-part / no-gap model.

## PR 1: convention + tooling (branch `subcomponents/foundations`)

This PR has no component changes. It makes parts a first-class concept so the later PRs pass the gates.

- [ ] **ADR-023 — subcomponents and compound components** (`docs/decisions/023-subcomponents-compound-components.md`, from `000-template.md`). It covers:
  - when to split: a second real use case, run through the ADR-009 three-question test
  - dot namespace + context guard
  - preset + parts ("common configurable, uncommon composable")
  - fixed / slot / open part kinds, and the no-margin rule
  - the naming contract with Figma
  - sources: Braid, React Spectrum, Curtis slots, the ds101 pages
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

## PR 4: Figma alignment (interactive, developer present; Figma MCP `use_figma`)

- [ ] Audit node `52:4270` first (`get_metadata`) and record its current property and layer names in this file before changing anything.
- [ ] Rename layers to part names.
- [ ] Properties: `Size` variant (sm/lg); `Action` instance swap (None / Favorite / Menu); `Favorite › Pressed` boolean; `Menu › Expanded` boolean (design-only state); `Certified` boolean; `Progress` layer toggle; text properties for `Title` / `Duration`.
- [ ] Add a Button `elevated` round variant with `heart` / `more-vertical` in Figma.
- Nothing to commit unless drift notes change. Update the `figma-file-variable-drift` memory if any representational divergence appears. Code Connect is Enterprise-gated, so it's out of scope.

## After: follow-up issues (file, don't do)

- [ ] System-wide property naming audit: one vocabulary (`variant`/`size`/`shape`), plus a deterministic script comparing metadata `variants` with Figma component properties.
- [ ] Watch for a second use case (CardHorizontal / Card). The ADR-023 test decides whether another component gets parts.
- [ ] Refresh the `docs/*-case-study.html` write-ups if they reference CardVertical's API.

## Verification (end to end)

1. Homepage and CourseOverview screenshots are unchanged. The preset is a pure refactor.
2. Storybook: all 10 compositions render in light and dark and in both brands. Keyboard-only run-through of Favorite and Menu.
3. `npm run layout:validate` passes a layout that uses `CardVertical.Root`, and fails a layout that uses `CardVertical.Bogus` or `<CardVertical.Body gap="lg">` (the latter is a TypeScript error).
4. `run-ledger.json` gains the PR 3 review run.
