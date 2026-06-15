# Component scaffold

**Trigger:** Developer, when starting a new component from the fixed set.

**Fixed component set:** `Box`, `Stack`, `Inline`, `Text`, `Heading`, `Icon`, `Button`, `TextField`, `Select`, `Checkbox`, `Card`. Do not scaffold anything outside this list.

**When to use:** The component doesn't exist yet in `packages/components/src/` and you have a Figma node URL for it.

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
2. Fill the metadata schema fields from what you observe in Figma. Anti-patterns must reference only components in the fixed set. Variant names must match Figma exactly.
3. Produce the component folder at `packages/components/src/ComponentName/`:
   - `index.tsx` — typed props matching the schema's `variants.options` and `states`; no hard-coded design values; import CSS module for class names
   - `ComponentName.module.css` — one rule per variant + state combination; only `var(--ds-*)` custom properties, never raw values
   - `ComponentName.stories.tsx` — `Default` story plus one named story per meaningful visual state; `args` + `argTypes` for controls
   - `ComponentName.metadata.json` — completed metadata file conforming to the schema
4. Produce a Code Connect mapping: the Figma node ID → the coded component path, with variant prop mappings where Figma variant names differ from code prop values.

## Output

The four files above, ready to write to disk. No placeholder values — every field must be filled from Figma context or left with an explicit `TODO:` comment explaining what's missing and why.

## Success signal

`npm run build` and `npm run storybook` both pass with no manual restructuring. The component renders in both light and dark themes. The metadata file validates against `component.schema.json`.
