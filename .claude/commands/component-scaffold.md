---
description: Scaffold a new component from the fixed set — generate its index.tsx, CSS module, stories, and metadata.json from the schema, an existing component as template, and Figma design context. Use when starting a component that does not yet exist in packages/components/src/.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, mcp__claude_ai_Figma__get_design_context, mcp__claude_ai_Figma__get_metadata, mcp__claude_ai_Figma__get_screenshot, mcp__claude_ai_Figma__get_variable_defs
---

# Component scaffold

**Trigger:** Developer, when starting a new component from the fixed set.

**Fixed component set:** the canonical list lives in CLAUDE.md → "Component scope" (single source — do not copy it here). Do not scaffold anything outside that list.

**When to use:** Quick exploration or interactive Figma-driven scaffolding when you have a Figma node URL and want files without running the full loop. For a component going to `main`, use `/add-component` instead — it wraps this step in a gate and adversarial review. Running scaffold alone means agent-written code reaches human review unverified.

## Inputs (read all before starting)

- Metadata schema — `packages/components/component.schema.json`
- Existing component as structural template — pick the closest one in `packages/components/src/` (e.g. for Button use an interactive component; for Card use a container component)
- Figma design context — use Figma MCP (`get_design_context` on the component's Figma node) to read variants, states, token usage, and layout

## Steps

1. Read the Figma node to extract:
   - Variant names and their visual purpose
   - Interactive states (hover, focus, disabled, loading, etc.)
   - Which semantic tokens map to which visual properties (background, text, border, radius, spacing)
   - Layout behavior (fixed/hug width, inline vs block, can nest)

   **Line-height translation rule:** Figma stores line-heights as px values and names them `font/line-height/<scale>-<ratio>` (e.g. `body-small-none`, `title-medium-tight`). The px value is a representational artifact — Figma can't store unitless ratios (ADR-002, accepted divergence). Always ignore the scale prefix and map the trailing ratio label to the code token: `none` → `--ds-font-line-height-none` · `tight` → `--ds-font-line-height-tight` · `default` → `--ds-font-line-height-default` · `relaxed` → `--ds-font-line-height-relaxed` · `loose` → `--ds-font-line-height-loose`. Never use the raw px value from Figma.

   **Spacing translation rule:** The Figma output names gap variables like `gap-[var(--space/inline/md, 16px)]`. Map the segment after `--space/` directly to the gap token name — `inline/md` → `gap="md"`, `stack/xs` → `gap="xs"`. Never substitute a different scale step or use the fallback px value as a guide. Do not add wrapper elements that aren't in the Figma layout — siblings in a Figma flex row stay siblings in code.
2. Fill the metadata schema fields from what you observe in Figma. Anti-patterns must reference only components in the fixed set. Variant names must match Figma exactly.
3. Determine the component name before creating any files. **Naming rule: noun first, then variant/modifier** — `Button`, `ButtonArrow`; `Card`, `CardHorizontal`, `CardVertical`. Never reverse this (`ArrowButton`, `HorizontalCard`). This keeps variants grouped together in directory listings and matches the existing library convention.
4. Produce the component folder at `packages/components/src/ComponentName/`:
   - `index.tsx` — typed props matching the metadata's variant axes (one prop per `variants.<axis>`, typed to that axis's `options`) and `states`; no hard-coded design values; import CSS module for class names
   - `ComponentName.module.css` — one rule per variant + state combination; only `var(--ds-*)` custom properties, never raw values
   - `ComponentName.stories.tsx` — `Default` story plus one named story per meaningful visual state; `args` + `argTypes` for controls. **Storybook title rule:** layout primitives (`category: layout` in metadata) use `title: 'Layout/ComponentName'`; everything else uses `title: 'Components/ComponentName'`.
   - `ComponentName.metadata.json` — completed metadata file conforming to the schema
5. Record the Figma node ID in the metadata file's `figmaNodeId` field. Code Connect is out of scope — it requires a Figma Organization or Enterprise plan (see ADR on this). Do not generate Code Connect files.

## Output

The four files above, ready to write to disk. No placeholder values — every field must be filled from Figma context or left with an explicit `TODO:` comment explaining what's missing and why.

## Success signal

`npm run build` and `npm run storybook` both pass with no manual restructuring. The component renders in both light and dark themes. The metadata file validates against `component.schema.json`.
