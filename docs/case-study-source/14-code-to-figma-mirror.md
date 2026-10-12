# Figma as a mirror: fidelity you can check, translation you can look up

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar. Sources of record: ADR-002 (2026-06-17 and 2026-10-01 amendments), ADR-026 (Figma names, Tier 3 amendment), ADR-025, ADR-027, the Figma drift log, and `packages/tokens/figma-variables.json`. This chapter answers a gap named in review: "The UpSkill evidence is strongest on accuracy and cost, and weakest on speed and visual fidelity to Figma." It separates what the mirror demonstrably did from what it hasn't been measured to do.*

## Two claims, and what each would need

"The code → Figma mirror improves fidelity and simplifies design-to-code" is two claims, and they need different evidence:

1. **Fidelity.** Figma and the shipped components show the same thing. Evidence: how often they disagreed, what the disagreements were, and whether anything now catches a new one.
2. **Translation.** Going from a Figma frame to code takes fewer judgement calls. Evidence: how many Figma names a developer or agent has to *interpret*, versus look up.

The measured-impact chapter is right that neither has a headline number. What exists is a log of every reconciliation since June 2026, each verified by read-back, and a before/after of the component-property layer from the October contract migration. That's enough to show the mechanism works. It's not enough to show the size of the effect, and the last section says what would be.

## Why the direction flipped

ADR-002 started out Figma-first: `primitives.json` would be replaced by each Figma export. It was reversed on 2026-06-17, for a plan-limit reason, not a philosophical one. The Variables REST API and Code Connect are Enterprise/Org-only, so Figma → code could never be automated. Code → Figma could, interactively, through the Plugin API (first via the Figma MCP, from 2026-10-01 via figma-cli).

That flip changes what "fidelity" means. When Figma is upstream, fidelity is a property of each implementation: did this developer copy that frame correctly? When Figma is a mirror of committed code, fidelity becomes a property of the *pair*: does the mirror still match the source? That second question has a yes/no answer per variable and per property, which is what made it checkable.

## Fidelity, layer 1: variables

The mirror started with three hand-built Figma collections that had drifted from code. Every push since writes only clean-missing variables, never deletes or overwrites without confirmation, and ends with a read-back that resolves both sides to concrete per-mode values.

| Date | What the push or audit found | Verified by |
|---|---|---|
| 2026-06-17 | First reconciliation. Two Figma extras deleted, 7 clean-missing variables added. Everything else matched. | read-back |
| 2026-07-07 | Code had moved ahead: the AA-contrast pass and the new `red` feedback hue. **Figma was still showing the pre-AA colors** for buttons, brand text, feedback and input borders. 40 variables added, drift from both commits fixed. | 20 of 20 checks resolve to the code hex, both modes |
| 2026-10-06 | Per-variant Button tokens. The push surfaced **real drift**: the `Button icon` Accent default was one ramp step lighter than code (`#d15d50` vs `#c44f43`), Transparent hover showed no tint at all, and 9 Large variants were bound to the primitive `space/250` instead of the semantic inset. | full re-capture: 0 missing, 0 drift, 0 broken aliases |
| 2026-10-07 → 10-11 | Focus ring, card sizes, `active` states. Clean adds only. | resolved-value diff against the previous capture |

The inventory grew from 414 variables (first capture, 2026-06-22) to 474 (292 / 116 / 66, captured 2026-10-11). The last full audit found 0 missing, 0 drifted and 0 broken aliases, with two named exceptions that are *recorded* rather than ignored: line-heights (Figma can't store unitless ratios) and the brand layer (not mirrored, ADR-012).

The point for the case study: without the push, a designer opening the file after July would have designed against colors that failed AA and no longer shipped. That isn't a speculative fidelity gain. The file was wrong, and the mirror is how it stopped being wrong.

## Fidelity, layer 2: component properties

Variables are the easy half. The harder drift is in component sets: property names, values, states. The October contract migration started with a read-only Figma read-back (Tier 0, 2026-10-10) and found sets that showed the wrong thing, not just the wrong name:

- **Breadcrumb link had `State=Active` as its resting look.** That's the exact collision ADR-025 warns about (`active` is a momentary press). The 17 current-page instances also used the wrong text color.
- **AppHeader's nav item had `Property 1 = Default / Variant2`.** No one reading the file could know `Variant2` meant "current page".
- **The Accordion list's "Show more" link had `state = collapsed / expanded / state3 / state4`.**
- **Six sets modeled `Disabled` as a `State` value**, so a disabled-and-hovered preview was impossible, while in code they're independent.
- **Four components existed in Figma but weren't linked** from their metadata at all (`figmaNodeId: none`): Avatar, ProgressBar, Breadcrumb and AppHeader. A developer reading the metadata would have concluded there was no design to follow.

Tier 3 (PR #140, 2026-10-11) fixed all of it in place: renames on existing variants, nothing cloned or moved. Every set's instances were snapshotted before and compared after: **526 checks, 0 differences**, so no placed design broke. The result:

| | Before (Tier 0) | After (Tier 3 + 4) |
|---|---|---|
| Components linked to a Figma set (`figmaNodeId`) | 12 | 16 of 27 (the other 11 are `none` by decision; 5 of them are layout primitives with no set by design) |
| Sets with `Disabled` inside `State` | 6 (289 instances) | 0 |
| Property names a reader must guess | `Property 1`, `Variant2`, `state3`, `completion`, `headerLayout` | 0 |
| Interaction states shown in Figma but not in code, or the reverse | No `Active` previews; checked Checkbox had no hover | Active previews on all interactive sets; checked hover added on both sides |

The last row is where the mirror improved the **code**, not only Figma. Drawing every state in Figma forced the question of what each state looks like. The close-out found that a checked Checkbox on hover lost its brand border, because of CSS specificity, not a design decision (ADR-025 amendment, 2026-10-11). It was fixed in CSS and in the Figma set together.

## Translation: from interpreting names to looking them up

Before the alignment, going from a Figma frame to code meant interpretation at every layer: what does `headerLayout` map to, is `completion` the same as `value`, does `Style=Elevated` mean the code's ghost variant? Each answer lived in someone's head or in a chat transcript. The mirror turned that into three lookups:

**1. Variable names translate mechanically.** Figma's `color/brand/brand-9` is code's `color.brand.9`; `font/line-height/body-small-tight` is `--ds-font-line-height-tight`. The rules are written once in `/component-scaffold` (line-height and spacing translation rules) and in the drift log, so an agent reading `get_design_context` output never uses a px fallback as a value.

**2. Property names match by rule, with a closed list of exceptions.** ADR-026's contract: code and Figma share names, values and defaults, and **casing is the only routine difference** (`trailingIcon` ↔ `Trailing icon`). Anything else must be one of **7 recorded mappings**, each with a reason (`Has <x>` booleans for omitted optional props, `State` for pseudo-classes, ProgressBar's sampled `Value`, and so on). A difference that isn't on that list is a bug on one side, not a translation question.

**3. Each component carries its own translation record.** All 27 specs have a `figma` section: the sets the component spans, which part of the API each covers, and its recorded divergences. Across the whole library there are **5 divergences**, each with a dated decision. Button's reads, in full: "The Button icon set has no Danger style. Accepted 2026-10-02: no icon-only danger button is used anywhere." A developer starting from Button's Figma set no longer has to discover that the icon-only variant is in a different set; the spec says so.

And the scaffold now runs this in the forward direction: `/component-scaffold` writes an API proposal with a **Figma property column and a Surface column** (both · code-only · Figma-only) before any code exists, and "every Figma property or value that differs from code by more than casing" must be a recorded mapping or get fixed. "None passes silently" is in the command.

## The spec as the mirror's per-component contract

It's tempting to credit the component spec (ADR-027, [previous chapter](13-spec-architecture.md)) with the naming alignment. The dates don't allow it. Three different things did three different jobs:

| | What | When | Role |
|---|---|---|---|
| **The rule** | ADR-026: same names, values and defaults; casing-only, or one of 7 recorded mappings | 2026-10-07 | Says what "aligned" means |
| **The fix** | Tier 3 Figma alignment (PR #140) | 2026-10-11 | Applied the rule to the file |
| **The record** | `<Name>.spec.json` for all 27 components (PR #142) | 2026-10-11 | Holds the rule's outcome per component, so it can't quietly slip |

So the spec didn't produce the Tier 3 fixes. What it adds is that the alignment is no longer a one-off cleanup: every component now carries it as data, and new components must state it before they exist.

**Every prop declares its Figma surface.** The spec schema requires a `figma` field on each prop. Across the 27 specs there are 177 props: **121 are `both`**, each with its Figma property name (casing-only or a recorded mapping), and **56 are `code-only`** (handlers, `className`, native attributes). A reader translating a Figma instance doesn't search an ADR for the mapping; it's on the prop.

**The translation table now comes first.** `/component-scaffold` writes the spec from the approved API proposal *before any code exists*, Figma property column included, and the proposal's anatomy names become the Figma layer names. For a new component the shared vocabulary isn't reconstructed after the fact by comparing a Figma file to a codebase. It's decided once and both sides are built from it. That's the strongest translation argument this system has, and it's a structural one: it removes the step rather than speeding it up. It hasn't been run end to end yet (the first spec-first component is #136).

**The spec found one fidelity error on its own.** Writing the Button pilot spec showed an ADR claiming Button's `shape` had no Figma property. In fact icon-only buttons are a separate Figma set (`Button icon`, `54:1192`). The spec's `figma.sets` now names both sets and what each covers.

### Mirrored architecture, not just mirrored names

Names are half of it. The other half is structure. Code builds compound components two ways (ADR-023): a preset `<CardVertical …props />` for the common case, and parts under `<CardVertical.Root>` for everything else. Until 2026-10-06 Figma had only the preset. Four of CardVertical's layout patterns (`custom-meta`, `instructor-row`, `grouped-meta`, `title-only`) had no Figma counterpart, so a designer had to **detach** the component to draw them, and a detached card no longer follows the library.

The ADR-023 amendment of 2026-10-06 gave Figma the same two entry points:

- the existing **preset set**, with its variants and properties, still the default;
- a **`CardVertical.Root`** with the parts as **native slots**, plus part components for whatever can go in a slot.

The rules carry over too. Each slot's auto-layout gap is bound to the same spacing variable as the code primitive and fixed in the main component, mirroring code's "no layout props on open parts". There's one example frame per pattern id. The spec's `anatomy` is what keeps the two structures matching: it names every part, its role, and what it's built on, and those names are the Figma layer names.

This is the clearest fidelity gain in the chapter that isn't about a value. A design that would have been a detached copy now stays an instance, so when a token or a part changes, the design changes with it.

### What the spec doesn't check

The guarantee is one-sided. `spec:validate` checks the spec against **code**: props against the TypeScript types, `styles` against the CSS Module's `--ds-*` reads. Its only use of a prop's `figma` field is to skip `figma-only` props. Nothing compares the spec's Figma property names, sets or layer names against the **Figma file**, because reading Figma is interactive and stays out of CI.

So today the spec guarantees "code and its Figma record agree", not "Figma agrees with the record". The second half is held up by the alignment passes and their read-backs, which are as good as the last time someone ran them. The binding-coverage measurement below is the missing check: the spec's `styles` already state which token each part uses in which state, so the expected side of a Figma comparison exists. Only the read is missing.

## What it doesn't prove

- **No measured link from mirror to built output.** The harness ablation's blind rating against Figma (one rater, N = 1 per cell) gave the full-context arm no "matches" on any task. The gates and the reviewer check conventions, not the design. The mirror makes Figma *correct*; it hasn't been shown to make an agent's first draft *match* it. One traced cause was a primitive (`size.300`) used where Figma binds a semantic (`size.icon.sm`), which is exactly the kind of gap a Figma-aware check could catch and nothing currently does.
- **No translation-time baseline.** "Fewer judgement calls" is argued from the shape of the contract (7 mappings vs unbounded interpretation), not timed. There's no before/after on how long a Figma → code task takes.
- **The visual baseline compares code to code.** ADR-019's screenshot baselines catch regressions in Storybook, not divergence from Figma.
- **It's one maintainer on both sides.** In a team, the mirror's value depends on designers working in the file the push maintains. That's untested here.
- **The mirror is interactive.** Every push needs Figma Desktop and a person present, so drift between pushes is caught by the next audit, not by CI.

## How to close the gap (cheaply, outside the frozen harness)

The harness is frozen at `044d28f` (ADR-029 amendment, 2026-10-12), so new evidence shouldn't come from new eval arms. Two read-only measurements would turn this chapter's mechanism into numbers:

1. **Binding coverage per linked set.** One figma-cli read over the 16 linked sets: the share of fills, strokes, padding, gap and radius bound to a variable vs a literal, and the share of those variables that resolve to the token the spec's `styles` names for that part and state. Captured into a committed snapshot like `figma-variables.json`, it becomes a fidelity number that can be re-run after every push. The spec's `styles` already state which token each part uses in which state, so the expected side of the comparison exists.
2. **A side-by-side fidelity check for the shipped components.** Storybook screenshot vs `get_screenshot` of the matching Figma variant, for each linked set's default and one state, rated blind the same way the ablation did. It's still one rater, but N = 16 components instead of 3 tasks, and it measures the shipped library rather than an agent's first draft.

The second one also answers the reviewer directly: it's visual fidelity to Figma, measured.

## Why this belongs in the case study

The interesting move is that a plan limit (no Enterprise, no Code Connect) forced a code-first mirror, and the mirror turned fidelity from a judgement into a diff. Variable drift is now a resolved-value comparison with a zero to aim at. Component-property drift is a closed list of recorded mappings, so translation is a lookup. The spec carries that lookup on every prop and is written before the code, and Figma now mirrors code's structure as well as its names, so compound designs stay instances instead of detached copies. Keeping Figma honest also found errors on the code side: a Checkbox hover bug in the CSS, and a wrong claim in an ADR. What the system can't yet claim is that this makes what an agent builds look more like the design. That's the next measurement, and it's a small one.

## Sources for this section

- `docs/decisions/002-three-layer-token-model.md` — 2026-06-17 reversal (code is the source), 2026-06-22 representational divergences, 2026-10-01 figma-cli transport
- `docs/decisions/026-component-prop-vocabulary.md` — "Figma names" (casing rule, 7 recorded mappings), Tier 3 and Tier 4 amendments
- `docs/decisions/025-component-state-model.md` — state groups, `Disabled` out of `State`, Checkbox checked hover amendment
- `docs/decisions/027-component-spec-file.md` — the spec's `figma` section; Button pilot findings
- `docs/decisions/023-subcomponents-compound-components.md` — 2026-10-06 amendment: Figma `Parent.Root` with native slots, part kinds → Figma constructs, one example per pattern
- `packages/components/component.spec.schema.json` (required `props.*.figma.surface`), `scripts/validate-spec.js` (code-side checks only)
- `.claude/handoff/archive/2026-10-10-component-contract-migration.handoff.md` — Tier 0 Figma read-back matrix
- `.claude/handoff/archive/2026-10-07-adr-026-figma-alignment.handoff.md`
- `packages/tokens/figma-variables.json` — captured 2026-10-11, 292 / 116 / 66, divergence lists
- Drift log (maintainer memory note `figma-file-variable-drift.md`) — every reconciliation 2026-06-17 → 2026-10-11 with its read-back
- `packages/components/src/components/*/<Name>.spec.json` (`figma` sections), `*.metadata.json` (`figmaNodeId`)
- `.claude/commands/component-scaffold.md` — translation rules, API proposal Figma columns
- `docs/case-study-source/08-measured-impact.md` (blind visual rating, open gaps), `12-harness-ablation-learnings.md`, `13-spec-architecture.md`
