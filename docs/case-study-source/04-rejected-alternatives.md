# Honest rejected-alternatives framing

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar.*

## Why this section exists at all

A case study that only describes what shipped invites a reasonable doubt: *did you actually consider the obvious alternative, or did you just build the thing you knew how to build?* The honest answer, for this system, is that every major architectural choice below has a documented alternative that was seriously evaluated and rejected for a stated reason — and in one case, measured and rejected on data rather than intuition. This section is the receipts, led by the one with a controlled experiment behind it.

## 1. Feeding cross-component pattern context into every generation task

**What was proposed:** once `component-patterns.json` (the cross-component aggregate — which components share an interaction pattern, canonical prop names, drift between implementations) existed, the obvious move was to feed it into every generation task, on the theory that more structural context can only help.

**Why it was rejected — with data, not intuition:** ADR-013 ran a before/after harness, 7 pre-registered tasks across scaffold, composition, and layout task kinds, each scored twice — once with per-component metadata only, once with the pattern file added — against the repo's real deterministic gates plus a trap checklist. The result didn't support the "more context always helps" intuition: the pattern file measurably *improved* composition and layout tasks (total violations fell from 13 to 4, a 69% reduction) and measurably *worsened* component scaffolds (total violations rose from 19 to 24; the gate-only subset went from 11 to 17). Full tables in [The numbers](08-measured-impact.md). The likely mechanism, stated in the ADR rather than left implicit: the ~23K-character aggregate crowds out attention on the specific metadata-schema and file-contract gates a scaffold task needs to hit.

**What shipped instead:** `component-patterns.json` is a consumer input for `/layout-generation` only. `/component-scaffold` deliberately never sees it. A later amendment corrected a scorer false-positive and rescored all 14 cells — the corrected numbers sharpened the split rather than changing the conclusion.

**The honest framing:** this is the one rejection in this list that isn't really about plan limits or tooling walls — it's a case where an architecturally reasonable-sounding idea ("give the model more relevant context") was tested and falsified for one specific use, kept for another, and the harness itself was kept in-repo as the standing instrument for re-testing the call if anything about the inputs changes. It's the clearest evidence that "measure, don't assert" is an operating principle here, not a slogan — the same rule that produced the append-only review-telemetry ledger elsewhere in the system.

## 2. The parallel agent swarm (ADR-007)

A blueprint for the component-generation loop specified parallel worker agents, an asymmetric Sonnet-router/Haiku-worker cost split billed per token, and Figma variables pulled live over the Variables REST API. All three assumed a billing model this system doesn't have: on Claude Pro the constraint is a shared weekly usage window, so parallel workers drain it *N* times faster rather than costing *N* times more, and the REST API is Enterprise-only regardless of billing tier anyway. What survived — frozen state-file handoffs, one adversarial verification stage, on-demand triggering — is what shipped. The rejection is plan-specific, not a universal claim that parallel agents are bad; a different Anthropic plan would make a different call. Full story: [Division of labor](03-automation-vs-agents.md).

## 3. Figma as the primitives source of truth (ADR-002, reversed)

Designers were originally meant to author variables in Figma with an automated sync pulling them into `primitives.json`. The Variables REST API and Code Connect are both Enterprise-only, and Token Studio's free-tier sync only handles a single file against this architecture's six-plus — no available tool could do the sync this design needed, so `primitives.json` became hand-edited via PR instead and Figma became a downstream mirror. This is arguably the most consequential reversal in the system: nobody decided code-as-source-of-truth was philosophically superior, the tooling made the alternative impossible to automate. Full story: [Token pipeline](01-token-pipeline-narrative.md).

## 4. `$root` as the group-default token suffix (ADR-003, superseded)

**What was chosen first:** `$root` as the convention for a token group's default value (e.g., the base step of a color ramp when no numbered step is specified).

**Why it was fully reversed, not just tweaked:** a later semantic-naming audit found `$root` required a custom Style Dictionary preprocessor to handle, and it produced meaningless `-root` suffixes in the emitted CSS custom property names — a naming cost paid on every single build, forever, for a convention that turned out to be non-standard. The reversal wasn't a judgment call between two reasonable options; it was research confirming that the W3C DTCG spec, Tokens Studio, and Style Dictionary all independently converge on `.default` — `$root` was a local invention swimming against an ecosystem-wide convention.

**The honest framing:** this is the smallest of the rejected alternatives in scope, but it's the one that best demonstrates the system's governance discipline in miniature: the original ADR-003 wasn't deleted or quietly edited when it turned out to be wrong. It carries a supersession note and status `superseded`, so the wrong decision and the reasoning that corrected it both stay on the record — the same principle (amend or supersede, never silently overwrite) that governs how the Airtable side of this system treats human vs. code-owned values.

## 5. Custom-property-via-`style` for enum layout props (ADR-020, replaced)

**What was chosen first:** `Stack`, `Inline`, `Box`, and `Card` translated their enum-valued layout props (`gap`, `align`, `justify`, `padding`) into private CSS custom properties written through the `style` attribute — `style="--_gap: var(--ds-space-inline-lg); --_align: flex-start;"` — consumed by the CSS Module as `gap: var(--_gap, 0)`. Nothing about it broke the tokens rule: every value written was still a `var(--ds-*)` reference from a fixed enum, never a raw pixel.

**Why it was reversed:** token-correctness wasn't the actual risk. The risk was the DOM shape it produced: putting a `style` attribute on every layout primitive instance, purely to pick between five or six known values, left an implicit escape hatch. A `style` attribute is instance-writable by definition — anyone extending a component later has a precedent, sitting right there in the DOM, for writing an arbitrary property into that same attribute. Restricting the enum in the prop's TypeScript type doesn't stop that once the mechanism used to apply it is "write into `style`." Nothing was exploiting that hatch yet, but the pattern didn't need to be exploited to be a liability — it was a matter of when, not if, given the number of components and prop authors involved.

**What shipped instead:** the enum value is written as a `data-*` attribute (`data-gap="lg"`, `data-align="start"`) and the CSS Module owns the full mapping via attribute selectors (`.stack[data-gap="lg"] { gap: var(--ds-space-stack-lg); }`). There is no longer a `style` attribute on these instances at all unless a consumer deliberately passes one for a continuous, non-enum value (`grow`, `minWidth`, per ADR-011) — the escape hatch and the legitimate use are now visibly different attributes, not the same one serving both.

**The honest framing:** this is the smallest-scope rejection in the list, and unlike the others it isn't a plan constraint (billing tier, API gating, ecosystem convention) forcing the call — it's a case of catching a self-inflicted design smell before it became load-bearing. The value of a fixed component set with a small enum surface is that styling is supposed to be a closed decision, made once in the design system, not a per-instance choice; a pattern that technically enforced the enum's *values* while leaving the *mechanism* open-ended undercut that guarantee quietly. The fix cost nothing at runtime (verified with a full screenshot-diff pass, 54/54 shots at 0.000% diff) — it's a pure case of the DOM shape catching up to what the type system already claimed.

## The pattern across all five

Look at the five rejections together and a shape emerges: none of them were rejected because the alternative was a bad idea in the abstract. Feeding more context into every task is a fine intuition — until measured against the specific task it's fed into. A parallel swarm is a fine architecture — on API billing. Figma-owned primitives is a fine architecture — on an Enterprise plan with working REST sync. `$root` is a fine-sounding convention — if the ecosystem hadn't already converged elsewhere. Custom-property-via-`style` is a fine technique — until you notice the attribute it relies on is the same one that lets anyone write arbitrary CSS. Each rejection is **conditional on a fact about this system's actual constraints** (measured task sensitivity, Pro-tier billing, non-Enterprise Figma, ecosystem convention, DOM-level enforcement guarantees), not a claim that the rejected approach is wrong everywhere. That conditionality is what makes the rejections trustworthy rather than self-serving: they're falsifiable, and in one case, already tested against real data.

## Sources for this section

- `docs/decisions/013-cross-component-pattern-schema.md` (+ amendment), `scripts/pattern-accuracy-harness/results.md`
- `docs/decisions/007-verified-component-loop.md`
- `docs/decisions/002-three-layer-token-model.md` (+ amendments)
- `docs/decisions/003-root-token-convention.md` (superseded)
- `docs/decisions/020-layout-prop-attribute-selectors.md`
- `docs/05-governance.md` (the amend-or-supersede discipline, for cross-reference)
