# Checkbox — API proposal (auto-approved, `/add-component --eval`)

Design input: brief + `reference.png` (no Figma node). Four states shown: unchecked, checked, disabled unchecked, disabled checked.

## Anatomy

1. **Root** — `<label>`; the whole row is the click target, so clicking the label text toggles the box.
2. **Control** — wrapper holding the box and the glyph.
   - **Box** — the native `<input type="checkbox">` itself, restyled with `appearance: none` (keeps native form participation, keyboard, and the global `:focus-visible` ring).
   - **Check** — `<Icon name="check">`, `aria-hidden`, shown only when checked.
3. **Label** — visible text rendered through `<Text as="span">`.

## Props

| Prop | Concept | Kind | Type | Default | Figma property | Surface |
|---|---|---|---|---|---|---|
| `label` | Accessible name | content | `string` | — (required) | `Text` (recorded mapping) | both |
| `hideLabel` | Boolean (exception `hideLabel`) | content | `boolean` | `false` | — | code-only |
| `checked` | Controlled state (native wrapper keeps native names) | controlled state | `boolean` | — | `Checked` | both |
| `defaultChecked` | Controlled state, uncontrolled seed | native | `boolean` | — | — | code-only |
| `onChange` | Controlled state callback (native name) | event | `ChangeEventHandler<HTMLInputElement>` | — | — | code-only |
| `disabled` | Boolean | native | `boolean` | `false` | `Disabled` | both |
| `name` / `value` / `required` / `form` | Native form participation | native | native | native (`value` → `"on"`) | — | code-only |
| `id` / `className` | Element | native | `string` | generated id / — | — | code-only |
| `...rest` | Native input attributes | native | `Omit<InputHTMLAttributes<HTMLInputElement>, 'type' \| 'children' \| 'size'>` | — | — | code-only |

`type` is owned by the component and omitted from the spread type (type-enforced). `className` lands on the root label, matching TextField.

## Divergences

- No Figma node; Figma property names (`Checked`, `Disabled`, `Text`) are the expected mirror, not observed. Hover/focus are pseudo-classes (`State` preview in Figma, ADR-025).
- No `size` axis: the reference shows one size.
- No `indeterminate` and no `error`: not in the brief; not added.
