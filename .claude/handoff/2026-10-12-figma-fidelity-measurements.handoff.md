---
status: active
created: 2026-10-12
completed:
---

# Figma fidelity measurements: does the layered metadata bring Figma and code together?

**The claim to support:** the system's layered metadata (the ADR-026 contract, the specs, the tokens) produces Figma components that are built correctly, with the right structure and the right token use, so Figma and code end up much closer together. `docs/case-study-source/14-code-to-figma-mirror.md` shows how that works but says itself that no number shows the size of the effect. It also answers part of the case-study review: *"weakest on speed and visual fidelity to Figma."* Facts were checked on `main` on 2026-10-12.

There are two measurements, run in order, which together tell one story:

- **A. Before/after (read-only):** the contract brought Figma and code together. This shows how big the change was.
- **B. With/without spec (4 generation runs):** the spec is what lets the system rebuild that alignment on its own. This shows what the spec contributes.

**C** (visual outcome check) and **D** (speed, optional) support them. Both A and B use one shared instrument, the checker.

**Read first:** page 14 ("The spec as the mirror's per-component contract", "What the spec doesn't check", "What it doesn't prove"); `08-measured-impact.md` (blind visual rating method and its caveats); `/figma-cli` (hard rules, 20,000-character truncation); the Tier 0 matrix in `.claude/handoff/archive/2026-10-10-component-contract-migration.handoff.md` ("Figma matrix").

## Ground rules

- **The main file stays read-only.** File key `t4F3b1p03loOX9IpNXRaYR`. No renames, rebinds or fixes during a measurement. Note what you find and fix it afterwards in its own pass, so the numbers stay honest. Measurement B writes only to a scratch duplicate of the file.
- **Interactive and local.** Figma reads and writes go through `/figma-cli` (Figma MCP as fallback), with the developer present. Never CI, never scheduled.
- **Separate from the frozen harness.** The evals are frozen at `044d28f` (ADR-029 amendment, 2026-10-12). A is not an eval. B is a with/without comparison, so **before running B**, append a dated ADR-029 amendment saying B is a separate, single-run study with its own scratch runner. It doesn't reopen `harness-ablation`, add arms to it, or use `harness:run` / `ablation:run`.
- **Pre-register.** Write each prediction and reporting bar into "Pre-registration" before the first read. Report against them, including misses, the way the spec accept test was reported.
- **Report the denominator.** 16 of 27 components link to a Figma set (`figmaNodeId`); the other 11 are `none` by decision. Every number says which population it covers.

## The checker (shared instrument)

A read-only script that scores one Figma file against the committed specs. It's built once, used by A on two file versions, and used by B on generated sets.

- **Population:** the sets in each spec's `figma.sets` (Button and CardVertical list theirs), otherwise each `figmaNodeId` set. Include part sets (`_TextField/Input`, `_Select/Trigger`, `_Breadcrumb/Link`, `_AppHeader/NavItem`, CardVertical parts).
- **Read, per variant node and its non-instance descendants:** component property definitions (name, type, values, default), variant layout (which properties form the matrix), layer names, instance/detach status, and for visual properties (fills, strokes, stroke weight, corner radius, 4 paddings, item spacing, font size / weight / family) the bound variable name or the literal value.
- **Three scores per set:**

| Score | Computed as | Expected side |
|---|---|---|
| **Token use** | *Binding coverage* = bound ÷ (bound + literal), excluding what can't be bound by construction (line-heights per ADR-002 2026-06-22; zero padding on frames without auto-layout). *Token match* = bound properties whose variable maps (drift-log naming map) to the spec's token for that part, CSS property and condition ÷ bound properties the spec has an entry for. | spec `styles` (part → `when` → CSS property → token); Figma variants map to conditions through `props[].figma.property` and ADR-025/026 (`State=Hover` → `:hover`, `Disabled=true` → `disabled`, …) |
| **Structure** | Share of checks passed: each `both`/`figma-only` prop exists with the expected property name (casing rule or one of the 7 ADR-026 recorded mappings), values and default; states are modelled as independent properties (ADR-025, e.g. `Disabled` not a `State` value); the set split matches `figma.sets`; layer names match `anatomy`; compound components have `Root` + native slots (ADR-023 2026-10-06). | spec `props`, `figma.sets`, `figma.divergences`, `anatomy` |
| **Figma hygiene** | Count of violations of general Figma practice, independent of this system's spec: placeholder property names (`Property 1`, `Variant2`, `state3`), unnamed layers (`Frame 12`), detached copies of library components inside sets, a variant matrix with duplicate or empty cells. | none, by design (see Caveats) |

- **Mechanics:** one `figma-cli eval --file` script in the session scratchpad for the read. Output is cut at 20,000 characters, so emit compact JSON per set and parse each chunk before the next call. Scoring is a local Node script in the scratchpad that reads committed files only (specs, `figma-variables.json`, the drift-log naming map).
- **Why the spec is a trustworthy answer key:** `spec:validate` guarantees `styles` equals the CSS Module's `--ds-*` reads and `props` match the TypeScript types. A mismatch therefore means Figma differs from shipped code, not from a document.
- **Overlap with #103** (system-wide naming audit, which proposes a committed `figma-components.json` snapshot plus a diff script). Run the checker as a one-off first. If it's worth repeating, the read becomes #103's snapshot and the scoring becomes its script. A new frozen snapshot needs an ADR-002 amendment. #103 predates the spec rollout and diffs against metadata `variants`/`composition.parts`; the checker uses the spec, which is now the better source.

## Measurement A: before/after (the contract's effect)

Run the checker on the file as it was before the October contract work and on the current file. The 16 linked sets are the population in both. Where a set didn't exist or wasn't linked "before", count it as missing, not as 0%.

- **Before version:** the last Figma version before **2026-10-06**. That date is the start of the October contract work: the per-variant Button token pass, CardVertical `Root` + slots, then ADR-026 on 2026-10-07, Tier 3 on 2026-10-11, and the specs on 2026-10-11. Duplicate it from version history into a scratch file and record its version id and timestamp here. If history doesn't reach that far, fall back to the last version before the first Tier 3 edit (2026-10-10 evening), and say in the results that the "before" already includes the 2026-10-06 work.
- **After version:** the current file. Record its version id and timestamp at read time.
- **Cross-check, not a replacement:** the Tier 0 matrix (2026-10-10) and the drift log already list what was wrong. Every Tier 0 finding should show up as a failed check in the "before" run. If one doesn't, the checker has a gap. Fix the checker, not the result.
- **Output:** per set and in aggregate, the three scores before and after, plus the list of failed checks in each version.
- **What A can claim:** the contract (ADR-026 rules, the alignment passes and the spec as their record) closed the gap between Figma and code, by this much. **What it can't:** credit the specs. Tier 3 (PR #140) fixed the file before the specs were written (PR #142), so the spec is A's yardstick, not its cause. That's B's job.

## Measurement B: with/without spec (the spec's effect)

Can the system rebuild a correctly built Figma component from code, and how much does the spec contribute?

- **Components (2):** **Checkbox** (independent state groups, checked hover per the ADR-025 2026-10-11 amendment) and **Button** (two-set split `Button` / `Button icon`, a recorded divergence: no Danger icon-only style).
- **Arms (2), 1 run each, so 4 runs:**
  - **Code-only:** `index.tsx`, `<Name>.module.css`, built `tokens.css`, `figma-variables.json`.
  - **Code + spec:** the above plus `<Name>.spec.json`.
  - Neither arm gets `metadata.json` (its usage/variants/composition fields say little about Figma; a third arm would double the cost for a weak signal), page 14, ADR-026, or the drift memory note. The task prompt is identical apart from the file list. Commit the prompt text to this handoff before the first run.
- **Scratch file:** duplicate the main file and delete the target sets (`Button` `57:1265`, `Button icon` `54:1192`, `Checkbox` `92:8772`) **and their instances** in the copy, keeping the variable collections. Use a fresh duplicate per run so no arm sees another arm's output. The generator must never read the main file.
- **Each run:** a fresh session (or one fresh subagent per run, sequential, never parallel, per the loop guardrails) builds the component set(s) with `/figma-cli` in its scratch file. No human correction during the run. Log turns, tokens and wall time.
- **Scoring:** the checker on each generated set, compared with Measurement A's "after" score for the hand-aligned set (the human ceiling).
- **Prediction to test (also pre-register it):** the CSS Module already names every `--ds-*` token, so token use should be close in both arms. The spec's advantage should show in structure: property names and values, the Button/Button icon split, `Disabled` outside `State`, anatomy layer names. If so, the finding is "the spec's value is structural."
- **What B can claim:** with N = 1 run per cell, a directional difference per score, reported as an observation, not an effect size. If the arms differ by less than the run-to-run noise you'd expect, say it's inconclusive. Don't add runs after seeing results unless the pre-registration says so.

## C. Outcome check: does it look right?

Correct structure doesn't guarantee it looks the same, so do a visual check on the current file.

- **Population:** the 16 linked components; for each, the Figma variant matching the story's default, plus one configured state (`disabled`, `checked`, `Current`, `Open`). Hover can't be captured statically. Light mode only.
- **Code side:** the committed baselines in `packages/components/screenshots/` (`components-<name>--default.light.png`, ADR-019); `/run-storybook` for state shots not in the baselines. **Figma side:** `get_screenshot` (Figma MCP) or a figma-cli export of the matching variant node, at the same scale.
- **Rating:** blind 3-point scale (matches / minor differences / wrong), pairs shuffled and lettered so the rater can't tell which component or side is which. One rater (the developer); say so. One traced cause per non-match (token, spacing, missing state, font, structure). Cross-reference causes with A's failed checks.
- **B's generated sets are rated in the same blind batch**, mixed in among the 16 (default + one configured state each). This is required, not optional: B's hypothesis claims the code-only output looks right on the surface, and only this rating tests that.

## D. Optional: translation speed on #136

#136 (Button `loading`) is the first component change built spec-first. If you're doing it anyway, record wall-clock time and the number of corrections from API proposal to passing gate (spec amended → code → gate green → review), plus every Figma ↔ code question and whether the spec or ADR-026 answered it. N = 1, no baseline: an observation. Skip without regret.

## Pre-registration

Fill in before the first read of each measurement. Don't edit after a result exists.

*Drafted 2026-10-12. The developer confirms or edits each line before the first read; after that, the lines are frozen.*

### Checker validity

- **Bar:** every gap in the Tier 0 matrix that predates the before version shows up as a failed check in A's "before" run. That includes Breadcrumb link `State=Active` as the resting state, `Property 1 = Default / Variant2`, `state3`/`state4`, `Disabled` inside `State` on the six Tier 3 sets, and missing `State=Active` on Accordion / DropdownMenu/Item / ButtonArrow. Plus the drift-log items from 2026-10-06: `Button icon` Accent default one step too light, Transparent hover with no tint, 9 Large variants bound to `space/250`. One missed item means fix the checker and re-run before reporting anything.
- **Answer-key check (before B):** the Button and Checkbox specs' `figma` fields must match the hand-aligned sets. Button cleared 2026-10-12 (#145): `disabled` now maps to the `Disabled` property, confirmed by read-back on both sets. Checkbox still needs the same check against `92:8772` before B.

### A — before/after

- **Before version used:** _TODO at read time_ (version id, timestamp, pre-2026-10-06 or fallback)
- **Prediction:** the contract closed most of the gap. Structure moved the most and token use the least, because variables have been mirrored since June.
  - **Token use, binding coverage:** before ≈ 80% → after ≥ 95%.
  - **Token use, token match:** before ≈ 70% → after ≥ 90%. Misses before: wrong ramp step, primitive instead of semantic, no hover tint.
  - **Structure:** before ≤ 50% (4 of 16 sets unlinked and counted as missing, 6 sets with `Disabled` in `State`, no `Active` previews) → after ≥ 95%.
  - **Hygiene:** before ≥ 4 placeholder property names (`Property 1`, `Variant2`, `state3`, `state4`) → after 0.
- **Reporting bar:** a score counts as improved if it rises ≥ 20 points. Report every set whose "after" structure or token match is below 90% by name, with its failed checks, as a remaining gap. Don't fold it into the aggregate. If structure doesn't move ≥ 20 points, the headline claim is not supported. Say so.

### B — with/without spec

- **Task prompt (verbatim):** _TODO_
- **Hypothesis (developer's):** without the spec, the generated components look right at first glance. Underneath, the structure and labelling don't match code, tokens are bound to the wrong states, and property names don't align.
- **Prediction per score (code-only vs code + spec, Checkbox and Button pooled, then reported per component):**
  - **Visual (C rating):** about the same. Both default states rated "matches" or "minor"; code-only no more than one scale step below code + spec on any pair. *This is the "looks good on the surface" half.*
  - **Token use, binding coverage:** about the same, both ≥ 85% and within 10 points of each other. The CSS Module names every token, so tokens get used.
  - **Token use, token match:** code-only ≥ 15 points lower. *Tokens on the wrong states.* Expected misses: Checkbox checked + hover (brand border must stay; `overlay.hover` darkens the fill), Checkbox active overlay in both checked states, Button per-variant hover/active fills, disabled treatment.
  - **Structure:** code-only ≤ 60%, code + spec ≥ 85%. *Labelling and names don't align.* Expected code-only failures: one Button set with a `Shape` variant instead of the `Button` / `Button icon` split; `Disabled` modelled as a `State` value; missing `Has icon` / `Has trailing icon` booleans; text property named after the code prop (`children`/`label`) instead of `Text`; no `Active` state; anatomy layer names generic (`Frame`, `Group`).
  - **Hygiene:** code-only ≥ code + spec violations (more placeholder layer names).
- **Reporting bar:** N = 1 per cell. A % score counts as different only if the arms differ by ≥ 15 points, which is several checks on these two components. Below that, report "no difference shown." The hypothesis is **supported** if structure and token match both clear the bar in the spec arm's favour *and* the visual rating is within one step. It's **partly supported** if only one of structure or token match clears it. It's **not supported** if code-only structure is ≥ 80% or within 15 points of code + spec. If code-only looks clearly worse visually, the "surface" half is wrong. Report that as a finding too. No extra runs after seeing results.

### C — visual outcome

- **Prediction:** on the current file, ≥ 12 of 16 default states rated "matches", none rated "wrong". Non-matches trace to text rendering (Figma vs Chrome antialiasing) or the line-height representational divergence, not to tokens or structure. Configured states score slightly lower than defaults, because they were added later.
- **Reporting bar:** report the full distribution (matches / minor / wrong) for defaults and states separately, with a traced cause for every non-match. Any "wrong" is reported by name and gets an issue, whatever the total.

## Caveats to carry into the case study

- **Circularity.** Scoring Figma against the spec it was aligned to comes out high by construction. The hygiene score and the visual rating don't depend on the system's own yardstick, which is why they're in the report. Lead with them when the structure score is near 100%.
- **Attribution.** A credits the contract plus the effort of applying it, not metadata alone. B is the part that isolates the spec, and it's small (2 components, 1 run per cell).
- **One maintainer on both sides, one rater.** Same caveat as page 14 and the ablation rating.

## Where results go

- **Raw outputs:** per-run JSON, generated-set exports and screenshots under `.claude/handoff/runs/figma-fidelity/` (gitignored). Scripts stay in the session scratchpad until they earn a home (see #103).
- **Durable numbers:** a dated section in `docs/case-study-source/08-measured-impact.md` (method, N, result, caveats, tagged measured/estimated like the rest of that chapter). On page 14, replace "How to close the gap" with the results and shrink "What it doesn't prove" to what's still open. Name anything left (e.g. a multi-run B) as the next experiment.
- **Fixes the measurements surface:** through the normal path afterwards (`/figma-cli` for Figma-side, `/code-review` or `/review-component` for code-side), never mixed into measurement commits. A code bug found this way gets an issue first (bug-issue handoff convention).

## Done when

- [ ] Checker built, and the validity bar is met against the Tier 0 matrix.
- [ ] A pre-registered, run on both versions, and reported per set and in aggregate with failed-check lists.
- [ ] ADR-029 amendment for B appended; B pre-registered (prompt included), 4 runs done, and scored against the human ceiling.
- [ ] C pre-registered, run blind, and reported with a traced cause for every non-match.
- [ ] D recorded during #136, or explicitly skipped.
- [ ] `08-measured-impact.md` and page 14 updated (docs-check clock reset if a declared source changed).
- [ ] #103 commented with the checker method and whether it should become the snapshot.
- [ ] Frontmatter set to `status: done`, then `npm run handoff:tidy`.
