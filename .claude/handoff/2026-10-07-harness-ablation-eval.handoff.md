---
status: active
created: 2026-10-07
completed:
---

# Harness-ablation eval — scope

**Question:** does the harness make Claude produce shippable components that it otherwise wouldn't, and what does that cost? It is a with/without comparison in the style of Vercel's AGENTS.md eval and Atlassian's context-delivery eval. It also produces the side-by-side figure the case study is missing.

**Why not extend `pattern-accuracy-harness/`:** that harness is single-shot (`claude -p`, no tools, context pasted into the prompt). It measures *context*. This eval has to measure the *harness*: tools, gates, the retry loop and the reviewer. That needs agentic runs inside a real workspace. The scorer's trap checks are reused.

**Related:** [the spec harness arm](2026-10-07-spec-harness-arm.handoff.md) adds an Arm C to `pattern-accuracy-harness` for the ADR-027 exit condition. It shares this eval's Stage 0 scorer fix and CardVertical reference, and if ADR-027 is accepted, the specs become part of this eval's Arm 1 context.

## Arms

Every arm gets the same brief and the same model, and runs agentically (`claude -p` with tools) in a fresh workspace.

| Arm | Name | Workspace contains | Prompt |
|---|---|---|---|
| 0 | **Bare repo** | Component code, tokens, stories, standard npm scripts (`typecheck`, `lint`, `a11y:test`). **Removed:** `CLAUDE.md`, `.claude/`, `docs/decisions/`, every `*.metadata.json`, `component.schema.json`, `component-patterns.json`, every `*.spec.json`, `component.spec.schema.json`, sense/validate-metadata/validate-spec/layout scripts. | brief |
| 1 | **Context only** | Arm 0 + `CLAUDE.md`, `.claude/rules/`, ADRs, metadata, schema. **Removed:** `.claude/commands/`, `.claude/agents/`, `.claude/skills/`, so there is no loop and no reviewer. | brief |
| 1b | **Always-loaded index** | Arm 1, but `.claude/rules/` is removed and its conventions are folded into one compressed, always-loaded index: the candidate `AGENTS.md` (see "Ship AGENTS.md" below), loaded through `CLAUDE.md` → `@AGENTS.md`. Metadata and ADRs unchanged. | brief |
| 2 | **Full harness** | Everything | `/add-component <Name> --eval` + brief |

Arm 0 is the fair baseline: a team with a good component library but no agent harness. It is not "Claude with nothing". Arm 1 vs 2 separates *what the agent knows* from *the loop that checks it*, which tells you which half is earning its cost.

Arm 1 vs 1b changes one thing: how conventions are delivered, either loaded by file path (the current design) or always loaded in a compressed index. This applies Vercel's AGENTS.md-vs-skills method to the "what loads is earned" claim. Two outcomes matter:
- **1b ≥ 1 on violations:** the path-scoped split isn't earning its keep, and conventions should move into the index.
- **1b costs noticeably more tokens for the same violations:** this matches Atlassian's DESIGN.md result and supports the split.

Arm 1b is added **after the pilot**, once Arms 0/1/2 are confirmed leak-free. It needs the `AGENTS.md` draft first.

## Tasks: rebuild components that already ship

Each task deletes a shipped component from the workspace and asks for it back. The shipped version is the reference for the API checklist and for the visual comparison.

| Task | Why this one |
|---|---|
| `Badge` | Display-only, token-heavy. Tests token adherence and invented token names. |
| `Checkbox` | Input. Tests a11y contract, label association, the `onChange` callback convention. |
| `CardVertical` | Composite with parts (ADR-023). Tests composition, Text/Heading wrapping, forbidden props. |
| *stretch:* `Accordion` | Keyboard/ARIA-heavy. Add only if the pilot cost allows it. |

### Stage 0: reference calibration (before the pilot)

The shipped component is the answer key, so two things must hold before any arm runs:

1. **The reference conforms to the current ADRs.** Checked 2026-10-07:
   - **Badge:** flat props with one job, so ADR-023 doesn't apply. It uses no Button (ADR-024) and has no lifecycle or content state (ADR-025). Last review was the `standard` path on 2026-07-09.
   - **Checkbox:** already migrated to `color.background.disabled` (ADR-024 amendment, 2026-10-06). Its native `checked`/`defaultChecked`/`onChange` fits ADR-025's app-data-interaction exception.
   - **CardVertical:** it *is* the ADR-023/025 reference (parts plus the derived `Completed` state, PR #112). The brief must say whether the task is the **preset** or the **preset + parts**. Recommended: the preset only, because the parts API is too large for a fair Arm 0 task.
   - **ADR-026 prop vocabulary** (PR #115): all three conform. Badge's `variant: outline | filled` was explicitly kept (it names the look). Checkbox uses the native-input names (`checked`/`onChange`). CardVertical.Favorite already uses `pressed`/`onPressedChange`.
   - **Checkbox `reference.png`:** capture it from the aligned Figma set `92:8772` (PR #116: `Checked` × `State`, `Label`, Disabled variants), not from a pre-#116 frame. Before #116, the metadata recorded no Figma component set for Checkbox.
2. **The reference scores 0 product-quality violations under the eval scorer.** It doesn't today. Running the `pattern-accuracy-harness` traps on the shipped files gives:

   | Component | Violations | Cause | Fix belongs in |
   |---|---|---|---|
   | Badge | 0 | none | none |
   | Checkbox | 5 × `px-literal` | 1.5px border, 2px checkmark strokes, 5×9px checkmark box | **scorer**: the system's gates and full review accept these |
   | CardVertical | 2 × `px-literal` | `min-width: 220px / 160px` | **scorer**: no token category covers card min-widths |
   | CardVertical | 1 × `raw-text-prop-render` | `title` rendered inside `CardVertical.Title`, which renders `Heading` | **scorer**: it predates ADR-023 and doesn't know parts |

   - **`px-literal` scorer fix:** flag px only on properties that have a token category (`padding*`, `margin*`, `gap`, `border-radius`, `font-size`, `line-height`, `inset`). Border widths and box geometry don't count. **Done 2026-10-07:** `outline`/`outline-offset` were added to the list because ADR-028 gives them `size.focus.*` tokens. The July Accordion hits are on outline, so all 14 July cells keep their trap counts. Badge, Checkbox, CardVertical and Button now score 0 `px-literal`.
   - **Open (found during calibration):** with `*.stories.tsx` in scope, the references trip `off-scale-inline-style` on story wrapper divs (`style={{ display: 'flex', gap: '12px' }}`): Badge 3, Checkbox 3, Button 40, CardVertical 0. 16 of 27 story files use this wrapper. Decide before the pilot whether to fix the stories (use `Inline`/`Stack`) or exclude stories from the layout-grammar trap. Either way, the ablation scorer flags it in every arm.
   - **`raw-text-prop-render` scorer fix:** treat a fixed-set component's parts (`Parent.Part`, read from its metadata `composition.parts`) as typography wrappers when the part renders Text/Heading. The [spec harness arm](2026-10-07-spec-harness-arm.handoff.md) needs the same fix for its CardVertical reference; do it once in `pattern-accuracy-harness/score.js`, since this eval imports those traps.
   - **CardVertical `px-literal`:** now tracked as #120 (the raw `min-width` values break the component CSS rule). Prefer fixing the component over exempting the property in the scorer.
   - Rerun until all three references score 0. A real violation in a reference gets fixed in the component, through `/review-component` on its own PR, never by loosening the scorer.

**Brief rule:** the brief lists only deliverables any design-system team would expect: component, CSS module, story file. No metadata, no conventions. Arms 1 and 2 discover conventions from their context, and Arm 0 has to infer them from neighbouring components. The same brief file goes to all arms.

**Figma:** no Figma MCP in any arm (`--strict-mcp-config`, empty config). Each task ships a static `reference.png` of the Figma frame in the workspace, so all arms see the same design input.

## Leakage controls

- Workspace = `git archive HEAD` into a tmp dir, then a fresh `git init`, so `git log`/`git show` can't recover the deleted component.
- Delete the target component directory (which also removes its co-located `*.spec.json`), its export in `packages/components/src/index.ts`, and any story or doc that imports it. For Arms 1–2, also delete its mentions in other components' metadata (`relationships`) and in `component-patterns.json`.
- **ADRs and rules give away parts of the answers** (Arms 1, 1b, 2). The ADR-026 amendment spells out Checkbox's Figma property mapping (`Checked` × `State`, `Label`, Disabled states, variable bindings) and Badge's `variant` values. Across `docs/decisions/`, Badge appears in 4 ADRs, Checkbox in 4 and CardVertical in 7. `.claude/rules/components.md` mentions Badge once and CardVertical twice. **Decide before the pilot**, and record the choice here:
  - **(a) Redact:** in `prepare.js`, strip the lines that describe the target's API or Figma properties. Keep the general rules, even where they use the target as an example.
  - **(b) Accept the leak:** keep the files whole and report it as a known advantage for Arms 1/2. The reasoning is that a real team's ADRs would also describe neighbouring components.

  Recommended: (a) for lines about the target's own props or Figma mapping, and (b) for passing mentions used as examples.
- `--setting-sources project` so user-level settings don't leak. There's no `~/.claude/CLAUDE.md` today, and auto-memory is keyed by project path, so a tmp path gets none. Confirm both in the pilot.
- `node_modules`: symlink root and workspace `node_modules` from the main checkout instead of running `npm install` per run.
- Grep the pilot transcripts for the deleted file's distinctive strings to confirm nothing leaked.

## Scoring

The scorer runs **inside the workspace** with the real npm gates where possible, not the scratch reimplementations. Two buckets are reported separately, so Arm 0 isn't penalised for conventions it was never shown.

**Product quality (headline: what a consumer would notice)**
- `typecheck` errors · lint errors (including jsx-a11y)
- **Behavioural a11y:** axe over every story via `composeStories`. A missing story file counts as a violation, since the brief asks for one.
- **Token adherence:** raw hex / px literals in the CSS module (existing traps) plus a **new** `unknown-token` trap: every `var(--ds-*)` must exist in the built `tokens.css`. Hallucinated token names are the expected Arm 0 failure.
- **New** `invented-import` trap: imports from `@upskill/components` outside the fixed set.
- Brief checklist: `requiredPatterns` / `forbiddenPatterns` per task (existing mechanism).

**System compliance (secondary: what this system additionally demands)**
- `metadata:validate`, `a11y:coverage`, story conventions, `patterns` drift. Reported, never added into the headline.
- **New `prop-vocabulary` check (ADR-026):**
  - Run the naming-drift checks from `scripts/generate-pattern-schema.js` (`namingDrift` / `detectDrift`; they need exporting). They flag an `on<X>Change` with no matching `x` prop, a `default<X>` missing `x` or `on<X>Change`, and `selected*` props on a selection component.
  - Diff the generated props against the reference's prop names and values. A renamed concept counts as a violation; an extra prop doesn't.
  - Arm 0 never sees the vocabulary, so this stays out of the headline. But since PR #115 the neighbouring components are drift-free, so Arm 0 *can* infer the names from them. That makes this a fair comparison: inferred (Arm 0) vs told (Arms 1/1b) vs proposed and checked (Arm 2).
  - Only CardVertical has an API large enough to separate the arms; Badge and Checkbox are small or native. If prop compliance should be a real finding, that argues for the Accordion stretch task (`open`/`onOpenChange`, `headingLevel`).

**Process**
- `--output-format json` gives `num_turns`, `duration_ms`, `total_cost_usd` and token usage.
- Arm 2 only: reviewer findings beyond the gate (from `.review.json`).

**Headline metrics**
1. **Clean rate:** % of runs with zero product-quality violations.
2. Mean product-quality violations (with min–max across runs).
3. **Cost per clean component** = total cost of an arm ÷ its clean runs. This is the marketable number, because it allows "more expensive per run, cheaper per shippable result."

## Pre-registration (write before the first full run)

- **Prediction:** violations Arm 0 > Arm 1 > Arm 2. Arm 2 costs the most per run. Arm 1b: about equal to Arm 1 on violations, with more tokens per run. Write down the actual guess before running, without hedging it.
- **Honest-outcome rule:** same as pattern-accuracy. If Arm 2 doesn't beat Arm 1 by a meaningful margin, report that and question whether the loop and the reviewer earn their cost. Don't tune briefs or traps after seeing results.
- **Showcase rule:** the case-study side-by-side uses the **median** run of each arm, never the best.
- **N = 3** runs per task × arm. N = 1 is a pilot, not a result.

## Changes needed

1. **`/add-component --eval` mode** (`.claude/commands/add-component.md`).
   - **Auto-approve the Stage 1 API proposal checkpoint** (`/component-scaffold` step 3, ADR-026, added in PR #115). Under `claude -p` it would otherwise stall the run or get skipped in some unrecorded way. Accept the proposal exactly as the agent wrote it, and save it to the workspace as `api-proposal.md` so the `prop-vocabulary` score can be traced back to it.
   - Skip Stage 2b/2c (the human visual checkpoint) and record `visualReview: skipped-eval`.
   - In `/review-component`, skip branch, commit and PR, and write `.review.json`/`.run.json` into the workspace.
   - Don't append to the committed `run-ledger.json`.
2. **New `scripts/harness-ablation/`**:
   - `prepare.js <task> <arm>`: archive, strip per arm, delete target, symlink deps, drop `reference.png`.
   - `run.js`: sequential, never parallel. Resumable: skips a task/arm/run that already has `score.json`. Flags: `--task`, `--arm`, `--runs`, `--model`, `--max-budget-usd`.
   - `score.js`: in-workspace gates + traps imported from `pattern-accuracy-harness/score.js` (export `trapChecksTsx`, `trapChecksCss`, `runPatternChecks`) + the new `unknown-token` and `invented-import` traps + composeStories/axe + the `prop-vocabulary` check (export the naming-drift functions from `scripts/generate-pattern-schema.js`).
   - `prepare.js` also applies the redaction decided under "Leakage controls" to `docs/decisions/` and `.claude/rules/components.md` for Arms 1/1b/2.
   - `report.js` → `results.md`: per task × arm table, clean rate, cost per clean component. Copy each arm's median-run files into `results/<task>/<arm>/` for the case-study figure.
   - `tasks/*.json`: brief, target, files to delete, `requiredPatterns`/`forbiddenPatterns`, `reference.png` path.
3. `package.json`: `ablation:run`, `ablation:score`.
4. ADR: none for the scaffolding. Record one (or amend ADR-007) only if the results change how the loop is built, e.g. dropping the reviewer.
5. `prepare.js` arm `1b`: copy Arm 1, delete `.claude/rules/`, write the committed `AGENTS.md` and a one-line `CLAUDE.md` (`@AGENTS.md`). It uses the shipped file, not a hand-tuned eval copy, so the arm measures what consumers actually get.

## Ship AGENTS.md (product change, independent of the eval)

**Goal:** the system works with any coding agent (Codex, Cursor, Copilot…), not only Claude Code. The same file doubles as the Arm 1b treatment.

- **Shape:** a compressed index, **≤8KB** (Vercel's working size). It holds:
  - the fixed component set
  - the token layer order and the `var(--ds-*)`-only rule
  - the layout grammar invariants
  - the ADR-009 extend/new/internal test
  - pointers to the metadata files and the schema

  It contains no procedures; those stay in the commands. It must not dump the rules verbatim: Atlassian's DESIGN.md-only arm cost about 92% more tokens.
- **Single source of truth:** `AGENTS.md` is canonical for tool-agnostic invariants, and `CLAUDE.md` imports it with `@AGENTS.md`, keeping only Claude-specific content: commands, agentic moments, MCP policy, git workflow. Before choosing the direction, check whether Claude Code currently reads `AGENTS.md` natively. If it does, the import may be unnecessary, but keep it if it's harmless.
- **Gate:** extend `claudemd:check` (ADR-017) to budget `AGENTS.md` too (≤8KB), and to count the imported content toward `CLAUDE.md`'s effective size.
- **ADR:** amend ADR-017. This changes the context-budget contract and adds a second always-loaded file that other tools depend on.
- **Docs:** this touches a declared source, so the same PR needs a doc touch (docs-check coupling).
- **Order:** ship `AGENTS.md` (its own PR) **before** running Arm 1b, so the arm tests the real file.

## Budget and order

- **Pilot:** `Badge` × 3 arms × 1 run. Check leakage, timing and `total_cost_usd`, then decide N and whether Accordion fits.
- **Full:** 3 tasks × 3 arms × 3 runs = 27 agentic runs, sequential. **Then Arm 1b:** 3 tasks × 3 runs = 9 more, after `AGENTS.md` ships. That makes 36 in total, and 1b is about as cheap per run as Arm 1. Arm 2 is the expensive one (main session plus one reviewer subagent). Spread runs across usage windows; `run.js` being resumable is what makes that work.
- **Later (separate pass):** the model axis. Arm 0 with Opus vs Arm 2 with Sonnet/Haiku tests whether the harness makes a cheaper model good enough.

## Case-study output

- One figure per task: median Arm 0 vs median Arm 2 rendered side by side, the offending lines highlighted (invented token, raw hex, missing label), and a three-row scorecard (violations · clean rate · cost per clean component).
- One table: all arms, all tasks, including the loop-vs-context split (Arm 1 vs 2).

## Open questions

- Should Arm 0 keep the existing `*.stories.tsx` files? Current call: yes. Stories are what a normal team has, and removing them would make the baseline a straw man.
- ADR/rules leakage: redact or accept? See "Leakage controls". This has to be settled before the pilot, because changing it afterwards counts as tuning after seeing results.
- Does the composeStories/axe runner already exist in `packages/components` test setup (`a11y:stories`)? If so, reuse it instead of writing a new one.
