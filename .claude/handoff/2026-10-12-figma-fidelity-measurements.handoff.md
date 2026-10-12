---
status: active
created: 2026-10-12
completed:
---

# Figma fidelity measurements: turn the mirror's mechanism into numbers

Case-study review feedback: *"The UpSkill evidence is strongest on accuracy and cost, and weakest on speed and visual fidelity to Figma."* `docs/case-study-source/14-code-to-figma-mirror.md` (merged) shows the mirror's mechanism, but it says itself that there's no number for the size of the effect. This handoff runs the two read-only measurements that page proposes, plus an optional third one for speed, and writes the results back into the case study. Facts were checked on `main` on 2026-10-12.

**Read first:** page 14 ("The spec as the mirror's per-component contract", "What it doesn't prove", "How to close the gap"); `08-measured-impact.md` (the blind visual rating method and its caveats); `/figma-cli` (hard rules and the 20,000-character truncation pitfall).

## Ground rules

- **Not an eval arm.** The harness is frozen at `044d28f` (ADR-029 amendment, 2026-10-12). These measure the **shipped library**, not an agent's first draft. Don't touch `harness-ablation` or add arms.
- **Interactive and local.** Figma reads go through `/figma-cli` (Figma MCP as fallback), with the developer present. Never CI, never scheduled. File key `t4F3b1p03loOX9IpNXRaYR`.
- **Read-only in Figma.** No renames, rebinds or fixes during a measurement. Note what you find and fix it afterwards in its own pass, so the "before" number stays honest.
- **Pre-register.** Before each read, write the prediction and the reporting bar into this file (section "Pre-registration"). Report the result against it, including a miss, the way the spec accept test was reported.
- **Report the denominator.** 16 of 27 components link to a Figma set (`figmaNodeId`); the other 11 are `none` by decision. Every number says which population it covers.

## Measurements

### 1. Binding coverage and token match (fidelity of Figma to code)

What share of the visual properties in the linked component sets are bound to a variable, and does the bound variable equal the token the spec names for that part and state?

- **Population:** the sets in the 27 specs' `figma.sets` (Button and CardVertical list theirs), otherwise each `figmaNodeId` set. Include part sets (`_TextField/Input`, `_Select/Trigger`, `_Breadcrumb/Link`, `_AppHeader/NavItem`, CardVertical parts).
- **Read, per variant node and its non-instance descendants:** fills, strokes, stroke weight, corner radius, padding (4 sides), item spacing, font size / weight / line-height / family. For each: bound variable name, or the literal value if unbound.
- **Two numbers per set:**
  - **Binding coverage** = bound ÷ (bound + literal). Exclude what can't be bound by construction (line-heights per ADR-002 2026-06-22; zero padding on a frame with no auto-layout).
  - **Token match** = bound properties whose variable maps (by the drift-log naming map) to the token in the spec's `styles` for that part, CSS property and condition ÷ bound properties the spec has an entry for. Map Figma variants to spec conditions through the prop table (`figma.property`) and ADR-025/026 (`State=Hover` → `:hover`, `Disabled=true` → `disabled`, …).
- **Output:** per set, coverage %, match %, and a list of mismatches (part, property, Figma variable, spec token). Aggregate across the population.
- **Mechanics:** one `figma-cli eval --file` script in the session scratchpad. Output is cut at 20,000 characters, so emit compact JSON per set and parse each chunk before the next call. The comparison against specs is a local Node script in the scratchpad that reads committed files only.
- **Expected side already exists:** `styles` is part → conditions → CSS property → token path, and `spec:validate` guarantees it equals the CSS Module's `--ds-*` reads. So a mismatch is Figma vs shipped CSS, not Figma vs a document.
- **Overlap with #103** (system-wide naming audit, proposes a committed `figma-components.json` snapshot + diff script). Do the measurement as a one-off first. If it's worth repeating, the read becomes #103's snapshot and the comparison becomes its script. That's a new frozen snapshot, so it needs an ADR-002 amendment. Note: #103 was written before the spec rollout and diffs against metadata `variants`/`composition.parts`; the spec's `props`, `anatomy` and `styles` are now the better source of truth.

### 2. Side-by-side visual rating (shipped component vs Figma)

The reviewer's question directly: does what ships look like the design?

- **Population:** the 16 linked components; for each, the Figma variant that matches the story's default, plus one state where the story or a variant exposes it (hover isn't capturable statically, so use a configured state: `disabled`, `checked`, `Current`, `Open`). Light only for the rating, since the Figma file holds the default brand and both modes can be spot-checked after.
- **Code side:** the committed baselines in `packages/components/screenshots/` (`components-<name>--default.light.png`, ADR-019) for the default; `/run-storybook` for any state shot not in the baselines.
- **Figma side:** `get_screenshot` (Figma MCP) or `figma-cli` export of the matching variant node, at the same scale.
- **Rating:** the same blind 3-point scale as the ablation (matches / minor differences / wrong), pairs shuffled and labelled by letter so the rater doesn't know which component or which side is code. One rater (the developer); say so. For every non-match, a one-line traced cause (token, spacing, missing state, font, structure).
- **Why it's stronger than the ablation rating:** N = 16 components (×2 states) instead of 3 tasks × 1 median run, and it measures the shipped library. Say plainly that it's still one rater and not the agent's output.
- **Optional pixel diff:** where the Figma export and the Storybook shot can be aligned at the same size, a `pixelmatch` ratio is a useful secondary number. Don't let it replace the rating: text antialiasing between Figma and Chrome differs, so a nonzero diff is expected.

### 3. Optional: translation speed on the first spec-first component (#136)

The feedback also names speed, and nothing measures it. #136 (Button `loading`) is the first component change built spec-first, so it's the one natural place to record it without a new eval.

- Record wall-clock time and the number of corrections from the API proposal to a passing gate, split into: spec amended → code written → gate green → review.
- Record every Figma ↔ code question that came up and whether the spec or ADR-026 answered it, or it needed a decision. The count of questions the contract answered is the translation claim in numbers.
- N = 1 and no baseline. Report it as an observation, not an effect size.

## Pre-registration

Fill in before each read. Don't edit after a result exists.

- **M1 prediction:** _TODO_ (e.g. binding coverage ≥ 90% on the sets aligned in Tier 3; token match lower on sets not touched since the 2026-10-06 Button pass)
- **M1 reporting bar:** _TODO_
- **M2 prediction:** _TODO_
- **M2 reporting bar:** _TODO_

## Where results go

- **Raw outputs:** per-run JSON and screenshots under `.claude/handoff/runs/figma-fidelity/` (gitignored), with the scripts kept in the session scratchpad until they earn a home.
- **Durable numbers:** a dated section in `docs/case-study-source/08-measured-impact.md` (method, N, result, caveats, tagged measured/estimated like the rest of that chapter), and page 14 updated: replace "How to close the gap" with the results, and shrink "What it doesn't prove" to what's still open.
- **Fixes the measurements surface:** each one goes through the normal path afterwards (`/figma-cli` for Figma-side, `/code-review` or `/review-component` for code-side), not mixed into the measurement commits. A code bug found this way gets an issue first (bug-issue handoff convention).
- **If M1 becomes a repeatable check:** fold into #103 with the ADR-002 amendment; don't add a new snapshot without one.

## Done when

- [ ] M1 pre-registered, run, and reported per set and in aggregate, with the mismatch list.
- [ ] M2 pre-registered, run blind, and reported with a traced cause for every non-match.
- [ ] M3 recorded during #136, or explicitly skipped with a reason.
- [ ] `08-measured-impact.md` and page 14 updated with the results (and a docs-check clock reset if a declared source changed).
- [ ] #103 commented with the M1 method and whether it should become the snapshot.
- [ ] Frontmatter set to `status: done`, then `npm run handoff:tidy`.
