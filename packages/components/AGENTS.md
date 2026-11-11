# Component conventions

Tier 1 conventions for `packages/components/` (ADR-029). Agents that read nested `AGENTS.md` load this when working here; Claude Code loads it through the sibling `CLAUDE.md`. Cross-cutting invariants (fixed set, ADR-009 test, layout grammar) live in the root `AGENTS.md`.

## CSS Modules

- One `.module.css` file per component, co-located with the component
- Only reference SD-output custom properties (`var(--token-name)`) — never raw values
- Class names use `camelCase` inside the module (e.g. `.primaryButton`)
- No global styles in component modules — globals (reset, base typography, grid) live in `packages/components/src/styles/`
- Never set `outline: none` on a focusable element: the focus ring is one global `:focus-visible` rule in `reset.css`, built from `color.border.focus` and `size.focus.*` (ADR-028). A component may add a focus cue (a border colour) but never replace the ring. Exception: menu items, which show focus with a background highlight

## Component implementation rules (scaffold and layout generation)

- **Typography:** Any string prop that renders as visible UI text (title, subtitle, label, description, and similar) must be passed through `<Text>` or `<Heading>` — never rendered as a raw string, `<span>`, or `<p>`. Use `as` on the typography component to adjust the semantic element when needed. The exact `size` and `color` values are component-specific — read the component's spec (`anatomy[].builtOnProps`, `constraints`).
- **Icon color:** `<Icon>` inherits its color via `currentColor`. Never set a color prop or inline style directly on `<Icon>`. Apply the semantic color token on the ancestor element that owns the color context. The specific token is documented in the composing component's spec (`styles`, `decisions`).
- **Component-specific rules:** Before generating a component's JSX, read its `usage.json` (`notFor`, `composition.donts`, `composition.limits`) and its spec's `constraints` and `decisions`. Usage holds wrong picks and composition don'ts; the spec holds prop rules and how the component is built (ADR-001 amendment 2026-11-10).
- **One prop per datum:** a new piece of visible content gets its own semantically named prop (`author`), never a prefix packed into an existing string prop. Separators between values are rendered by the component (`aria-hidden`), never typed by consumers (ADR-023 amendment 2026-10-02).
- **Native buttons default `type="button"`:** a component that wraps `<button>` sets `type="button"` internally and lets consumers opt in to `submit`, as Button, Chip and ButtonArrow do. An unset type submits the enclosing form.
- **Part markers (ADR-030):** each spec anatomy part's element sets `data-part="<Name>"` before `{...rest}`, so a parent's part name wins; `anatomy:test` checks it.
- **Type-enforced anti-patterns:** When a component's spec documents a hard constraint (e.g. "never pass onClick", "never set color directly"), the prop type must make the violation a TypeScript error, not just a documented anti-pattern — narrow the spread native-attributes type (e.g. `Omit<HTMLAttributes<...>, 'onClick' | 'color' | ...>`) to exclude the attributes the component already owns or forbids, rather than only excluding `children`.

## State model (ADR-025)

States are grouped by who sets them, each with its own home; never one `state` prop.

- **Interactive** (hover, focus, `active`): CSS pseudo-classes only. Figma `State` variant, preview only; nothing else goes in `State`. `active` is the momentary press (`:active:not(:disabled)`, `*.active` tokens) on every interactive component except `TextField`/`Select`; `pressed` is only the persistent `aria-pressed` toggle. A toggle has both.
- **Configured** (props): controlled (`<x>` / `default<X>` / `on<X>Change`, with `default*` only when uncontrolled use makes sense; `Chip` is controlled only), flags (`disabled`, `current`, `loading`), data-derived (`progress` → completed, else a `status` enum), content (an omitted prop shows the fallback; no `showX`/`empty`). Mutually exclusive states are one enum, never several booleans. Figma: one property per prop, named like it (`Disabled` first); `Disabled` is built only at `State=Default`. `loading` is orthogonal to `status` and sets `aria-busy`; a skeleton is internal (no `Skeleton` component).
- **Derived** (`aria-*`, `data-*`): computed from props, never a prop (`aria-pressed` ← `pressed`, `aria-invalid` ← `error`, `aria-busy` ← `loading`). Code-only.
- Every lifecycle, async and content state appears in the spec's `states` and has a story.

## Prop vocabulary (ADR-026)

One concept, one name; the full row list, with a concept name per row, is ADR-026's table. Reuse these; any other name is a **new term** with a reason in the `/component-scaffold` API proposal. `spec:validate` enforces the mechanical rules (banned names and prefixes, `false`-default booleans, `on<Verb>` callbacks, the controlled triple, collection names, `size`/`shape`/`orientation` values, Figma names equal up to casing, a prop's name fitting its spec `concept`, whose values are the schema enum); its exceptions are in `scripts/prop-vocabulary-waivers.json`. Enum values are camelCase.

| Concept | Name |
|---|---|
| Visual weight/style | `variant`: values name the look, not a rank (ADR-024); `default` only as the baseline of a surface/context axis, never on an emphasis axis |
| Size · corners · layout axis · glyph | `size` (`sm`/`md`/`lg`, only the steps it has; typography takes type-scale names) · `shape` · `orientation` · `direction` (glyph only) |
| Lifecycle | `status` enum, derived from data when possible |
| Controlled state | `value` (custom widget; a group that owns the choice holds it on the container), `open` (disclosure, popover, menu), `pressed` (`aria-pressed`, filter chips included), `current` (`aria-current` on a link item). Native-input wrappers keep native names (`value`/`checked` + `onChange`) |
| Discrete event | `on<Verb>` / `on<Part><Verb>` (`onSelect`, `onUserMenuSelect`) |
| Boolean | Bare adjective or participle (`disabled`, `certified`, `fullWidth`); exception `hideLabel` (the label stays for assistive technology) |
| Accessible name · error | `label` (visible label, else the `aria-label`) · `error` (message string) |
| Content · image · collection · icon · element | `children` for wrappers or single free-form content, otherwise one named prop per datum · `src`/`alt`, part-prefixed on composites (`thumbnailSrc`) · `items` (`<part>Items` when several; form inputs keep `options`) · `icon`/`trailingIcon` · `as` · `headingLevel` · `href` |

**Figma** mappings beyond casing: an omitted optional prop or part ↔ `Has <x>` (default `false`); label `children` ↔ `Text`; the default slot is `Children`, other slots take their part's name; CardVertical `progress` ↔ `Status` (preview). Figma-only properties, and the parent-variant rule for a state that also changes a nested part: ADR-026. Event handlers, `default*`, `className` and `id` are code-only.

## Subcomponents (ADR-023)

Parts (`<Parent.Part>`) are not new components: no folder, not in the fixed set, declared only in the parent's `composition.parts`. Only split into parts when a second real use case would otherwise create invalid prop combinations (ADR-023 test, after ADR-009).

- **Preset + parts:** the plain `<Parent …props />` stays and is rebuilt from the parts; existing props never break. The uncommon case gets parts, not another `*Slot`/`render*`/`hide*` prop.
- **Namespace + guard:** attach parts with `Object.assign(Preset, { Root, … })`, never export them individually (export their prop types). `Root` provides context; every other part reads it through a hook that throws `"Parent.X must be rendered inside Parent.Root"`.
- **Kinds:** `fixed` = content/state props only; `slot` = exactly one child from `accepts`; `open` = children from `accepts`, laid out by a primitive with fixed props. Open parts accept `children` only — no `gap`/`align` pass-through, so a layout prop on a part is a type error. Custom spacing = nest a `Stack`/`Inline` inside.
- **No margins:** parts never set outer margins; the container owns spacing between its children.
- **Naming contract:** part names are the Figma layer names; Figma props share names, values and defaults with code; booleans name a state and default to `false`.
- **Figma mirror:** the preset component set keeps its properties; a separate `Parent.Root` component carries `open` parts as native slots (gap bound to the primitive's spacing variable, preferred instances = `accepts`). `fixed` → nested layer/instance (+ `Has <x>` if optional), `slot` → instance swap + `Has <x>`. One example frame per `composition.patterns` id, built from instances only, in a `* examples` section (ADR-023 amendments 2026-10-06, 2026-11-11). After changing frames, recapture with `node scripts/capture-pattern-frames.js` (figma-cli); `usage:validate` checks the snapshot, and a pattern with no frame needs a waiver in `scripts/figma-pattern-frame-waivers.json`.
- **Usage:** every part in `composition.parts` (validated by `usage:validate`); every supported composition as a `composition.patterns` entry (`{ name, useWhen }`) + a same-named PascalCase export in `<Name>.patterns.stories.tsx`, which holds the code (no trees in usage); Storybook meta lists `subcomponents`. Preset baselines must stay pixel-identical when a component adopts parts.

## Stories, usage, a11y

- **Stories:** one co-located `<Name>.stories.tsx`; always a `Default` story plus named stories for meaningful states (not every permutation); `args` + `argTypes`, no hard-coded prop values; dark mode switches `data-theme`, not just the background. After an intentional visual change, re-baseline with `npm run screenshot:approve -- --component <Name>` (ADR-019). Storybook setup: `/run-storybook`.
- **Usage (`<Name>.usage.json`):** variants are named axes, one per visual prop in the spec (`variants.<axis>` = `{ options, default, useWhen }`; `default: null` means off unless set); omit `variants` when there is no visual prop. Prose follows the writing rules in the schema's top-level `description`; `usage:validate` lints the mechanical part. A wrong pick goes in `notFor` (`instead` = a component, or null + `note`); a composition don't in `composition.donts` (`{ case, because, instead }`), or `composition.limits` / `nests` when it can be counted (`validate-layout` checks those). A prop rule goes in the spec's `constraints`. `states`, `accessibility` and the token list (`styles`) live in `<Name>.spec.json`, never in usage (ADR-027). A rejected option goes in the spec's `ruledOut`; never re-propose it without new evidence. Enums and required fields: `component.usage.schema.json`. A deviation (new axis convention, a token category the schema lacks, a schema change) needs an ADR before merging.
- **A11y (ADR-008):** an interactive component ships a co-located `<Name>.a11y.test.tsx` (`a11y:coverage` enforces it; how to write one: `/add-component` Stage 2). Never add a new component to `scripts/a11y-backlog.json` or a new failure to `scripts/token-contrast-waivers.json`. A story the axe sweep must skip carries the exclusion itself (`parameters.a11y`); never weaken the sweep. When a component changes what text/icon/border colour renders on what background, add the pair to `PAIRS` in `scripts/token-contrast-check.js`.
- **Done:** the root `AGENTS.md` gates pass and the component renders in light and dark.
