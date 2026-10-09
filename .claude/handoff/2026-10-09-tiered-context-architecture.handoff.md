---
status: active
created: 2026-10-09
completed:
---

# Tiered context architecture (ADR-029) + implementation

**Question:** the harness ablation (`archive/2026-10-07-harness-ablation-eval.handoff.md`, `scripts/harness-ablation/results.md`) showed that written-down context is what makes components shippable, and that the always-on gate + reviewer loop doesn't move the headline. Which context architecture should the system commit to, and what does the loop look like afterwards?

**Answer to record:** Option C, the tiered hybrid. A tool-agnostic `AGENTS.md` root index + package-scoped conventions + machine-readable metadata/spec JSON as the main carrier of per-component knowledge + deterministic gates as scripts/CI. The adversarial reviewer becomes **risk-triggered** (interactive components), not the default.

**Supersedes:** `2026-10-08-agents-md.handoff.md`. Its product scope (ship `AGENTS.md`, extend `claudemd:check`, amend ADR-017) and its eval scope (Arm 1b) are absorbed into Steps 2 and 6 below, unchanged in substance.

## Evidence (measured, 27 runs, `claude-opus-5-5`, N = 3 per cell)

| Arm | Clean | $/clean | Context tokens / run (badge · cardvertical · checkbox) |
|---|---:|---:|---|
| 0 · Bare repo | 6/9 | $0.73 | 246K · 345K · 668K |
| 1 · Context only | 9/9 | $0.91 | 871K · 1,284K · 1,060K |
| 2 · Full harness | 9/9 | $1.54 (+69% vs Arm 1) | 1,199K · 1,641K · 1,474K (main session only) |

Token counts are summed from `scripts/harness-ablation/.runs/*/arm*/run-*/result.json` (input + cache write + cache read). They're not in `results.md`.

- **Context earns its cost:** the only change in the headline is Arm 0 → Arm 1 (Checkbox 0/3 → 3/3). The six Arm 0 product violations (`callback-name-drift`, `raw-text-prop-render`) are conventions written in ADRs and metadata.
- **The loop doesn't:** Arm 2 never beats Arm 1 on any task. All 12 gate retries were `metadata:validate` (self-inflicted compliance churn, zero product defects repaired). Arm 2 regressed Badge prop-vocabulary (0.7 vs Arm 1's 0.0).
- **The reviewer finds real things above the headline:** forced-colors handling, APG keyboard test gaps, type narrowing. Those are concentrated in **interactive** components. On Badge (display-only), its main fix repaired a contrast miss Arm 2 created itself.
- **Static vs pulled context:** in Arm 1, CLAUDE.md (~5K tokens) + `components.md` (~3.6K) × 23 turns ≈ 200K, about 23% of Badge's 871K. The rest is the agent reading ADRs, metadata and specs on demand.
- **The monolith ceiling is already measured:** CLAUDE.md is at 19,993 / 20,000 bytes with 27 components.

## What the data does NOT support

Write these into the ADR. Don't round them up.

- **Option A vs Option B is unmeasured.** Arm 1b never ran and `AGENTS.md` doesn't exist. All 27 tasks touched `packages/components/**`, so path-scoping never saved anything in this task set. Option C is chosen on structure and low regret, not on a measured A/B difference.
- **Portability is unmeasured.** Every run used Claude Code.
- **Confidence is limited.** N = 3, and only 1 of 3 tasks separated the arms. The scorer has a contrast blind spot (jsdom axe has `color-contrast` off).

---

## Step 1 · Write ADR-029 (its own PR, first)

`docs/decisions/029-tiered-context-architecture.md`, copied from `000-template.md`. Status `accepted`. ADR-028 is the latest, so 029 is next.

**Context:** the three candidate architectures:
- **A**, a monolithic always-loaded `AGENTS.md` index (Vercel style)
- **B**, path-scoped on-demand rules (Atlassian style; this is what we run today, with a 20KB always-loaded CLAUDE.md on top)
- **C**, the tiered hybrid

Then the ablation evidence and the "does NOT support" list above, verbatim, plus the four pillars: scalability, portability, cost per clean component, deterministic QC.

**Decision:**
1. **Tier 0, root index:** `AGENTS.md`, ≤8KB, tool-agnostic. It holds invariants and pointers, never procedures. It contains:
   - the fixed component set
   - the token layer order and the `var(--ds-*)`-only rule
   - the layout grammar invariants
   - the ADR-009 extend/new/internal test
   - pointers to metadata, specs, the schema and the frozen snapshots
2. **Tier 0b, Claude-specific root:** `CLAUDE.md` imports `@AGENTS.md` and keeps only Claude-specific content: agentic moments, commands/skills, MCP policy, git workflow, knowledge routing.
3. **Tier 1, package-scoped conventions:** loaded by path, never globally. The delivery mechanism is decided in Step 3. Either keep `.claude/rules/` with `AGENTS.md` pointers for other tools, or move to nested `packages/*/AGENTS.md` with Claude delivery through a nested `CLAUDE.md` → `@AGENTS.md`.
4. **Tier 2, per-component knowledge:** lives in `metadata.json` / `*.spec.json` only (schema-validated, tool-neutral). Never add a per-component rules file. That rule is what keeps Option B's fragmentation risk from materialising at 100+ components.
5. **Tier 3, enforcement:** deterministic scripts and CI (`components-check.yml` already runs the full gate on every PR). Prose never enforces what a gate can.
6. **Loop change (amends ADR-007):** `/add-component` spawns the adversarial reviewer **only for interactive components**. Use the same derivation `scripts/a11y-coverage.js` uses for Tier 2: `component.type ∈ {interactive, input}`, an interactive ARIA role, or a keyboard contract. Every other component gets the in-session `/code-review` path. `--review` forces the subagent and `--no-review` skips it. `--eval` keeps current behaviour, so Arm 2 stays re-runnable.

**Alternatives:** Option A alone (rejected: CLAUDE.md already at its cap with 27 components, plus the Atlassian ~92% token inflation when conventions are dumped instead of indexed); Option B alone (rejected: `.claude/rules/` is Claude-only, which locks the system to one tool); keeping the reviewer always-on (rejected: +69% $/clean with no change to the headline across 9 runs).

**Consequences:**
- Two always-loaded files to keep in sync, with a budget gate on both.
- Non-Claude tools don't get automatic path-scoped loading unless Step 3 picks nested `AGENTS.md`.
- Display-only components lose the reviewer's above-headline catches. Accept this; the contrast blind spot is tracked separately.
- **Revisit triggers:** Arm 1b ≠ Arm 1 on violations or tokens (Step 6); the out-of-path task shows path-scoping matters; Accordion shows the reviewer earning its cost on display components too.

**Cross-amend in the same PR:**
- **ADR-017:** dated `## Amendment (2026-10-…)` section covering the second always-loaded file and the budget contract counting imported content. Bump `Amended:`.
- **ADR-007:** dated amendment covering reviewer triggering. "≤2 agents" still holds; the second agent is now conditional. Bump `Amended:`.

**Docs touch:** `docs/case-study-source/08-measured-impact.md` → the ablation section's "No ADR changes on the strength of 27 runs" line becomes a pointer to ADR-029. Also fix the stale context-budget numbers: `components.md` is now 14,428 bytes (~3.6K tokens, not ~1,900), and CLAUDE.md is 19,993 bytes.

**Done when:** ADR-029 is merged, ADR-017 and ADR-007 carry dated amendments, `npm run docs:check` is green.

---

## Step 2 · Ship `AGENTS.md` (its own PR)

> **Status (2026-10-09):** shipped in PR #124. Claude Code 2.1.280 loads `AGENTS.md` natively, with no double load when imported (recorded in the ADR-029 amendment). Effective budget is 24,000 B (20,860 used). **Open:** the portability smoke test (6) hasn't run because no Codex or Cursor is installed.

1. **Check native support first.** Does the current Claude Code read `AGENTS.md` without an import? Record the answer in ADR-029. Keep `@AGENTS.md` in CLAUDE.md either way if it's harmless (no double load). Check with `/context` in a fresh session.
2. **Draft `AGENTS.md` by moving content out of CLAUDE.md, not copying it.** Candidates:
   - Project purpose (one paragraph)
   - Token architecture summary (layer order, breakpoints, DTCG + `$deprecated` rule)
   - The Style Dictionary "consume built output only" invariant
   - Figma-sync vocabulary + "code is source of truth"
   - Layout grammar invariants
   - Coding conventions + file naming
   - Component scope + ADR-009 test
   - ADR index pointer

   Leave in CLAUDE.md: agentic moments, commands/skills, MCP policy, git workflow, frozen-memory table (Claude-loop specific), knowledge routing table, common tasks.
3. **Compress.** Use an index style: one line per invariant plus a pointer. Hard cap 8KB.
4. **Extend `scripts/claude-md-check.js`:**
   - `AGENTS.md` ≤ 8,000 bytes.
   - CLAUDE.md's **effective** size (its own bytes + resolved `@imports`) gets its own budget. Choose a number and record it in the ADR-017 amendment; ~24KB total keeps the effective prefix flat.
   - Fail if an invariant appears in both files: compare normalised lines and flag exact duplicates.
5. **Update CLAUDE.md "Where knowledge lives":**
   - Add a row: "Tool-agnostic invariant any coding agent needs → `AGENTS.md`".
   - Change the litmus test to two questions. Needed by any tool → `AGENTS.md`. Needed by Claude sessions only → CLAUDE.md.
6. **Smoke-test portability (manual, record the result in the PR):** open the repo in one non-Claude tool (Codex CLI or Cursor) and ask it to list the fixed component set and the token layer order. It passes if it answers from `AGENTS.md`.
7. **Docs touch:** `docs/07-cli-reference.md` (or whichever doc covers `claudemd:check`), plus a short section in the context-engineering chapter.

**Done when:** `npm run claudemd:check` is green with both budgets, CLAUDE.md is smaller by what moved, and the portability smoke test is recorded.

---

## Step 3 · Decide and wire Tier 1 delivery (its own PR)

> **Status (2026-10-09):** option (b) shipped on `context/tier1-delivery`. Headless probes on 2.1.280: a nested `CLAUDE.md` loads lazily on Read (not on Write alone, same as `paths:` rules) and resolves `@AGENTS.md`; a nested `AGENTS.md` without that sibling never loads. In-repo probe: reading a tokens file loads only `packages/tokens/AGENTS.md`, and vice versa. Recorded in the ADR-029 and ADR-017 amendments. `.claude/rules/` is gone, and `claudemd:check` gates the sibling import, 16KB per pair, and an empty `.claude/rules/`. Harness Arm 0 strips the nested files.

Decide between the two options and record the choice in ADR-029 (amend in place if ADR-029 is already merged).

- **(a) Keep `.claude/rules/`** (measured in Arm 1, zero migration). Add to `AGENTS.md`: "Editing `packages/components/**`? Read `.claude/rules/components.md` first." Other tools get the conventions by pointer, not by auto-loading.
- **(b) Nested `packages/components/AGENTS.md` and `packages/tokens/AGENTS.md` become canonical.** Each package gets a nested `CLAUDE.md` containing `@AGENTS.md`, and `.claude/rules/` is removed. Codex and Cursor load nested `AGENTS.md` natively.
  - **Prerequisite:** verify that Claude Code loads a nested `CLAUDE.md` lazily, only when it reads files under that directory, and resolves its `@import`. If it loads at launch, (b) breaks the path-scoping that ADR-017 depends on. In that case pick (a).
  - If (b): `claude-md-check.js` replaces its `paths:` frontmatter check with "every nested `AGENTS.md` has a sibling `CLAUDE.md` importing it, and each is ≤ the old rule's budget".

**Recommendation:** (b) if the prerequisite holds; it's the only option that gives non-Claude tools path-scoping. Otherwise (a).

**Done when:**
- The choice is recorded.
- A session touching only `packages/tokens/**` doesn't load component conventions. Check with `/context`.
- `claudemd:check` gates the chosen layout.

---

## Step 4 · Risk-triggered reviewer in `/add-component` (its own PR)

> **Status (2026-10-09):** shipped on `context/risk-triggered-reviewer`. `isInteractive` lives in `scripts/lib.js` (shared by `a11y-coverage.js` and `scripts/component-risk.js`). The in-session path keeps the repo's existing name, `standard`, not `in-session` (that's a legacy alias `sense.js` normalizes). `run-ledger.json` entries carry `path` + `risk`; the 14 earlier entries were back-filled as `full` (7 interactive, 7 display). **Open:** the live "display finishes with no subagent" check happens on the next real `/add-component` run.

1. **Extract the interactivity derivation** from `scripts/a11y-coverage.js` into a small exported function, e.g. `isInteractive(metadata)`, so the gate and the loop share one definition. Expose it as `npm run component:risk -- <Name>`, which prints `interactive` or `display`.
2. **Edit `.claude/commands/add-component.md`, Stage 3:**
   - Run `component:risk` first.
   - `interactive` (or `--review`): Stage 3 runs unchanged (`/review-component`, one adversarial subagent).
   - `display` (or `--no-review`): Stage 3 becomes the in-session path. Run `/code-review` on the diff, then the gate, then open the PR. No subagent, and record `reviewPath: in-session` the way ADR-010's two-path model already does.
   - Update the description frontmatter and the ADR-007 invariant line ("Sequential, ≤2 agents"; the reviewer is conditional).
   - `--eval` stays exactly as today (always reviewer) so the ablation can re-run Arm 2.
3. **Update CLAUDE.md's agentic moments table**, row 6, invariant text: "Sense → scaffold → gate → visual checkpoint → reviewer if interactive (moment 7)". Stay within budget.
4. **Make sure the run ledger (`run-ledger.json`) still separates the two paths,** so a later readout can compare reviewer vs no-reviewer findings per risk tier.

**Done when:**
- `/add-component` on a display component finishes with no subagent spawned.
- An interactive one still spawns exactly one.
- `metadata:validate`, `typecheck` and `docs:check` are green.

---

## Step 5 · Cut gate churn at its source (optional, its own PR)

> **Status (2026-10-09):** shipped on `metadata/gate-churn`. The 12 failures group as 8 token-list (child `Text`/`Icon`/`Stack` tokens), 3 schema (`displayType` enum, empty `variants`), 2 CSS-spelled path, 1 stray directory. `npm run metadata:derive-tokens -- <Name>` is wired into `/component-scaffold` and `/add-component` Stage 1. The validator's errors now name the fix: enum values, the real dot-path, a binary-axis hint for empty `variants`, the derive command, stray-dir removal. Verified: wiping `tokens` on Badge, Checkbox and CardVertical and deriving passes `metadata:validate` first try; the script makes no changes on all 27 committed components. A TSX regex backtrack (`--ds-size-avata`) was fixed along the way. **Open:** the first-attempt pass on a live scaffold is confirmed on the next real `/add-component` run.

All 12 Arm 2 retries were `metadata:validate`. The recurring causes:
- tokens listed that the component reads only through `Text`/`Icon`
- a schema enum value
- a CSS-spelled token path
- a stray directory

1. Read the 12 failure messages in the Arm 2 `.run.json` files and group them by cause.
2. For the token-list cause: add a script (`npm run metadata:derive-tokens <Name>`) that fills `tokens` from the CSS module's `var(--ds-*)` refs. The scaffold then calls the script instead of hand-writing the list.
3. For enum and path spelling: make the `metadata:validate` error message show the expected value, so a retry takes one turn.

**Done when:** a scaffold of a known component passes `metadata:validate` on the first attempt.

---

## Step 6 · Close the evidence gaps (eval, after Steps 2–3)

This is the eval scope moved from the agents-md handoff, extended.

> **Status (2026-10-09):** 6.1–6.4 shipped on `eval/arm-1b`; 15 runs, $10.33. The prediction held: a tie on violations (component tasks 9/9 vs historical 9/9; feedback 1/3 vs 1/3), and 1b was cheaper on every task. That gap is not attributable to delivery (see the ADR-029 Step 6 amendment). Pointers were followed in 12/12 1b runs. All four feedback violations are `collateral-change`: Arm 1 added `green`/`yellow` hues (#128 option 1, unprompted), and Arm 1b added contrast PAIRS. The developer kept the locked trap, and the readout carries a sensitivity note (3/3 vs 3/3 under a narrower trap). The three Arm 1 "git archaeology" flags are a single `git log --oneline` on the one-commit workspace, benign. **Open:** 6.5 Accordion (Arms 1, 2); the Step 2 portability smoke test; the live `/add-component` checks from Steps 4–5.
>
> **Pre-registration (locked 2026-10-09, developer, before any Step 6 run):**
> - **Arm 1b = pointer-only.** Arm 1 minus the nested `packages/{components,tokens}/CLAUDE.md`. The nested `AGENTS.md` files stay, so Tier 1 conventions are reachable only through the root index's pointers (Vercel-style index + retrieval). Same content as Arm 1, delivery is the only change. Deleting the nested files too was rejected: it would leave the root pointer dangling and test content removal, not delivery.
> - **Baseline = historic Arm 1** for the three component tasks (no re-run). Caveat to carry into the readout: historic Arm 1 ran on the pre-ADR-029 HEAD (Option B), so a 1b difference there mixes delivery with every HEAD change since. Only the feedback task compares Arm 1 and 1b on one HEAD.
> - **New task `feedback` (token alias rebuild).** Deletes the 24 `color.{background,text,border,icon}.feedback.{error,success,warning}` tokens from `theme/light.json` and `theme/dark.json`. The brief names the 12 tokens (naming isn't under test; values and conventions are). `figma-variables.json` loses its feedback keys (it mirrors every value). ADR-014's hue rule and the two consumer references in TextField/Select stay, as convention and as a realistic prompt. **Product traps:** `tokens:build`; the baseline commit's `tokens:contrast-check` (its PAIRS and waivers, run on the workspace build); `missing-token`, `raw-value`, `scale-mix` (dark theme on a light step or vice versa), `brand-slot` (aliasing `brand`/`accent`/`neutral`/`surface`), `reserved-hue` (error not on `red`, ADR-014), `hue-split` (a tone's roles or themes on different hues), `extensions`, `collateral-change` (anything outside the target paths, including the contrast script or waivers). Secondary: reference aliases matched (n/24), Tier 1 reads, context tokens. Calibration: the shipped reference scores 0 (24/24); a planted-defect workspace fired every trap.
> - **Stage 0 fix:** the reference's dark `icon.feedback.warning` was `{color.amber.7}` (light-scale step in dark, since the initial commit). Now `{color.amber.dark.9}`, matching error/success, contrast-check green. Figma still holds `amber/7`.
> - **Known reference conflict (not trapped):** success = `teal` (upskill accent) and warning = `amber` (horizon accent) are brand-slot hues, which ADR-014's "by extension" clause discourages. Only error has a dedicated hue, so `reserved-hue` covers error only. Tracked as #128.
> - **Prediction:** component tasks: 1b = Arm 1 on violations (0), 1b uses fewer context tokens/run, and reads `packages/components/AGENTS.md` by pointer in ≥2/3 runs per task. Feedback: Arm 1 = 1b on violations; neighbouring `dark.json` tokens and ADR-014 carry the scale and hue rules even when `packages/tokens/AGENTS.md` isn't read.
> - **Runs:** `claude-opus-5-5`, effort medium, `--max-budget-usd 5`, N = 3. 1b × {badge, checkbox, cardvertical} × 3 + {1, 1b} × feedback × 3 = 15 runs.

1. **Arm 1b in `scripts/harness-ablation/prepare.js`:** copy Arm 1 and replace Tier 1 delivery with the shipped `AGENTS.md` only (no `.claude/rules/`, no nested files). It uses the real shipped file, not an eval copy.
2. **Add one task outside `packages/components/**`.** It's the only kind of task where path-scoping and an always-loaded index can behave differently. Candidates: a token alias change, or a small showcase layout section validated by `layout:validate`.
   - Lock its brief, traps and checklist before any run, and pre-register the prediction.
   - Run Arms 1 and 1b only.
3. **Runs:** 1b × 3 existing tasks × 3 runs + (1, 1b) × new task × 3 runs = 15 runs, about $15.
4. **Readout against the revisit triggers in ADR-029.** Amend ADR-029 with the result even if nothing changes. Under the honest-outcome rule, a tie is a reportable result.
5. **Separately (lower priority than Step 6.1–6.4 for this ADR, higher for ADR-007):** the pre-registered Accordion stretch task, Arms 1 and 2. It tests whether the reviewer earns its cost where Step 4 still spends it.

> **Status (2026-10-09):** task built on `eval/accordion` (`tasks/accordion.{json,brief.md}`); `redactionsReviewed: false` until the developer locks the block below. **Open, blocks the runs:** the lock.
>
> **`accordion.reference.png` added 2026-10-09:** a 2× `figma-cli export node` of `Accordion list` / `Show more=false` (`94:15643`, set `94:15642`), cropped at 996×1136 to its 6 visible `Accordion` instances (`29:1153` set, `State=Default`: one `Open=true`, five `Open=false`, all with a subtitle). The `Show more` footer is cut, because it's Figma-only (ADR-026: code has no list component) and the brief doesn't describe it; the four hidden instances don't render. **Known Figma differences, not to count in the visual rating:** the open item's chevron is centred on the whole item (title, subtitle and content), where the code centres it on the header row; and the stack has no top border, where the code draws one.
>
> **Pre-registration (DRAFT, not locked; developer locks before any run):**
> - **Arms 1 and 2 only**, `claude-opus-5-5`, effort medium, `--max-budget-usd 5`, N = 3, so 6 runs. Arm 2 runs `/add-component Accordion --eval`, which always spawns the reviewer (Step 4 left `--eval` unchanged; Accordion is `interactive` anyway). Estimated $12–18 (Checkbox: Arm 1 $0.92, Arm 2 $1.58 per run; Accordion is larger).
> - **Brief** (`accordion.brief.md`) describes behaviour and never names props: title, optional subtitle, chevron; several sections open at once; can start open or be driven by the app, which needs to know when it changes; titles in the heading outline at level 3 by default, page-selectable; keyboard-usable; tells screen-reader users whether a section is open. It doesn't prescribe container + item vs parts vs a data array.
> - **Brief checklist (headline):** the `index.ts` export; `aria-expanded|<details` (open state announced); `<button|<summary|<Button|as="button"` (keyboard-operable header); a heading element (`<h2–6`, `` `h${…}` ``, `'h3'`, `<Heading`). **Forbidden:** rendering the panel conditionally (`{open && …}`, `? children : null`) in a file that uses `aria-controls`. That's the dead-reference bug the July pilot's reviewer caught and axe doesn't flag. Known false-positive shape, checked at transcript review: `{isOpen && <Icon …>}` for the chevron in a file with `aria-controls`.
> - **Already-existing traps that bite here:** `callback-name-drift` (`onChange`/`onToggle` on `Accordion`/`AccordionItem` JSX, canonical `onOpenChange`), plus the standard gates (typecheck, lint, `a11y:stories`, token traps).
> - **Prop vocabulary (system):** `propVocabulary.allPropTypes` (new in `score.js`) merges every `*Props` type, because the API lives on the item. Reference set: `title`, `subtitle`, `defaultOpen`, `open`, `onOpenChange`, `headingLevel`, `children`, `className`. A data-array API (`items=[…]`) will score as missing props. That's reported, never headline.
> - **Secondary, reported per run (never headline):** whether `Accordion.a11y.test.tsx` exists, and whether it asserts `aria-expanded` toggling and Enter/Space activation (read by hand at transcript review); `a11y:coverage`; Arm 2 reviewer findings by severity, each classed as *headline-visible* (would have tripped a trap or gate) or *above-headline* (APG gaps, forced-colors, reduced motion, type narrowing).
> - **Redactions (13; (a) target API, Figma mapping, tokens, internals):** ADR-013's `onOpenChange` drift example and its `title` raw-render note; ADR-026's `onOpenChange (Accordion)`, the `(Accordion)` on the `headingLevel` row, the `Accordion list` Figma-only row, the `Accordion list item` Figma mapping and the set-rename clause; `scripts/lib.js`'s `(AccordionItem)`; the contrast-check `(Accordion, …)` border note and the Accordion pair block; ROADMAP's "silent `aria-controls` dead-reference bug" (it names the forbidden-pattern defect); `/layout-generation`'s `onOpenChange` example and its "Accordion with show-more" section (Arm 2 only). `stories/CourseModuleList.stories.tsx` is deleted (it imports the target).
> - **Kept as passing mentions (b), a known advantage, symmetric across both arms:** the fixed-set list, ROADMAP history, ADR-007/008/010 history, ADR-029's own mention of this task, the command examples (`/add-component Accordion`), Button's "Show more under an accordion". **Judgement call for the developer:** ADR-009 lines 16–17/40/48 use the accordion trigger as the worked example of "internal element, not a component" (`styled <button>` in the CSS module, borderless, up/down chevron). It's internals, but rewriting it guts ADR-009's example, and with only Arms 1 and 2 running, both see it. Recommended: keep it.
> - **Calibration:** the shipped reference scores 0 product violations in Arm 0 and Arm 2 workspaces (all gates, `metadata:validate`, `a11y:coverage`, vocabulary pass). A planted-defect workspace (no `aria-expanded`, `<span role=button>`, no heading, conditional panel, `onToggle`) fired all four checklist traps, `callback-name-drift`, typecheck, lint, `a11y:stories` and the vocabulary check. The forbidden pattern passes 7 unit cases (with/without `aria-controls`, before/after, ternary, negation, `subtitle &&`, `hidden=`). Leak reports: 23 (1b) / 26 (2) lines, all on the kept list.
> - **Known reference properties (so a reviewer finding isn't misread):** the reference has no `prefers-reduced-motion` handling for its height/opacity transitions, no hover style on the trigger, and relies on the global `:focus-visible` ring (ADR-028). A reviewer flagging any of these is above the reference, not a gap in the arm.
> - **Revisit trigger, made operational (ADR-029 "Accordion … failing to earn it on interactive ones"):**
>   - *Reviewer earns its cost on the headline* if Arm 2 has more clean runs than Arm 1, or the dead-reference trap fires in ≥1 Arm 1 run and in no Arm 2 run.
>   - *Fails to earn it on the headline* if Arm 2's clean count ≤ Arm 1's. ADR-029 then records that the risk trigger rests on above-headline findings alone, and those are counted and reported but not scored.
> - **Prediction:** Arm 1 = Arm 2 on the headline (both ≥ 2/3 clean). Arm 2 costs 1.5–2× per clean component. Arm 2's reviewer reports ≥ 1 above-headline finding per run, mostly on the a11y test's keyboard coverage. Arm 1 writes the a11y test in ≥ 2/3 runs (`packages/components/AGENTS.md` says interactive components need one), but its keyboard assertions are thinner than Arm 2's.
> - **Honest-outcome rule** as before: no brief or trap tuning after a run, except scorer false positives found at transcript review, recorded here and rescored from the retained workspaces.

**Done when:** `results.md` has an Arm 1b row, ADR-029 carries a dated amendment with the readout, and `08-measured-impact.md` is updated.

---

## Order and PR hygiene

Step 1 → Step 2 → Step 3 → Step 4 → (Step 5 any time) → Step 6.

- Each step touches a declared doc source, so each PR needs a same-PR doc touch (docs-check coupling).
- Run `npm run handoff:tidy` when this handoff's status changes.
