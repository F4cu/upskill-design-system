---
description: Scaffold a new component from the fixed set — generate its spec.json, index.tsx, CSS module, stories, and metadata.json from the schemas, an existing component as template, and Figma design context. Use when starting a component that does not yet exist in packages/components/src/.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, mcp__claude_ai_Figma__get_design_context, mcp__claude_ai_Figma__get_metadata, mcp__claude_ai_Figma__get_screenshot, mcp__claude_ai_Figma__get_variable_defs
---

# Component scaffold

**Trigger:** Developer, when starting a new component from the fixed set.

**Fixed component set:** the canonical list lives in AGENTS.md → "Components" (single source — do not copy it here). Do not scaffold anything outside that list.

**When to use:** Quick exploration or interactive Figma-driven scaffolding when you have a Figma node URL and want files without running the full loop. For a component going to `main`, use `/add-component` instead — it wraps this step in a gate and adversarial review. Running scaffold alone means agent-written code reaches human review unverified.

## Inputs (read all before starting)

- Metadata schema — `packages/components/component.schema.json` (selection and composition guidance only)
- Spec schema — `packages/components/component.spec.schema.json` (ADR-027): the build contract you write before any code
- Existing component as structural template — pick the closest one in `packages/components/src/` (e.g. for Button use an interactive component; for Card use a container component)
- Spec template — read `<Template>.spec.json` of the closest component that has one: `Button` for a single-element component, `CardVertical` for a compound one with parts (ADR-023). Until the ADR-027 backfill only these two exist; the template shows the shape and level of detail, not content to copy
- Prop vocabulary — `packages/components/AGENTS.md` → "Prop vocabulary" (ADR-026)
- Figma design context — use Figma MCP (`get_design_context` on the component's Figma node) to read variants, states, token usage, and layout

## Steps

1. Read the Figma node to extract:
   - Variant names and their visual purpose
   - Interactive states (hover, focus, disabled, loading, etc.)
   - Which semantic tokens map to which visual properties (background, text, border, radius, spacing)
   - Layout behavior (fixed/hug width, inline vs block, can nest)

   **Line-height translation rule:** Figma stores line-heights as px values and names them `font/line-height/<scale>-<ratio>` (e.g. `body-small-none`, `title-medium-tight`). The px value is a representational artifact — Figma can't store unitless ratios (ADR-002, accepted divergence). Always ignore the scale prefix and map the trailing ratio label to the code token: `none` → `--ds-font-line-height-none` · `tight` → `--ds-font-line-height-tight` · `default` → `--ds-font-line-height-default` · `relaxed` → `--ds-font-line-height-relaxed` · `loose` → `--ds-font-line-height-loose`. Never use the raw px value from Figma.

   **Spacing translation rule:** The Figma output names gap variables like `gap-[var(--space/inline/md, 16px)]`. Map the segment after `--space/` directly to the gap token name — `inline/md` → `gap="md"`, `stack/xs` → `gap="xs"`. Never substitute a different scale step or use the fallback px value as a guide. Do not add wrapper elements that aren't in the Figma layout — siblings in a Figma flex row stay siblings in code.
2. Determine the component name before creating any files. **Naming rule: noun first, then variant/modifier** — `Button`, `ButtonArrow`; `Card`, `CardHorizontal`, `CardVertical`. Never reverse this (`ArrowButton`, `HorizontalCard`). This keeps variants grouped together in directory listings and matches the existing library convention.
3. **API proposal — stop for approval before writing any file** (ADR-026). Output the following and wait for the developer to approve or edit it:
   - **Anatomy:** named parts and layers, top to bottom. These names become the Figma layer names (and `composition.parts` if the component has parts, ADR-023).
   - **Props table:**

     | Prop | Concept | Kind | Type | Default | Figma property | Surface |
     |---|---|---|---|---|---|---|
     | `size` | Size | variant axis | `'sm' \| 'md'` | `'md'` | `Size` | both |
     | `onValueChange` | Controlled state | event | `(value: string) => void` | — | — | code-only |

     *Concept* is a row of `packages/components/AGENTS.md` → "Prop vocabulary", or **new term** with a one-line reason. *Kind* ∈ variant axis · lifecycle · content · controlled state · event · native. *Surface* ∈ both · code-only · Figma-only (`State`, `Has <x>`).
   - **Constraints:** prop combinations the component requires or forbids (icon-only needs an accessible name), each with what will enforce it (type, test, lint) or none yet.
   - **States:** every state grouped by who sets it (ADR-025: interaction, appData, lifecycle, content) with its trigger.
   - **Accessibility:** role, ARIA attributes, keyboard interactions.
   - **Divergences:** every Figma property or value that differs from code by more than casing, and every departure from the vocabulary. Each one is a recorded mapping (ADR-026) or gets fixed; none passes silently.

   Inside `/add-component` this checkpoint is part of Stage 1. The approved names are final for steps 4–6. Under `/add-component --eval` it is auto-approved: write the proposal to `api-proposal.md` and continue (see that command's "Eval mode").
4. **Write `<Name>.spec.json` now, from the approved proposal, before any code** (ADR-027). Create the component folder `packages/components/src/components/<Name>/` and write the spec against `component.spec.schema.json`: `anatomy` and `props` from the proposal tables (prop `kind` per the schema enum; Figma surface, property and set per prop), `constraints`, `states`, `accessibility`, `figma` (sets and recorded divergences), and `styles` from the Figma token mapping of step 1: part → rules of `when` (prop values and `state`) → CSS property → token path. A raw value needs `{ literal, reason }`. The spec states what the component must be; it is not a description of code you have not written. Do not list tokens separately: the spec's `styles` are the component's token list.
5. Fill the metadata schema fields from the approved API proposal and what you observe in Figma: `component`, `usage`, `variants`, `composition` only. Leave out `states`, `tokens` and `accessibility`: the spec owns them and `metadata:validate` fails if metadata repeats them. Anti-patterns must reference only components in the fixed set. Variant and prop names match the approved table; Figma differs only by casing or a recorded mapping.
6. Produce the rest of the component folder:
   - `index.tsx` — typed props matching the spec's `props` (a variant axis is typed to the same `options` as `variants.<axis>` in metadata) and `states`; no hard-coded design values; import CSS module for class names
   - `ComponentName.module.css` — one rule per variant + state combination in the spec's `styles`; only `var(--ds-*)` custom properties, never raw values
   - `ComponentName.stories.tsx` — `Default` story plus one named story per meaningful visual state; `args` + `argTypes` for controls. **Storybook title rule:** layout primitives (`category: layout` in metadata) use `title: 'Layout/ComponentName'`; everything else uses `title: 'Components/ComponentName'`.
   - `ComponentName.metadata.json` — written in step 5.
   - Then reconcile: run `npm run tokens:build && npm run spec:validate`. It checks the spec against the code (props, defaults, variant options, the `--ds-*` properties the CSS reads, cross-references). Fix the code when the spec is right. When building showed the spec is wrong, amend the spec first, say so in your summary, and re-run. Never edit the spec only to make a failure go away. For a component that already exists without a spec (backfill, not a new component), do not write one by hand: run `npm run spec:generate -- <Name>`, which drafts `props`, anatomy, states and `styles` from the code and leaves `TODO`s for what code cannot say.
7. Record the Figma node ID in the metadata file's `figmaNodeId` field. Code Connect is out of scope — it requires a Figma Organization or Enterprise plan (see ADR on this). Do not generate Code Connect files.

## Output

The five files above (spec first), ready to write to disk. No placeholder values — every field must be filled from Figma context or left with an explicit `TODO:` comment explaining what's missing and why.

## Success signal

For a standalone run (outside `/add-component`), the standard deterministic gate passes:

```bash
npm run metadata:validate && npm run typecheck && npm run build && npm run spec:validate && npm run a11y:coverage && npm run a11y:test
```

`npm run storybook` renders the component with no manual restructuring, in both light and dark themes.
