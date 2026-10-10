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
- **Type-enforced anti-patterns:** When a component's metadata documents a hard constraint (e.g. "never pass onClick", "never set color directly"), the prop type must make the violation a TypeScript error, not just a documented anti-pattern — narrow the spread native-attributes type (e.g. `Omit<HTMLAttributes<...>, 'onClick' | 'color' | ...>`) to exclude the attributes the component already owns or forbids, rather than only excluding `children`.

## State model (ADR-025)

A "state" is one of three kinds; each has a different home. Never collapse them into one `state` prop.

| Kind | Examples | Code | Figma |
|---|---|---|---|
| Interaction | hover, focus, active | CSS pseudo-classes only — never a prop | `State` variant property (preview only) |
| Lifecycle / data | in progress, completed | Derived from a data prop (`progress={100}` → completed); a `status` enum only when not derivable | Property named for its axis (`Status`), never `State` |
| Content | empty image, no meta, long title | Fallback when a prop is omitted (no `src` → placeholder) — never a `showX`/`empty` flag | One example per fallback |

- **Exception — interaction state that is app data** (`pressed`, `disabled`, `open`, a container's `value`): a controlled prop with `on*Change`, plus `default*` when uncontrolled use makes sense (see `CardVertical.Favorite`; `Chip` is controlled only).
- **One enum, not several booleans** for mutually exclusive states (`status: 'notStarted' | 'inProgress' | 'completed'`, never `isStarted` + `isCompleted`).
- **Naming:** see "Prop vocabulary" below. `State` is reserved for the interaction axis in Figma.
- **`active` ≠ `pressed`:** `active` is the momentary press (`:active:not(:disabled)`, `*.active` tokens, Figma `State=Active`) on every interactive component; `pressed` is only the persistent `aria-pressed` toggle prop. Orthogonal: a toggle has both (ADR-025 amendment).
- Every lifecycle and content state appears in metadata `states` and has a story.

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

**Figma:** same names, values and defaults; only casing differs (`trailingIcon` ↔ `Trailing icon`, `variant` ↔ `Variant`). A slot property is named after its code prop: the one default slot is `Children`, other slots take their part's name (`Body`, `Meta`). Recorded mappings only: optional prop omitted ↔ `Has <x>` (default `false`); pseudo-classes ↔ `State` (preview); label `children` ↔ `Text`; CardVertical `progress` ↔ `Status` (preview). Figma-only properties are listed in ADR-026. A state that changes both the parent and a nested part is a parent variant whose variants differ only in that state, with the nested instance not bound to a swap property (ADR-026). Event handlers, `default*`, `className` and `id` are code-only. Known drift awaiting migration is listed in ADR-026; don't copy it into new components.

## Subcomponents (ADR-023)

Parts (`<Parent.Part>`) are not new components: no folder, not in the fixed set, declared only in the parent's `composition.parts`. Only split into parts when a second real use case would otherwise create invalid prop combinations (ADR-023 test, after ADR-009).

- **Preset + parts:** the plain `<Parent …props />` stays and is rebuilt from the parts; existing props never break. The uncommon case gets parts, not another `*Slot`/`render*`/`hide*` prop.
- **Namespace + guard:** attach parts with `Object.assign(Preset, { Root, … })`, never export them individually (export their prop types). `Root` provides context; every other part reads it through a hook that throws `"Parent.X must be rendered inside Parent.Root"`.
- **Kinds:** `fixed` = content/state props only; `slot` = exactly one child from `accepts`; `open` = children from `accepts`, laid out by a primitive with fixed props. Open parts accept `children` only — no `gap`/`align` pass-through, so a layout prop on a part is a type error. Custom spacing = nest a `Stack`/`Inline` inside.
- **No margins:** parts never set outer margins; the container owns spacing between its children.
- **Naming contract:** part names are the Figma layer names; Figma props share names, values and defaults with code; booleans name a state and default to `false`.
- **Figma mirror:** the preset component set keeps its properties; a separate `Parent.Root` component carries `open` parts as native slots (gap bound to the primitive's spacing variable, preferred instances = `accepts`). `fixed` → nested layer/instance, `slot` → instance swap + `Has <x>`. One example frame per non-layout `usage.patterns` id, built from instances only (ADR-023 amendment 2026-10-06).
- **Metadata:** every part in `composition.parts` (validated by `metadata:validate`); every supported composition as a `usage.patterns` entry + story; Storybook meta lists `subcomponents`. Preset baselines must stay pixel-identical when a component adopts parts.

## Storybook setup and story conventions

Storybook lives in this package — it is the documentation layer for coded components. Installed: React + Vite framework, `@storybook/addon-themes` toggling `data-theme` (activates `theme/light` vs `theme/dark` token sets), a custom brand toolbar (global `brand`, toggling `data-brand` — `@storybook/addon-themes` only supports one `withThemeByDataAttribute` instance, so brand switching is a separate `globalTypes` + decorator in `.storybook/preview.ts`), MDX token showcase stories (colors by hue, spacing, typography, radii), visual regression baselines (ADR-019: each component's canonical `--default` story in light+dark, committed PNGs in `packages/components/screenshots/`, perceptual diff via `npm run screenshot:check` / re-baseline with `npm run screenshot:approve` or `npm run screenshot:approve -- --component <Name>` after intentional visual change).

- One story file per component: `ComponentName.stories.tsx` co-located with the component
- Always export a `Default` story; add named variants for meaningful states (not every prop permutation)
- Use `args` + `argTypes` so controls work — no hard-coded prop values in stories
- Dark mode must switch the `data-theme` attribute that activates `theme/dark.json` tokens, not just Storybook's background

## Component metadata model

This convention is shared by `/component-scaffold`, `/layout-generation`, and metadata validation. `*.metadata.json` is validated against `component.schema.json` by `scripts/validate-metadata.js`. Variants are modelled as **named axes**: `variants` is an object keyed by axis name (`variant`, `size`, `shape`, …), each axis holding `{ options, default, purpose }`. A component with a single visual axis uses one key named `variant`; `default` may be `null` for an axis that is off unless set (e.g. Button `shape`). `tokens` keys are fixed: `color`, `spacing`, `typography`, `borderRadius`, `other`. `component.category` ∈ `atom|molecule|organism|layout`, `component.type` ∈ `interactive|display|container|input`, `component.status` ∈ `beta|ready|deprecated`. `composition.accepts`/`containedBy` and `usage.patterns` are required for layout generation.

After scaffolding or editing a component, `npm run metadata:validate`, `npm run typecheck`, `npm run build`, `npm run a11y:coverage`, and `npm run a11y:test` must all pass with no manual changes, and it must render in both light and dark themes in Storybook (`components-check.yml` runs these on every PR). Following the pattern needs no ADR; a deviation — a new variant-axis convention, a token category the schema lacks, or a change to the schema itself — requires recording or amending an ADR before merging.

## Two-tier a11y (ADR-008), plus a token-level contrast check and a story axe sweep (ADR-008 amendments)

Tier 1 is static `jsx-a11y` lint (`npm run lint`), default for all components. Tier 2 is a **behavioral** a11y test — a co-located `<Name>.a11y.test.tsx` (Vitest + Testing Library + `vitest-axe`, jsdom) asserting the dynamic ARIA contract (state attributes toggling, focus, keyboard) plus an axe scan — required **only for interactive components**. `scripts/a11y-coverage.js` derives interactivity from metadata (`component.type ∈ {interactive, input}`, an interactive ARIA `role`, or a keyboard contract beyond plain Tab / native scroll) and fails if an interactive component lacks its test. Non-interactive components (display/landmark, e.g. `Badge`, `Divider`) need none. Model new tests on `Button/Button.a11y.test.tsx`; disable axe's `color-contrast` rule (jsdom can't judge layout/colour). `scripts/a11y-backlog.json` is a shrinking ledger waiving pre-existing interactive components pending backfill; never add a new component to it.

Underneath both tiers, `npm run a11y:stories` (issue #72, ADR-008 amendment 2026-07-14) runs an automatic axe sweep over **every story's initial render**: `src/a11y-stories.sweep.test.tsx` composes all `*.stories.tsx` via portable stories (preview decorators applied) in jsdom, `color-contrast` disabled. Zero per-component maintenance — a new story is axe-checked in CI (`components-check.yml`) with no test file. If a story legitimately renders a component in an incomplete isolation, put the exclusion on the story (`parameters.a11y.test: 'off'` to skip, or `parameters.a11y.config.rules` to override a rule) rather than weakening the sweep. The sweep does not replace Tier-2 behavioral tests (axe can't see keyboard/focus/state toggling) and doesn't change what `a11y:coverage` tracks.

The color-contrast gap that leaves open (jsdom can't compute it) is covered separately and automatically: `npm run tokens:contrast-check` (`scripts/token-contrast-check.js`) computes WCAG relative-luminance contrast ratios against the **built** `dist/css/theme.{light,dark}.css`, for a hand-curated set of foreground/background pairs reflecting how components actually render (not every token combination that could theoretically occur — see the file's header comment for why an automated CSS-co-occurrence derivation was tried and rejected). Wired into `tokens-check.yml` on every PR touching token source. Add a pair to the curated `PAIRS` list when a component changes what text/icon/border color renders against what background. Known, tracked failures live in `scripts/token-contrast-waivers.json` (same shrinking-ledger convention as the a11y backlog) rather than being silently dropped or silently forced through a token change.
