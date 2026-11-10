# Component conventions

Tier 1 conventions for `packages/components/` (ADR-029). Agents that read nested `AGENTS.md` load this when working here; Claude Code loads it through the sibling `CLAUDE.md`. Cross-cutting invariants (fixed set, ADR-009 test, layout grammar) live in the root `AGENTS.md`.

## CSS Modules

- One `.module.css` file per component, co-located with the component
- Only reference SD-output custom properties (`var(--token-name)`) — never raw values
- Class names use `camelCase` inside the module (e.g. `.primaryButton`)
- No global styles in component modules — globals (reset, base typography, grid) live in `packages/components/src/styles/`
- Never set `outline: none` on a focusable element: the focus ring is one global `:focus-visible` rule in `reset.css`, built from `color.border.focus` and `size.focus.*` (ADR-028). A component may add a focus cue (a border colour) but never replace the ring. Exception: menu items, which show focus with a background highlight

## Component implementation rules (scaffold and layout generation)

- **Typography:** Any string prop that renders as visible UI text (title, subtitle, label, description, and similar) must be passed through `<Text>` or `<Heading>` — never rendered as a raw string, `<span>`, or `<p>`. Use `as` on the typography component to adjust the semantic element when needed. The exact `size` and `color` values are component-specific — read the component's `usage.antiPatterns` in its metadata for the correct values.
- **Icon color:** `<Icon>` inherits its color via `currentColor`. Never set a color prop or inline style directly on `<Icon>`. Apply the semantic color token on the ancestor element that owns the color context. The specific token is documented in the composing component's `usage.antiPatterns`.
- **Component-specific rules:** Before generating a component's JSX, read its `usage.antiPatterns` — they capture both usage mistakes and implementation constraints (e.g. which library component to use for a prop, which token to apply to a specific element).
- **One prop per datum:** a new piece of visible content gets its own semantically named prop (`author`), never a prefix packed into an existing string prop. Separators between values are rendered by the component (`aria-hidden`), never typed by consumers (ADR-023 amendment 2026-10-02).
- **Part markers (ADR-030):** each spec anatomy part's element sets `data-part="<Name>"` before `{...rest}`, so a parent's part name wins; `anatomy:test` checks it.
- **Type-enforced anti-patterns:** When a component's metadata documents a hard constraint (e.g. "never pass onClick", "never set color directly"), the prop type must make the violation a TypeScript error, not just a documented anti-pattern — narrow the spread native-attributes type (e.g. `Omit<HTMLAttributes<...>, 'onClick' | 'color' | ...>`) to exclude the attributes the component already owns or forbids, rather than only excluding `children`.

## State model (ADR-025)

A "state" belongs to one of three groups, named by who sets it; each has a different home. Never collapse them into one `state` prop.

| Group | Set by | Examples | Code | Figma |
|---|---|---|---|---|
| Interactive | User, at runtime | hover, focus, active | CSS pseudo-classes only, never a prop | `State` variant (preview only); nothing else goes in `State` |
| Configured | App, via props | controlled (`pressed`, `checked`, `open`, `value`); flag (`disabled`, `current`, `loading`); data-derived (`progress` → completed, else a `status` enum); content (omitted prop → fallback, no `showX`/`empty`) | Controlled: `<x>` / `default<X>` / `on<X>Change`. Flag: bare boolean, default `false` | One property per prop, named like it (`Disabled` first, `Pressed`, `Status`), never a `State` value |
| Derived | Component | `aria-*`, `data-*` | Computed from props, never a prop. `aria-pressed` ← `pressed`, `aria-invalid` ← `error`, `aria-busy` ← `loading` | None (code-only) |

- **`disabled` is a flag, not interaction**: Figma `Disabled` boolean, built only at `State=Default`. **`loading` is a flag, orthogonal to `status`**: sets `aria-busy`; a skeleton is internal to the component, no `Skeleton` component. Full rules and the state mapping table: ADR-025 amendment 2026-10-11.
- **Controlled state detail** (`pressed`, `open`, a container's `value`): a controlled prop with `on*Change`, plus `default*` when uncontrolled use makes sense (see `CardVertical.Favorite`; `Chip` is controlled only).
- **One enum, not several booleans** for mutually exclusive states (`status: 'notStarted' | 'inProgress' | 'completed'`, never `isStarted` + `isCompleted`).
- **Naming:** see "Prop vocabulary" below. `State` is reserved for the interaction axis in Figma.
- **`active` ≠ `pressed`:** `active` is the momentary press (`:active:not(:disabled)`, `*.active` tokens, Figma `State=Active`) on every interactive component except `TextField`/`Select` (no press meaning on a text input or native select); `pressed` is only the persistent `aria-pressed` toggle prop. Orthogonal: a toggle has both (ADR-025 amendment).
- Every lifecycle, async and content state appears in the spec's `states` and has a story.

## Prop vocabulary (ADR-026)

One concept, one name across the fixed set. Enum props are axis nouns with camelCase values. Reuse these names; any other prop name is a **new term** and needs a reason in the `/component-scaffold` API proposal.

| Concept | Name |
|---|---|
| Visual weight/style | `variant`: values name the look, not a rank (ADR-024). Never `type`/`kind`/`mode`/`style`/`tone`/`appearance`. `default` only as the baseline of a surface/context axis, never on an emphasis axis |
| Size | `size`: `sm`/`md`/`lg` (only the steps it has). Typography components take type-scale names |
| Corners · layout axis · glyph direction | `shape` (`square`/`round`) · `orientation` (`horizontal`/`vertical`) · `direction` (glyph only) |
| Lifecycle | `status` enum, derived from data when possible (ADR-025) |
| Controlled state | `<x>` / `default<X>` / `on<X>Change`, with the callback named after the prop. Canonical `<x>`: `value` (custom widget), `open` (disclosure, popover, menu; never `expanded`/`visible`/a bare `onClose`), `pressed` (`aria-pressed`, filter chips included). `selected` is never an item prop: a group that owns the choice holds `value` on the container. A link item marking the current page or step takes `current` (`aria-current`). Omit `default*` when the caller must always own the state. Native-input wrappers keep native names (`value`/`checked` + `onChange`) |
| Discrete event | `on<Verb>` / `on<Part><Verb>` (`onSelect`, `onUserMenuSelect`). Never `handle*` |
| Boolean | Bare adjective or participle, default `false` (`disabled`, `certified`, `fullWidth`). Never `is*`/`has*`/`show*`. Exception: `hideLabel` (label stays for assistive technology) |
| Accessible name · error | `label` (visible label, else the `aria-label`) · `error` (message string; presence means invalid, no `invalid` flag) |
| Content | `children` for wrappers or single free-form content; one named prop per datum otherwise (`title`, `author`) |
| Image · collection · icon | `src`/`alt`, prefixed by part on composites (`thumbnailSrc`) · `items` (`<part>Items` when there are several; form inputs keep `options`) · `icon` (leading) / `trailingIcon` |
| Element · inner heading · link | `as` (root element) · `headingLevel` (a heading rendered inside the component) · `href` |

**Figma:** same names, values and defaults; only casing differs (`trailingIcon` ↔ `Trailing icon`, `variant` ↔ `Variant`). A slot property is named after its code prop: the one default slot is `Children`, other slots take their part's name (`Body`, `Meta`). Recorded mappings only: optional prop or part omitted ↔ `Has <x>` (default `false`); pseudo-classes ↔ `State` (preview); label `children` ↔ `Text`; CardVertical `progress` ↔ `Status` (preview). Figma-only properties are listed in ADR-026. A state that changes both the parent and a nested part is a parent variant whose variants differ only in that state, with the nested instance not bound to a swap property (ADR-026). Event handlers, `default*`, `className` and `id` are code-only. Known drift awaiting migration is listed in ADR-026; don't copy it into new components.

## Subcomponents (ADR-023)

Parts (`<Parent.Part>`) are not new components: no folder, not in the fixed set, declared only in the parent's `composition.parts`. Only split into parts when a second real use case would otherwise create invalid prop combinations (ADR-023 test, after ADR-009).

- **Preset + parts:** the plain `<Parent …props />` stays and is rebuilt from the parts; existing props never break. The uncommon case gets parts, not another `*Slot`/`render*`/`hide*` prop.
- **Namespace + guard:** attach parts with `Object.assign(Preset, { Root, … })`, never export them individually (export their prop types). `Root` provides context; every other part reads it through a hook that throws `"Parent.X must be rendered inside Parent.Root"`.
- **Kinds:** `fixed` = content/state props only; `slot` = exactly one child from `accepts`; `open` = children from `accepts`, laid out by a primitive with fixed props. Open parts accept `children` only — no `gap`/`align` pass-through, so a layout prop on a part is a type error. Custom spacing = nest a `Stack`/`Inline` inside.
- **No margins:** parts never set outer margins; the container owns spacing between its children.
- **Naming contract:** part names are the Figma layer names; Figma props share names, values and defaults with code; booleans name a state and default to `false`.
- **Figma mirror:** the preset component set keeps its properties; a separate `Parent.Root` component carries `open` parts as native slots (gap bound to the primitive's spacing variable, preferred instances = `accepts`). `fixed` → nested layer/instance (+ `Has <x>` if optional), `slot` → instance swap + `Has <x>`. One example frame per non-layout `usage.patterns` id, built from instances only (ADR-023 amendment 2026-10-06).
- **Metadata:** every part in `composition.parts` (validated by `metadata:validate`); every supported composition as a `usage.patterns` entry + story; Storybook meta lists `subcomponents`. Preset baselines must stay pixel-identical when a component adopts parts.

## Stories, metadata, a11y

- **Stories:** one co-located `<Name>.stories.tsx`; always a `Default` story plus named stories for meaningful states (not every permutation); `args` + `argTypes`, no hard-coded prop values; dark mode switches `data-theme`, not just the background. After an intentional visual change, re-baseline with `npm run screenshot:approve -- --component <Name>` (ADR-019). Storybook setup: `/run-storybook`.
- **Metadata:** variants are named axes (`variants.<axis>` = `{ options, default, purpose }`; a single visual axis is keyed `variant`; `default: null` means off unless set). `states`, `accessibility` and the token list (`styles`) live in `<Name>.spec.json`, never in metadata (ADR-027). A rejected option goes in the spec's `ruledOut`; never re-propose it without new evidence. Enums and required fields: `component.schema.json`. A deviation (new axis convention, a token category the schema lacks, a schema change) needs an ADR before merging.
- **A11y (ADR-008):** an interactive component ships a co-located `<Name>.a11y.test.tsx` (`a11y:coverage` enforces it; how to write one: `/add-component` Stage 2). Never add a new component to `scripts/a11y-backlog.json` or a new failure to `scripts/token-contrast-waivers.json`. A story the axe sweep must skip carries the exclusion itself (`parameters.a11y`); never weaken the sweep. When a component changes what text/icon/border colour renders on what background, add the pair to `PAIRS` in `scripts/token-contrast-check.js`.
- **Done:** the root `AGENTS.md` gates pass and the component renders in light and dark.
