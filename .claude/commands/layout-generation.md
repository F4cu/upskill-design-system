---
description: Generate a page or section layout as a React tree using only library components and tokens, with each structural choice justified by component metadata relationships. Use when starting a new page or section from a one-paragraph brief.
---

# Layout generation

**Trigger:** Developer, when starting a new page or section layout.

**When to use:** You have a one-paragraph brief describing what the layout needs to do and what content it contains. No Figma input required — this moment works entirely from metadata and the brief.

## Inputs (read all before starting)

- All component metadata files in `packages/components/src/` (`*.metadata.json`) — focus on `composition.accepts`, `composition.containedBy`, `usage.patterns`, `composition.layoutBehavior`
- Layout brief — provided by the developer in the prompt (intent, key content areas, constraints)

## Constraints (enforce strictly)

- Only use components from the fixed set: `Box`, `Stack`, `Inline`, `Text`, `Heading`, `Icon`, `Button`, `TextField`, `Select`, `Checkbox`, `Card`
- Every structural choice must cite the metadata rule that justifies it:
  - `accepts` — a component can only contain what its metadata says it accepts
  - `containedBy` — a component can only appear inside what its metadata says allows it
  - `usage.patterns` — prefer named patterns over ad-hoc composition when one fits
  - `layoutBehavior.widthBehavior` — determines whether a component fills its container or hugs its content
- No ad-hoc CSS, no inline styles, no components outside the fixed set, no layout decisions without a metadata justification

## Steps

1. Read the brief and identify the content areas (e.g. header, form, action row).
2. For each area, select the appropriate layout primitive (`Stack` for vertical, `Inline` for horizontal, `Box` for padding/containment, `Card` for grouped content).
3. For each leaf node, select the appropriate component and variant — cite the `when` or `usage.patterns` field that justifies the choice.
4. Validate the tree against `accepts`/`containedBy` constraints before outputting.
5. Annotate each node in the output with the metadata rule that placed it there.

## Output

When producing a Storybook story file (`src/stories/Name.stories.tsx`), follow this structure exactly — no deviations:

```tsx
const meta = {
  title: 'Layout/Examples/Name',
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'One-sentence description of what this layout demonstrates.' } },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = { render: () => <LayoutComponent />, tags: ['!dev'] }
```

Rules:
- **One named export only** (`Default`). Multiple exports create expandable sidebar children, which breaks the flat `Layout/Examples` listing. If multiple variants are needed, compose them into a single render function (e.g. two sections separated by a `Divider`).
- **`tags: ['!dev']`** on every story export — suppresses the Canvas tab, keeps only the Docs view.
- **`satisfies Meta`** on the meta object (not `as Meta`).
- Place the file in `packages/components/src/stories/`, not inside a component folder.

A React component tree as JSX, with inline comments citing metadata justification:

```tsx
// Stack: widthBehavior=fill, layout primitive for vertical content areas
<Stack gap="md">
  {/* Heading: containedBy includes Stack */}
  <Heading level={2}>Settings</Heading>

  {/* Card: compositionPattern "settings-section" — groups related form fields */}
  <Card>
    <Stack gap="sm">
      {/* TextField: containedBy includes Stack, Card */}
      <TextField label="Display name" />
      <TextField label="Email" />
    </Stack>
  </Card>

  {/* Inline: compositionPattern "form-actions-row" from Button metadata */}
  <Inline justify="end">
    <Button variant="outlined">Cancel</Button>
    <Button variant="default">Save changes</Button>
  </Inline>
</Stack>
```

## Success signal

The tree passes a manual `accepts`/`containedBy` check (no component contains something its metadata forbids), the JSX builds without errors, and it renders in Storybook with no manual restructuring. If restructuring is needed, the metadata that failed to prevent the error must be updated before this moment is used again.
