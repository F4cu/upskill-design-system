---
title: "ADR-027 — Component spec file, split from metadata by reader"
---
# ADR-027 — Component spec file, split from metadata by reader

**Date:** 2026-10-07
**Status:** `accepted`
**Amended:** 2026-10-08

## Context

The ds101 page on [component specs](https://f4cu.github.io/ds101/component-specs/) asks a spec for things `<Name>.metadata.json` does not hold:

- **Anatomy:** every named part, with its role and what activating it does. ADR-001 left `anatomy` out on token-cost grounds. Only ADR-023 compound parts are recorded (`composition.parts`), so Button's icon, label and trailing icon are not recorded anywhere.
- **The whole API:** every prop with its type and default, including non-enum and code-only props. `variants` only lists enum axes.
- **Prohibited combinations as data.** Today they are prose. "Requires the icon prop and an aria-label" sits inside `variants.shape.purpose`.
- **A token for each styled value.** `tokens` is a flat list per category. It cannot say which part uses a token, or in which state.
- **Decisions design files cannot show:** Figma property mappings, divergences and the sets a component spans. These live in ADR-026 prose and in memory notes.

ds101 also says "a description informs, a contract arbitrates": a spec is only useful when something checks it.

Two facts about this repo shape the answer:

1. **Metadata has two kinds of reader.** `/layout-generation` reads all 27 metadata files on every run, for `usage`, `variants` and `composition`: how to choose a component and put it together with others. The builder moments (`/component-scaffold`, `/review-component`, `a11y-coverage.js`) read one component at a time, for `states`, `tokens` and `accessibility`: what to build. Every gap above is builder information. Adding it to metadata would make layout generation pay for it 27 times on every run.
2. **ADR-026 already has the "agree before building" step, but nothing keeps its output.** `/component-scaffold` produces an API proposal (anatomy, a props table with Figma surface, divergences) and stops for approval. The approved table lives only in the chat. ADR-026 rejected a `props` section in the metadata schema for two reasons: it would break the ADR-001 contract, and it would duplicate the TypeScript types.

Writing a pilot spec for Button found five problems that nothing reported:

- `metadata.tokens` leaves out two tokens the CSS Module reads: `font.line-height.none` and `border-radius.full`.
- The icon-only rule (`shape` requires `icon` and `aria-label`) is not enforced by the types. The components rules ask for type-enforced anti-patterns.
- Button has no focus style and no focus token; the browser's default ring applies.
- ADR-026 lists Button `shape` as a code prop with no Figma property. In fact icon-only buttons are a separate Figma set, `Button icon` (`54:1192`).
- The `1px` border width is a literal in 15 CSS Modules. No border-width token exists.

The options were:

1. **Extend `component.schema.json`.** This breaks the ADR-001 contract and grows the context `/layout-generation` reads on every run.
2. **A Markdown spec page per component.** ADR-001 already rejected Markdown for agent context. Nothing could validate it, and it would go stale like any doc page.
3. **A separate `<Name>.spec.json` for the builder reader, checked against the code.**

## Decision

Option 3, as a pilot.

### The file

`<Name>.spec.json` sits next to the component and is validated against `packages/components/component.spec.schema.json`. It has these sections:

| Section | Holds |
|---|---|
| `anatomy` | Every named part, internal elements included: element, `builtOn`, `role`, `action`, `required`, `when`. Names follow the ADR-023 naming contract. |
| `props` | The approved ADR-026 API proposal, kept: `kind`, `type`, `options`, `default`, vocabulary `concept`, and `figma` (`surface`, `property`, `set`). |
| `constraints` | Combinations a component requires or forbids (`if` / `require` / `ignore` / `forbid`), each with an `enforcedBy` list (`type`, `test`, `lint`). Where a component is placed stays in `usage.antiPatterns`. |
| `states` | Every state with its ADR-025 kind (`interaction`, `appData`, `lifecycle`, `content`) and its trigger. |
| `styles` | Part → ordered rules of `when` (prop values and state) → CSS property → value. A value is a token path, a `{ literal, reason }` or a `{ sameAs }`. A raw value can still appear, but it has to say why. |
| `figma` | The component sets it spans, and recorded divergences with the decision on each. |

### Who reads it

- `/component-scaffold` writes it from the approved API proposal **before** any code exists. This makes it a spec of intent, not a description of what was built.
- `/review-component` reads it to review the code against the spec.
- `/layout-generation` **never** reads it, and `generate-pattern-schema.js` does not aggregate it. The ADR-013 rule still holds: each reader gets the narrowest context.

### Why the duplication is acceptable

TypeScript stays the source of truth for what was built. The spec is the agreed intent. `npm run spec:validate` (`scripts/validate-spec.js`, in `components-check.yml`) fails when the two disagree:

- **Props:** every prop the component declares is in the spec, and every spec prop exists. Variant-axis options match the TypeScript union and the metadata axis. Destructuring defaults match.
- **Styles:** the token paths in the spec equal the `--ds-*` properties the CSS Module reads, and each one is defined in the built token CSS.
- **Cross-references:** anatomy, states, constraints and `when` keys resolve, and every metadata state appears in the spec.
- **Unenforced constraints** (an empty `enforcedBy`) are listed as backlog items, not failures. This follows the shrinking-ledger convention of `a11y-backlog.json`.

This answers ADR-026's objection. The metadata schema is untouched. When the same fact lives in two places and a check fails on disagreement, that is a contract, not drift.

### Pilot and exit condition

The pilot covers Button (an atom) and CardVertical (a compound component with ADR-023 parts). During the pilot:

- Specs are optional. The validator checks only components that have one.
- Metadata is unchanged. `tokens`, `states` and `accessibility` stay where they are, so the pilot specs repeat them.

**Accept** when both of these hold:

- The pattern-accuracy harness, with a third arm (metadata + spec), shows component scaffolding does not get worse.
- CardVertical's parts fit the schema without new top-level keys.

On acceptance:

- Move `tokens`, `states` and `accessibility` from metadata into the spec. This is a breaking change to the ADR-001 contract and needs an ADR-001 amendment, which also reverses the `anatomy` exclusion for the spec file. Migrate `a11y-coverage.js`, `validate-metadata.js` token resolution, `sense-component.js` and Airtable sync.
- Change `/component-scaffold` step 3 to write `<Name>.spec.json`.
- Make a spec required for every component. Generate `props` and `styles` with a script from the props types and CSS Modules; the agent writes only anatomy roles and constraints.
- Correct ADR-026's known-gaps line about Button `shape`.

**Reject** if the harness shows scaffolding gets worse, or if keeping specs up to date costs more than the drift it catches. In that case delete the spec files and the validator; metadata is untouched.

The harness plan (Arm C, two tasks, the `spec:conformance` gate, and what "not worse" means) is in `.claude/handoff/archive/2026-10-07-spec-harness-arm.handoff.md`.

## Consequences

- Each kind of reader has its own file. Layout generation's context does not grow, and gets smaller once the migration moves three sections out.
- Facts that design files cannot carry (roles, banned combinations, code-only props, Figma set mappings) now have a field that a schema checks.
- A raw value in `styles` must state its reason. The validator catches a token that the CSS reads but the spec leaves out, which is the gap `metadata.tokens` has had.
- Each component gets one more file to keep in sync. The validator makes that cost visible instead of letting drift pass silently. The real burden can only be judged after the CardVertical pilot.
- `spec:validate` needs built tokens. In CI it runs after `tokens:build`.
- The five problems the Button pilot found are reported but not fixed in this change. Two are already visible in the spec: the unenforced icon-only constraint (validator backlog) and the missing focus style (the `focus-visible` state notes).

## Amendment (2026-10-07) — CardVertical pilot

`CardVertical.spec.json` is written and passes `spec:validate`. The second exit condition is met: the parts fit without new top-level keys. They did need four additions inside existing sections, which this amendment records as part of the schema:

- **`anatomy[].parent`** records nesting. A compound component has 22 named elements in four levels, and a flat list can't show which `Icon` belongs to which part.
- **`anatomy[].builtOnProps`** records the fixed props a part passes to its child component (Title → Heading `size=headline-serif`, Body → Stack `gap=sm`). This is where most of a compound component's look comes from, and it never appears in its own CSS Module.
- **A `template` style value** embeds `{token.path}` references in a composite CSS value: the halo `drop-shadow(...)` and `calc(100% + {space.stack.xs})`. The validator extracts the token paths from it.
- **An `element` prop kind** for `as`. ADR-026's kind list had no row for it.

Part props are keyed `<Part>.<prop>` inside `props`. The validator reads each `<Name><Part>Props` type and checks completeness, options and defaults per part. It also checks that every metadata `composition.parts` entry appears in `anatomy` with the same `builtOn`.

**Size.** The CardVertical spec is 18 KB and its metadata 21 KB; for Button the two are about 9 KB each. Until the migration moves `tokens`, `states` and `accessibility` out of metadata, a builder moment reading both files roughly doubles its per-component context. The harness arm has to weigh that against any accuracy gain.

**What the pilot found:**

- `Root` sets `min-width: 220px` / `160px`. These are raw px values in a CSS Module, which the component rules forbid; the tokens-author convention is a size primitive plus a device alias.
- `metadata.tokens` lists six tokens the CSS Module never reads (`color.text.*`, `font.family.headline-serif`, `font.weight.medium`, `font.line-height.tight`, `space.inline.sm`). They reach the card through `Heading`, `Text` and `Inline`. The spec states this through `builtOnProps` rather than listing other components' tokens. This is part of #117.
- No opacity or z-index token scale exists. The thumbnail hover `0.8` and the overlay stacking (`1`, `100`) are literals with reasons.
- The one prop constraint, controlled `pressed` wins over `defaultPressed`, is already enforced by a behavioural test. CardVertical's other rules are about composition (what a part accepts) and belong in metadata `composition.parts`.

## Amendment (2026-10-08) — Harness arm result: accepted

The first exit condition is met. The pattern-accuracy harness ran Arm A (brief + API table + dependency metadata + schema) against Arm C (A + the target's `<Name>.spec.json`), N = 3 runs per task, on 2026-10-08. The accept bar was registered before any run: Arm C's median headline total ≤ Arm A's on each task.

| Task | Arm A median (range) | Arm C median (range) | Spec conformance A → C | Prompt chars A → C |
|---|---|---|---|---|
| `component-button` | 35 (33–35) | 0 (0–2) | 38 → 26 | 16,302 → 25,209 (+55%) |
| `component-cardvertical-parts` | 9 (7–12) | 4 (4–6) | 46 → 39 | 57,276 → 75,152 (+31%) |

Arm C is better on both tasks, so the bar is met. The developer's prediction ("better, especially in prop and accessibility compliance") holds for props: spec conformance improves on both tasks. It shows nothing for accessibility: `lint` and `a11y:coverage` scored the same in both arms, and this harness never runs axe.

**Why the size of the win is overstated:**

- **Arm A had no token catalogue.** 32–34 of Button Arm A's violations are invented token names in its metadata (`color.action.accent.background`, `spacing.sm`). Its CSS invents unprefixed custom properties too, which this harness's headline doesn't count. The spec gave Arm C the real paths. The real `/component-scaffold` can read the token files, so most of the Button gap measures "no token names vs. token names", not the spec's other sections. The harness-ablation eval's `unknown-token` trap measures this inside a real workspace.
- **A scorer false positive costs both arms 2 on CardVertical.** All six runs export the right type names as `export interface`, and the task's required pattern accepts only `export type`. Corrected medians are 7 vs. 2, so the verdict doesn't change. The task file was locked before the run and was left as it is, per the honest-outcome rule.

**What acceptance changes now:**

- **Specs stay optional, and only Button and CardVertical have one**, until the migration below lands. `spec:validate` stays in `components-check.yml`.
- **The "On acceptance" steps above are now the backlog, not part of this change:** move `tokens`, `states` and `accessibility` into the spec (with the ADR-001 amendment), switch `/component-scaffold` step 3 to write the spec, require a spec for every component with script-generated `props` and `styles`, and correct ADR-026's Button `shape` line. Each is its own PR.
- **The extra context is a real cost.** Until the migration removes the duplicated sections, a builder moment that reads both files carries +31% to +55% more prompt for these two components.
- **The harness-ablation eval's Arm 1 context includes the specs.** `prepare.js` keeps and strips them like metadata, including redacting the target's own spec.

