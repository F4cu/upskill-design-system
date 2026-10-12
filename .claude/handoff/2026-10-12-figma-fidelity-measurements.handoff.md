---
status: active
created: 2026-10-12
completed:
---

# Figma fidelity measurements: does the layered metadata bring Figma and code together?

**The claim to support:** the system's layered metadata (the ADR-026 contract, the specs, the tokens) produces Figma components that are built correctly, with the right structure and the right token use, so Figma and code end up much closer together. `docs/case-study-source/14-code-to-figma-mirror.md` shows how that works but says itself that no number shows the size of the effect. It also answers part of the case-study review: *"weakest on speed and visual fidelity to Figma."* Facts were checked on `main` on 2026-10-12.

There are two measurements, run in order, which together tell one story:

- **A. Before/after (read-only):** the contract brought Figma and code together. This shows how big the change was.
- **B. With/without metadata (4 generation runs):** the layered metadata (spec + component metadata) is what lets the system rebuild that alignment on its own. This shows what the metadata contributes.

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
- **Built 2026-10-12** in `.claude/handoff/runs/figma-fidelity/checker/` (gitignored, so it survives across sessions without being committed tooling; `README.md` there has the commands). It was verified without reading the measured sets: a good Button fixture scores 100% token match and 21/21 structure, a broken one surfaces every planted error, and chunked reads of an out-of-population set are byte-identical to single-call reads. Population resolved on the current file (names and ids only): **16 components, 31 sets** (17 primary + 14 part sets), none missing.
- **Scoring rules as built** (part of the pre-registration; confirm with the predictions):
  - **Coverage** counts non-instance nodes only. An instance's own properties and anything inside it belong to the nested component. Padding and gap count only on auto-layout frames; a gap on a frame with ≤ 1 visible child is skipped (it can't matter); radius counts only when non-zero or bound; stroke weight only when a stroke exists. A literal the spec itself prescribes (`{ literal, reason }`, e.g. Button's 1px border, transparent neutral fill) is excluded. Zero literals on auto-layout frames (e.g. `padding: 0`) **are counted**, per the definition above. The score also reports coverage excluding zero literals as a secondary number.
  - **Token match** applies the spec's `styles` rules in order to each variant (later rules win), mapping Figma properties back to prop conditions through `props[].figma.property` with casing-insensitive values. `State` values map to `state`, a `true` variant flag maps to that state (`Disabled=true` → `disabled`, `Pressed=true` → `favorite-pressed`), and `focus-visible` maps to `State=Focus`. A rule whose state has no Figma counterpart in the set (e.g. CardVertical `action-hover`, which lives in the nested Button icon) is listed as unresolved, not scored. CSS `color`/`fill` is checked on the TEXT and VECTOR layers under the part, including glyph overrides inside nested instances, excluding sub-parts that have their own color rule. Height/width tokens count only where the spec names one. An expected token with no binding counts as a miss.
  - **Parts** are located by layer name; a part set's root is that part (`Favorite` → the `Favorite` rules). An unlocated part is listed, not scored.
  - **Structure:** each `both`/`figma-only` prop's Figma property (each half of a `A + B` pair) exists in its `figma.set`, or in any of the component's sets when none is named. Metadata variant axes must have the same values as code (union across sets; a set may hold a subset, e.g. Button icon without Danger) and the same default on the primary set. Booleans are `BOOLEAN` or a `false`/`true` variant with default `false`. `State` holds interaction values only; `Disabled`, where present, is the first variant property. Every non-examples `figma.sets` entry exists. Components with `composition.parts` also get: a `<Comp>.Root` set, a `SLOT` property per `open` part, an instance swap plus `Has <x>` per `slot` part, and each part name as a layer in Root or as a part component.
  - **Hygiene:** placeholder property names and values, duplicate variants, empty matrix cells (excluding the intended `Disabled=true` × non-default `State`), default layer names (`Frame 12`), and frames named like an existing component (possible detached copies).
- **Overlap with #103** (system-wide naming audit, which proposes a committed `figma-components.json` snapshot plus a diff script). Run the checker as a one-off first. If it's worth repeating, the read becomes #103's snapshot and the scoring becomes its script. A new frozen snapshot needs an ADR-002 amendment. #103 predates the spec rollout and diffs against metadata `variants`/`composition.parts`; the checker uses the spec, which is now the better source.

## Measurement A: before/after (the contract's effect)

Run the checker on the file as it was before the October contract work and on the current file. The 16 linked sets are the population in both. Where a set didn't exist or wasn't linked "before", count it as missing, not as 0%.

- **Before version:** the last Figma version before **2026-10-06**. That date is the start of the October contract work: the per-variant Button token pass, CardVertical `Root` + slots, then ADR-026 on 2026-10-07, Tier 3 on 2026-10-11, and the specs on 2026-10-11. Duplicate it from version history into a scratch file and record its version id and timestamp here. If history doesn't reach that far, fall back to the last version before the first Tier 3 edit (2026-10-10 evening), and say in the results that the "before" already includes the 2026-10-06 work.
- **After version:** the current file. Record its version id and timestamp at read time.
- **Cross-check, not a replacement:** the Tier 0 matrix (2026-10-10) and the drift log already list what was wrong. Every Tier 0 finding should show up as a failed check in the "before" run. If one doesn't, the checker has a gap. Fix the checker, not the result.
- **Output:** per set and in aggregate, the three scores before and after, plus the list of failed checks in each version.
- **What A can claim:** the contract (ADR-026 rules, the alignment passes and the spec as their record) closed the gap between Figma and code, by this much. **What it can't:** credit the specs. Tier 3 (PR #140) fixed the file before the specs were written (PR #142), so the spec is A's yardstick, not its cause. That's B's job.

## Measurement B: with/without metadata (the metadata's effect)

Can the system rebuild a correctly built Figma component from code, and how much does the layered metadata contribute?

- **Components (2), chosen to cover both halves of "correct structure":**
  - **Button:** variants, interaction and configured states, tokens per state, the two-set split `Button` / `Button icon`, and a recorded divergence (no Danger icon-only style).
  - **CardVertical:** compound architecture. A preset set plus `CardVertical.Root` with native slots, built from 12 parts (ADR-023 2026-10-06 amendment). This is where the metadata's structural guidance should matter most.
- **Arms (2), 1 run each, so 4 runs:**
  - **Code-only:** `index.tsx`, `<Name>.module.css`, built `tokens.css`, `figma-variables.json`.
  - **Code + metadata:** the above plus `<Name>.spec.json` and `<Name>.metadata.json`. Metadata is in because the part kinds (`fixed` / `slot` / `open`) that determine how each part is built in Figma (`open` → native slot, `slot` → instance swap + `Has <x>`) live in `composition.parts`, not the spec.
  - Neither arm gets page 14, ADR-023/025/026, `packages/components/AGENTS.md`, or the drift memory note. The task prompt is identical apart from the file list. Commit the prompt text to this handoff before the first run.
- **Build scope:**
  - **Button:** both sets.
  - **CardVertical:** the preset set and `CardVertical.Root`, plus the part components Root needs (`Title`, `Meta`, `Duration`, `Certified`, `Completed`, `Favorite`, `Menu`). Excluded: the `CardVertical examples` section (`2871:8034`), which isn't a component and is built from instances only.
  - Existing components the generated sets nest (`Image`, `ProgressBar`, `Button icon` for the action glyph, icons) stay in the scratch file and may be reused.
- **Scratch file:** duplicate the main file. In the copy, delete the targets and **every instance of them**, keeping the variable collections. A deleted main component's instances stay readable, so the generator could copy them.
  - Button targets: `Button` `57:1265`, `Button icon` `54:1192`.
  - CardVertical targets: the preset `52:4270`, Root `2871:7567`, the part components (`2871:7493`, `7495`, `7500`, `7504`, `7505`; `Favorite` `2852:7708`, `Menu` `2852:7709`) and the examples section.
  - CardVertical has 241 instances across `Layout Examples` (120), `Cards` (57), `Carrousels` (32) and `Mockups` (32), counted 2026-10-12.
  - `Button icon` is also nested inside `Favorite`/`Menu`. Run the Button and CardVertical builds in separate duplicates, so each deletion is limited to its own targets.
  - Use a fresh duplicate per run so no arm sees another arm's output. The generator must never read the main file.
- **Each run:** a fresh session (or one fresh subagent per run, sequential, never parallel, per the loop guardrails) builds the component set(s) with `/figma-cli` in its scratch file. No human correction during the run. Log turns, tokens and wall time. CardVertical runs will be long: bound every eval and run them under a time limit (`/figma-cli` pitfalls: a runaway eval freezes Figma Desktop).
- **Scoring:** the checker on each generated set, compared with Measurement A's "after" score for the hand-aligned sets (the human ceiling).
- **What B can claim:** with N = 1 run per cell, a directional difference per score, reported as an observation, not an effect size. If the arms differ by less than the run-to-run noise you'd expect, say it's inconclusive. Don't add runs after seeing results unless the pre-registration says so.

### B runner setup and task prompt

**Isolation (runner, not part of the prompt).** A run inside the repo would leak the answer: reading any file under `packages/components/` loads `packages/components/AGENTS.md`, which spells out the Figma mapping rules (`Has <x>`, `Root` + native slots, `Disabled` first). The root `CLAUDE.md`/`AGENTS.md`, the project memory and the `/figma-cli` command (its rule 5 points at `metadata.json`) leak the same way. So each run is a fresh Claude Code session started in an isolated directory outside the repo, holding only that arm's files:

```
<scratchpad>/fidelity-b/<arm>-<component>/      # arm ∈ code-only | code-metadata
  index.tsx
  <Name>.module.css
  tokens/primitives.css
  tokens/brand.upskill.css                       # the default brand (DEFAULT_BRAND in packages/tokens/build.js)
  tokens/theme.light.css
  tokens/theme.dark.css
  tokens/device.desktop.css
  figma-variables.json
  <Name>.spec.json                               # code-metadata arm only
  <Name>.metadata.json                           # code-metadata arm only
```

- Copy the files from `main` at a recorded commit, no `.git`, no `CLAUDE.md`, no `.claude/`. Check `~/.claude/CLAUDE.md` holds nothing about this repo, and that the directory has no project memory.
- The Figma file open in Desktop is that run's fresh scratch duplicate. Name it `fidelity-b-<arm>-<component>` and pass the name to the session as `FIGMA_FILE`.
- Known residual leaks, equal in both arms: code comments cite ADR numbers (`ADR-024` in Button `index.tsx` and CardVertical's CSS) without their content; the scratch file still holds other components (CardHorizontal's `Has progress`, Chip's `Pressed` × `State`) a generator may look at. Both are the real-world condition and stay.
- After each run, save the transcript to `.claude/handoff/runs/figma-fidelity/b-<arm>-<component>.jsonl` and check it for reads outside the run directory, Figma MCP calls, and any forbidden command below. A run that broke a rule is reported as void, not re-run silently.

**Task prompt (verbatim; only `{COMPONENT}`, `{FILE_LIST}` and `{FIGMA_FILE}` change between runs):**

```text
You are building the Figma library component for {COMPONENT}, a coded React
component in a design system. Code is the source of truth; the Figma component
must mirror it.

Everything you have is in this directory:
{FILE_LIST}
Read all of it before you start.

Goal: a Figma component that a designer can place instead of the coded
component, with nothing to detach or rebuild. It should expose the same
options a developer can configure in code, show the same states, use the same
design tokens in each state, and look the same. Build it the way you would for
a production design-system library.

Figma file: the file open in Figma Desktop named "{FIGMA_FILE}". It already
contains the design-token variables (figma-variables.json lists them) and
other library components you may reuse as nested instances. Bind visual
properties to the existing variables wherever one fits. Do not create, rename
or delete variables, and do not change anything that already exists in the
file. Put everything you build on a new page named "{COMPONENT} (generated)".

Tooling: drive Figma with figma-cli (installed, already connected; check with
`figma-cli status`, set FIGMA_FILE="{FIGMA_FILE}" on each command).
`figma-cli eval --file <script.js>` runs Figma Plugin API code in the file and
prints the script's return value. Practical notes about the tool:
- Output over 20,000 characters is cut off mid-JSON. Return compact results.
- Use the async APIs (getNodeByIdAsync, getLocalVariablesAsync, ...) and call
  `await figma.loadAllPagesAsync()` before searching other pages.
- Load every font with `figma.loadFontAsync` before creating or editing text.
- A node created with clone() lands on the current page; move it explicitly.
- An unbounded loop freezes Figma Desktop. Bound every loop. A failed eval
  does not roll back, so make scripts safe to run twice.
Do not use these figma-cli commands: import, tokens, variables/var and
collections/col writes, recreate-url, screenshot-url, analyze-url. Do not use
any other Figma tool or MCP server.

Work on your own: don't ask questions. When something is ambiguous, decide,
and note the decision. If a step fails, fix it and continue.

When you are done, reply with:
1. Every component and component set you created: name and node id.
2. For each set, its component properties (name, type, values, default).
3. Your decisions and assumptions, one line each.
```

`{FILE_LIST}` is the directory listing above for that arm, one path per line. The prompt doesn't name the spec or metadata files or say what's in them. In the code-metadata arm they're simply in the list.

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

*Drafted 2026-10-12. **Confirmed by the developer 2026-10-12, unchanged: predictions, reporting bars, the checker's scoring rules ("Scoring rules as built") and B's task prompt. Frozen from this point.** Anything learned later is reported against these lines, never edited into them.*

### Checker validity

- **Bar:** every gap in the Tier 0 matrix that predates the before version shows up as a failed check in A's "before" run. That includes Breadcrumb link `State=Active` as the resting state, `Property 1 = Default / Variant2`, `state3`/`state4`, `Disabled` inside `State` on the six Tier 3 sets, and missing `State=Active` on Accordion / DropdownMenu/Item / ButtonArrow. Plus the drift-log items from 2026-10-06: `Button icon` Accent default one step too light, Transparent hover with no tint, 9 Large variants bound to `space/250`. One missed item means fix the checker and re-run before reporting anything.
- **Answer-key check (before B):** the B components' spec and metadata `figma` fields must match the hand-aligned sets.
  - **Button: cleared 2026-10-12** (#145). `disabled` maps to the `Disabled` property, confirmed by read-back on both sets.
  - **CardVertical: cleared 2026-10-12, read back the same day.**
    - The preset (`52:4270`, 12 variants) matches the spec: `Has action` + `Action`, `Title`, `Duration`, `Certified`, `Size` lg/sm (lg), `Status` (Not started), `State` Default/Hover.
    - Root (`2871:7567`) matches on `Body` (slot), `Has action` + `Action`, `Size`.
    - Parts match: `Title`, `Duration` (text), `Meta` (`Children` slot), `Certified`, `Completed`, `Favorite` (`Pressed`), `Menu` (`Expanded`, a recorded divergence).
    - **Fixed:** the spec mapped `Progress.value` → `completion` (ProgressBar's pre-Tier 3 name, copied from a stale ADR-023 example). Figma has `Has progress` on Root driving an exposed nested `ProgressBar` whose property is `Value`. The spec now records `Has progress + Value`; ADR-023 and ADR-026 amended 2026-10-12 (optional parts get a `Has <x>` boolean).
  - Checkbox was read back too (`92:8772`, all props match) before it was swapped out of B for CardVertical.
- **Layer-name scoring rule (decided by the component choice):** the anatomy layer-name check applies only to components with `composition.parts` (the ADR-023 naming contract binds parts), so CardVertical is scored and Button is not. Naming note for the ceiling: `Favorite` and `Menu` are set names without the `CardVertical.` prefix the other parts carry. Score part names by layer name (the Root's `Action` layer is correct), not by set name.

### A — before/after

- **Before version used:** _TODO at read time_ (version id, timestamp, pre-2026-10-06 or fallback)
- **Prediction:** the contract closed most of the gap. Structure moved the most and token use the least, because variables have been mirrored since June.
  - **Token use, binding coverage:** before ≈ 80% → after ≥ 95%.
  - **Token use, token match:** before ≈ 70% → after ≥ 90%. Misses before: wrong ramp step, primitive instead of semantic, no hover tint.
  - **Structure:** before ≤ 50% (4 of 16 sets unlinked and counted as missing, 6 sets with `Disabled` in `State`, no `Active` previews) → after ≥ 95%.
  - **Hygiene:** before ≥ 4 placeholder property names (`Property 1`, `Variant2`, `state3`, `state4`) → after 0.
- **Reporting bar:** a score counts as improved if it rises ≥ 20 points. Report every set whose "after" structure or token match is below 90% by name, with its failed checks, as a remaining gap. Don't fold it into the aggregate. If structure doesn't move ≥ 20 points, the headline claim is not supported. Say so.

### B — with/without metadata

- **Task prompt (verbatim):** drafted 2026-10-12 in "B runner setup and task prompt" above, with the isolation setup. Confirm before the first run; frozen after.
- **Hypothesis (developer's):** without the metadata, the generated components look right at first glance. Underneath, the structure and labelling don't match code, tokens are bound to the wrong states, and property names don't align.
- **Prediction per score (code-only vs code + metadata, Button and CardVertical reported separately, then pooled):**
  - **Visual (C rating):** about the same on the preset defaults. Code-only no more than one scale step below code + metadata on any pair. *This is the "looks good on the surface" half.*
  - **Token use, binding coverage:** about the same, both ≥ 85% and within 10 points of each other. The CSS Module names every token, so tokens get used.
  - **Token use, token match:** code-only ≥ 15 points lower. *Tokens on the wrong states.* Expected misses: Button per-variant hover/active fills and disabled treatment; CardVertical hover on the card versus action-hover / action-active on the Favorite and Menu triggers, and the pressed Favorite glyph.
  - **Structure:** code-only ≤ 60%, code + metadata ≥ 85%. *Labelling and names don't align.*
    - Expected Button failures (code-only): one set with a `Shape` variant instead of the `Button` / `Button icon` split; `Disabled` modelled as a `State` value; missing `Has icon` / `Has trailing icon` booleans; text property named `children` instead of `Text`; no `Active` state.
    - Expected CardVertical failures (code-only): the preset only, with no `CardVertical.Root`, or a Root with nested frames instead of native slots for `Body` and `Meta`; `progress` exposed as a number or omitted instead of the `Status` variant; no `Has action` + `Action` instance swap; part layers named generically (`Frame`, `Group`) instead of the part names.
    - **The CardVertical structure gap should be the largest single difference in B.**
  - **Hygiene:** code-only ≥ code + metadata violations (more placeholder layer names).
- **Reporting bar:** N = 1 per cell. A % score counts as different only if the arms differ by ≥ 15 points. Below that, report "no difference shown."
  - **Supported:** structure and token match both clear the bar in the metadata arm's favour *and* the visual rating is within one step.
  - **Partly supported:** only one of structure or token match clears the bar.
  - **Not supported:** code-only structure is ≥ 80%, or within 15 points of code + metadata.
  - If code-only looks clearly worse visually, the "surface" half is wrong. Report that as a finding too.
  - Report the CardVertical Root + slots result on its own line even if the pooled numbers hold up.
  - No extra runs after seeing results.

### C — visual outcome

- **Prediction:** on the current file, ≥ 12 of 16 default states rated "matches", none rated "wrong". Non-matches trace to text rendering (Figma vs Chrome antialiasing) or the line-height representational divergence, not to tokens or structure. Configured states score slightly lower than defaults, because they were added later.
- **Reporting bar:** report the full distribution (matches / minor / wrong) for defaults and states separately, with a traced cause for every non-match. Any "wrong" is reported by name and gets an issue, whatever the total.

## Caveats to carry into the case study

- **Circularity.** Scoring Figma against the spec it was aligned to comes out high by construction. The hygiene score and the visual rating don't depend on the system's own yardstick, which is why they're in the report. Lead with them when the structure score is near 100%.
- **Attribution.** A credits the contract plus the effort of applying it, not metadata alone. B is the part that isolates the layered metadata (spec + metadata together, not each separately), and it's small (2 components, 1 run per cell).
- **One maintainer on both sides, one rater.** Same caveat as page 14 and the ablation rating.

## Where results go

- **Raw outputs:** per-run JSON, generated-set exports and screenshots under `.claude/handoff/runs/figma-fidelity/` (gitignored). Scripts stay in the session scratchpad until they earn a home (see #103).
- **Durable numbers:** a dated section in `docs/case-study-source/08-measured-impact.md` (method, N, result, caveats, tagged measured/estimated like the rest of that chapter). On page 14, replace "How to close the gap" with the results and shrink "What it doesn't prove" to what's still open. Name anything left (e.g. a multi-run B) as the next experiment.
- **Fixes the measurements surface:** through the normal path afterwards (`/figma-cli` for Figma-side, `/code-review` or `/review-component` for code-side), never mixed into measurement commits. A code bug found this way gets an issue first (bug-issue handoff convention).

## Done when

- [ ] Checker built (done 2026-10-12, fixture-verified), and the validity bar is met against the Tier 0 matrix on A's before read.
- [ ] A pre-registered, run on both versions, and reported per set and in aggregate with failed-check lists.
- [ ] ADR-029 amendment for B appended; B pre-registered (prompt included), 4 runs done, and scored against the human ceiling.
- [ ] C pre-registered, run blind, and reported with a traced cause for every non-match.
- [ ] D recorded during #136, or explicitly skipped.
- [ ] `08-measured-impact.md` and page 14 updated (docs-check clock reset if a declared source changed).
- [ ] #103 commented with the checker method and whether it should become the snapshot.
- [ ] Frontmatter set to `status: done`, then `npm run handoff:tidy`.
