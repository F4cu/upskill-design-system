---
status: active
created: 2026-10-07
completed:
---

# Harness-ablation eval — scope

**Question:** does the harness make Claude produce shippable components that it otherwise wouldn't, and what does that cost? It is a with/without comparison in the style of Vercel's AGENTS.md eval and Atlassian's context-delivery eval. It also produces the side-by-side figure the case study is missing.

**Why not extend `pattern-accuracy-harness/`:** that harness is single-shot (`claude -p`, no tools, context pasted into the prompt). It measures *context*. This eval has to measure the *harness*: tools, gates, the retry loop and the reviewer. That needs agentic runs inside a real workspace. The scorer's trap checks are reused.

**Order (2026-10-08):** run this eval **after** the [spec harness arm](archive/2026-10-07-spec-harness-arm.handoff.md) (its ADR-027 outcome sets Arm 1's context) and the [governance decision eval](archive/2026-10-08-governance-decision-eval.handoff.md) (it may add metadata fields, which would change Arm 1's context and force a rerun). Every task here is "rebuild a known component", so the governance decision is fixed in advance. That's right for an output-quality eval, and it's why governance has its own eval.

**Governance decision eval done (2026-10-08):** it added no metadata fields, so Arm 1's context doesn't change because of it. This eval can proceed.

**ADR-027 accepted (2026-10-08):** Arm 1 (and 1b, 2) context includes `*.spec.json`. `prepare.js` keeps the specs like metadata, deletes the target's spec with its directory, and redacts the target's mentions in other specs. The spec arm's Button result shows Arm A invents token names when it has no token catalogue. The `unknown-token` trap here is what measures that properly.

**Related:** [the spec harness arm](archive/2026-10-07-spec-harness-arm.handoff.md) adds an Arm C to `pattern-accuracy-harness` for the ADR-027 exit condition. It shares this eval's Stage 0 scorer fix and CardVertical reference, and if ADR-027 is accepted, the specs become part of this eval's Arm 1 context.

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

Arm 1b is added **after the pilot**, once Arms 0/1/2 are confirmed leak-free. It needs `AGENTS.md` shipped first. **Moved 2026-10-08:** Arm 1b and the AGENTS.md product work are tracked in [2026-10-08-agents-md](2026-10-08-agents-md.handoff.md). This eval's scope is Arms 0/1/2.

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
   - **CardVertical:** it *is* the ADR-023/025 reference (parts plus the derived `Completed` state, PR #112). The brief must say whether the task is the **preset** or the **preset + parts**. Recommended: the preset only, because the parts API is too large for a fair Arm 0 task. **Decided 2026-10-08 (developer):** the task is the preset only; the brief says so. Locked.
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
   - **Done 2026-10-07 (found during calibration):** with `*.stories.tsx` in scope, the references tripped `off-scale-inline-style` on story wrapper divs (`style={{ display: 'flex', gap: '12px' }}`): Badge 3, Checkbox 3, Button 40. Every flex wrapper in the 11 affected story files is now `Inline`/`Stack` with gap tokens, so the stories model the layout grammar the arms will copy. Badge, Checkbox, CardVertical, Button and Accordion now score 0 traps. Inline styles that aren't wrappers stay: Image/ScrollArea/ProgressBar width constraints, monospace caption labels in Box/Stack/Inline/Text/Heading/Icon, TextLink's prose paragraph. None are in a task's reference. **Decided 2026-10-08 (developer):** the ablation scorer runs `off-scale-inline-style` on an arm's own `*.stories.tsx` too, but story-file hits are reported under **system compliance** (story conventions), never in the product-quality headline. The trap on the component's own `.tsx` stays in the headline. Why: the headline is "what a consumer would notice" and consumers never see story wrappers; the headline already covers stories via the axe sweep and the missing-story violation; and counting them there would penalise Arm 0 for a layout-grammar convention it was never shown (or for copying the repo's own remaining non-wrapper story styles). Locked: it doesn't change after the pilot.
   - **`raw-text-prop-render` scorer fix:** treat a fixed-set component's parts (`Parent.Part`, read from its metadata `composition.parts`) as typography wrappers when the part renders Text/Heading. The [spec harness arm](archive/2026-10-07-spec-harness-arm.handoff.md) needs the same fix for its CardVertical reference; do it once in `pattern-accuracy-harness/score.js`, since this eval imports those traps.
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

  Recommended: (a) for lines about the target's own props or Figma mapping, and (b) for passing mentions used as examples. **Decided 2026-10-08 (developer):** (a) redact lines about the target's own props or Figma mapping; (b) keep passing mentions used as examples. Report (b) as a known advantage for Arms 1/2. Locked: it doesn't change after the pilot.
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

- **Prediction:** violations Arm 0 > Arm 1 > Arm 2. Arm 2 costs the most per run. Arm 1b: about equal to Arm 1 on violations, with more tokens per run. Locked 2026-10-08 (developer), before the Badge pilot.
- **Honest-outcome rule:** same as pattern-accuracy. If Arm 2 doesn't beat Arm 1 by a meaningful margin, report that and question whether the loop and the reviewer earn their cost. Don't tune briefs or traps after seeing results.
- **Showcase rule:** the case-study side-by-side uses the **median** run of each arm, never the best.
- **N = 3** runs per task × arm. N = 1 is a pilot, not a result.

## Changes needed

1. **`/add-component --eval` mode** (`.claude/commands/add-component.md`). **Done 2026-10-08:** "Eval mode" sections in `add-component.md` and `review-component.md`, plus a pointer at the `/component-scaffold` API checkpoint. Beyond the items below it also adds: a guard (refuses unless `.ablation-workspace` exists), no human prompts anywhere, `reference.png` replaces the Figma read, a 5-run gate cap ending in `outcome: gate-failed`, and `mode`/`outcome`/`visualReview`/`apiProposal` fields in `.run.json`.
   - **Auto-approve the Stage 1 API proposal checkpoint** (`/component-scaffold` step 3, ADR-026, added in PR #115). Under `claude -p` it would otherwise stall the run or get skipped in some unrecorded way. Accept the proposal exactly as the agent wrote it, and save it to the workspace as `api-proposal.md` so the `prop-vocabulary` score can be traced back to it.
   - Skip Stage 2b/2c (the human visual checkpoint) and record `visualReview: skipped-eval`.
   - In `/review-component`, skip branch, commit and PR, and write `.review.json`/`.run.json` into the workspace.
   - Don't append to the committed `run-ledger.json`.
2. **New `scripts/harness-ablation/`**:
   - `prepare.js <task> <arm>`: archive, strip per arm, delete target, symlink deps, drop `reference.png`.
     - **Required by `--eval`:** after `git init`, commit the prepared tree as the baseline (the reviewer diffs against it), then write `.ablation-workspace` at the root, left untracked (add it to `.git/info/exclude`). Arm 2 only needs it, but writing it in every arm is harmless.
     - **Done 2026-10-08** (`scripts/harness-ablation/prepare.js`, `tasks/{badge,checkbox,cardvertical}.json`). Badge and Checkbox build for all three arms. In each one `metadata:validate`, `typecheck`, `build`, `a11y:coverage`, `a11y:test` and `a11y:stories` pass, and `sense:component` reports the target as greenfield. Choices made while building it (review before the pilot):
       - **Workspace location:** `$TMPDIR/upskill-ablation/…` by default. The script refuses any `--out` inside the repo or under a directory that has a `CLAUDE.md`, because Claude Code loads ancestor `CLAUDE.md` files.
       - **`node_modules`:** a real dir of per-entry symlinks into the main checkout, with a local `@upskill/{components,tokens}` pointing at the workspace packages. A whole-dir symlink would expose the deleted component through `node_modules/@upskill/components`.
       - **Stripped in every arm:** `apps/` (the showcase pages use all three targets), every `docs/` page except `docs/decisions/` (the reference pages describe the target's API; they aren't in any arm's defined context), `scripts/pattern-accuracy-harness/`, `scripts/harness-ablation/`, and the committed `.claude/handoff/` (left as an empty `runs/`). Root `build` drops the showcase step, and `package.json` scripts whose file or workspace is gone are pruned.
       - **Arm 0 also drops** `ROADMAP.md` and the harness-only scripts: sense, validate-*, generate-pattern-schema, status, handoff-tidy, claude-md-check, docs-check.
       - **Arm 1 = Arm 2 minus `.claude/{commands,agents,skills}`.** It keeps `ROADMAP.md`, the frozen snapshots, `settings.json` and the validator scripts, because it has metadata to validate.
       - **Stories that import the target are deleted whole**, not edited. Badge → `CardVertical.stories.tsx`; Checkbox → `stories/SettingsForm.stories.tsx`; CardVertical → `ScrollArea.stories.tsx`, `stories/Carousel.stories.tsx`. The target's screenshot baselines go too.
       - **`scripts/token-contrast-check.js` is redacted in every arm.** Its comments and `PAIRS` spell out the target's token pairs (e.g. Badge's outline border is `border.default`; Checkbox's box/check tokens).
       - **Redactions are exact strings that must match once.** A redaction that no longer matches (because an ADR was edited) is an error, not a silent leak. Badge: the ADR-026 vocabulary row, the ADR-021 `background.neutral.*` consumer list, and the contrast notes. Checkbox: the ADR-026 Figma-mapping bullet, the ADR-024 `color.background.disabled` consumer clause, the ADR-013 `label` raw-render note, and the contrast notes. Kept as passing mentions (b): the fixed-set list in `CLAUDE.md`, ROADMAP history, "e.g. Badge" as the non-interactive example (rules, commands, ADR-007/008, `a11y-coverage.js`), and other components' metadata prose.
       - **Frozen files are regenerated, not edited.** `token-usage.json` is rebuilt before the first commit. The HEAD-derived snapshots (`component-patterns.json`, `component-pipeline.json`, `STATUS_QUO.md`) are deleted before it and rebuilt after it (Arms 1/2), then amended into the single baseline commit. The reflog is expired and pruned, and `git fsck --unreachable` must come back empty, so `git reflog` archaeology can't recover the originals.
       - **Leak report:** each run writes `<workspace>.leak-report.txt` next to the workspace, listing every remaining `\b<Target>\b` line for the transcript review. A code import of the target fails the run.
       - **Open, blocks the pilot:** `tasks/<id>.reference.png` doesn't exist yet for any task (`--allow-missing-reference` is only for smoke tests).
       - **`badge.reference.png` added 2026-10-08:** taken from the Figma Badge set `28:1134`, variants `type=Default` (`28:1130`, bordered) and `type=highlight` (`28:1135`, filled). It's a 4× `figma-cli export node` of each variant, side by side on white at 672×240. The variant set's dashed outline is left out so no arm copies Figma chrome. The MCP screenshot only renders at 1× (56×28 per badge), too small to read. In Figma the filled look also has a border; the image shows what Figma has. `Badge.metadata.json` still says it has no Figma node (`figmaNodeId: "none — …"`), which is out of date; fix it outside this eval. CardVertical's reference is still open.
       - **`cardvertical.reference.png` added 2026-10-08:** 2× `figma-cli` exports in a 3×2 grid on white at 1918×1632, from the set `52:4270` with `State=Default` only (hover is left out, as for Checkbox).
         - Top row large, bottom row small; columns not started, in progress, completed: `54:2745`, `130:7073`, `2871:7286` / `54:2765`, `130:7093`.
         - **The set's `Certified` boolean is off in every variant**, but the brief describes the marker. So the bottom-right cell is the developer-supplied instance `2852:8482`: small, completed, `Certified` on, overlay `Action` hidden.
         - **Known Figma inconsistencies in that instance:** its "Certified" label is a smaller type size than "Completed", and its image placeholder is slightly lighter. The human visual rating shouldn't count an arm's choice on either.
       - **`checkbox.reference.png` added 2026-10-08:** taken from the aligned Figma set `92:8772` (post-#116), 4× `figma-cli` exports in a 2×2 grid on white at 756×448. Top row enabled, bottom row disabled; left column unchecked, right column checked: `92:8773`, `92:8768`, `2879:67`, `2879:73`. `Checked=false, State=Hover` (`108:4988`) is left out because the brief doesn't describe hover; hover is styling, and the image shows only what the brief describes.
       - ~~**Open, blocks CardVertical Arms 1/2:** its redaction list is empty and `redactionsReviewed: false`, so `prepare.js` refuses.~~ **Resolved 2026-10-08 (developer-approved as drafted):** 17 redactions remove the preset's own API, Figma mapping, tokens and internals: size values, the `progress` ↔ `Status` mapping (ADR-026 and `components.md`), the Figma `State` recasing, ADR-025's derived-completed application, ADR-023's `action`/Root-context notes, its Figma preset properties (that decision line is rewritten as the general rule), the part-name lists, ADR-013's `title` example, ADR-001's `text.subtle` note, Image's "in CardVertical" ratio note, ProgressBar's "(CardVertical.Progress)", and the contrast-check comments and pair. Kept as passing mentions (b): the fixed-set list, ROADMAP, other components' usage guidance, everything about the overlay actions and parts (outside the preset brief), ADR-027's spec-pilot history, and ADR-026's general `thumbnailSrc` vocabulary rule (CardHorizontal follows it too). Arm 2 calibration scores 0 with 13 stories, and every system check passes. Original note: ADR-023/024/025/026 describe its preset API (`action`, `size: sm|lg`, derived completed, on-media tokens) line by line, so each line needs the (a)/(b) call by hand. Arm 0 runs.
   - `run.js`: sequential, never parallel. Resumable: skips a task/arm/run that already has `score.json`. Flags: `--task`, `--arm`, `--runs`, `--model`, `--max-budget-usd`.
     - **Done 2026-10-08** (`npm run ablation:run -- --model <id> --max-budget-usd <n> …`). `--model` and `--max-budget-usd` are required. It also takes `--effort`, `--dry-run`, and `--smoke` (allows a missing `reference.png` and writes under `.runs/_smoke/`). Details:
       - **Isolation flags, identical for every arm:** `--setting-sources project`, `--strict-mcp-config` with an empty config, `--permission-mode bypassPermissions`, `--disallowedTools WebFetch WebSearch` (the repo is on GitHub), `--no-session-persistence`, and `stream-json --verbose` so the full transcript is kept. Model-overriding env vars (`ANTHROPIC_MODEL`, `CLAUDE_CODE_SUBAGENT_MODEL`, `ANTHROPIC_SMALL_FAST_MODEL`) are unset.
       - **Fresh workspace path per attempt.** Auto-memory is keyed by project path, so a reused path could load memory left by an interrupted attempt.
       - **Resumes at two points:** a run with `result.json` skips the agent, and one with `score.json` is skipped entirely. A run that ends without a result event, with an API error, or on a usage/rate limit writes `incomplete.json` and stops the loop with exit 2, to resume in the next window. A budget cut-off (`error_max_budget_usd`) is a real outcome and gets scored.
       - **Per run in `.runs/<task>/arm<N>/run-<k>/`:** `transcript.jsonl`, `stderr.txt`, `prepare.json`, `leak-report.txt`, `result.json`, and `output/` (the component dir, `api-proposal.md`, `.review.json`/`.run.json`, and `diff.patch` against the baseline). `result.json` holds cost, turns, duration, usage, `subagent_stats`, the session's init (tools, agents, skills, plugins, MCP servers, memory path) and `contamination` flags: non-builtin plugins, MCP servers, a model other than requested, network-shaped tool calls, and `git log/show/reflog/…` archaeology. These are flags for the transcript review, not automatic failures.
       - `score.js` is spawned as `node score.js <runDir>` when it exists. Until then workspaces are kept so the runs can be scored later.
       - **Smoke test (Haiku, $0.30 cap, placeholder brief):** Arm 0 succeeded ($0.08, 11 turns). Arm 2 passed the `.ablation-workspace` guard, ran `sense:component`, wrote `api-proposal.md` and reached the gate before the cap (`error_max_budget_usd`, 37 turns). Neither run raised a contamination flag. No MCP servers and only built-in plugins loaded, so user plugins and skills don't leak. Arm 2's agent list includes `adversarial-reviewer`, and Arm 0's doesn't.
       - **Briefs locked 2026-10-08 (developer-approved):** `tasks/{badge,checkbox,cardvertical}.brief.md`. They describe behaviour and never name props, because prop names are scored. Each lists the component, CSS module, stories file and the `index.ts` export. The CardVertical brief leaves out the overlay action, because `action` only accepts the `Favorite`/`Menu` parts and so contradicts "preset only". `score.js`'s `prop-vocabulary` diff must therefore not count a missing `action` as a violation. Each `reference.png` must show only what its brief describes: both Badge looks; Checkbox unchecked/checked/disabled/disabled-checked; CardVertical in both sizes, including an in-progress card and a completed one.
       - ~~**Open, blocks the pilot:** the briefs.~~ Resolved above. Original note: `run.js` reads `tasks/<id>.brief.md` (the same file for every arm; Arm 2 gets `/add-component <Target> --eval` prepended) and refuses to run without it. Set the Arm 2 `--max-budget-usd` from the pilot. It has to cover the reviewer subagent too, and $0.30 on Haiku didn't get through the gate.
   - `score.js`: in-workspace gates + traps imported from `pattern-accuracy-harness/score.js` (export `trapChecksTsx`, `trapChecksCss`, `runPatternChecks`) + the new `unknown-token` and `invented-import` traps + composeStories/axe + the `prop-vocabulary` check (export the naming-drift functions from `scripts/generate-pattern-schema.js`).
     - **Done 2026-10-08** (`npm run ablation:score -- <runDir>`; `run.js` calls it). `--calibrate <task>` restores the shipped component into a fresh workspace (Arm 2, or Arm 0 while the redactions are unreviewed) and must score 0. **All three references score 0 product violations.** The sweep composes Badge 3, Checkbox 5 and CardVertical 13 stories, and every system check passes on Badge and Checkbox. `generate-pattern-schema.js` now runs `main()` only as an entry point, so importing it has no side effects.
       - **Product quality (the headline), in the workspace:**
         - Missing deliverables (component, CSS module, stories file).
         - `typecheck` errors, counted over the whole package; the baseline is 0.
         - `eslint` errors on the target directory.
         - `a11y:stories` through vitest's JSON reporter. Any failure counts. A target story with axe switched off (`parameters.a11y`) counts too, and so does a stories file that composes no stories.
         - The pattern-accuracy traps on the target's `.tsx` (tests excluded) and `.css`.
         - `unknown-token`: every `var(--ds-*)` must exist in the rebuilt `packages/tokens/dist/css`. A custom property the component defines in the same file is local and allowed.
         - `invented-import`: a sibling component directory that didn't exist at baseline, or an `@upskill/components` name the baseline `index.ts` didn't export.
         - The task's `requiredPatterns`/`forbiddenPatterns`.
       - **System compliance (reported separately):**
         - Whether metadata is present.
         - `metadata:validate` and `a11y:coverage`, where the arm has the script.
         - Pattern drift entries naming the target.
         - Story-file `off-scale-inline-style` hits.
         - `prop-vocabulary`, see below.
         - Uncommitted changes under `packages/tokens/src`. If an arm adds tokens, unknown-token can't catch an invented name, so this list shows it.
       - **`prop-vocabulary`:**
         - The vocabulary is the props on `<Target>Props`, or on every `*Props` type if that one doesn't exist. Native `checked`/`defaultChecked`/`onChange`/`disabled`/`name` count when the props spread `InputHTMLAttributes` without omitting them.
         - It also records string-literal union values, resolving local type aliases.
         - A violation is a reference prop or value the run lacks. Extra props aren't violations.
         - ADR-026's `namingDrift` checks only props the component declares itself. Native ones follow the ADR-025 native contract; without this, the shipped Checkbox had a false positive.
         - `selected*` is flagged only when the component renders a selection role.
         - CardVertical ignores `action`, per the brief.
       - **Process:** cost, turns, duration, subagents spawned, the contamination-flag count, and for Arm 2 the reviewer's findings by severity from `.review.json`.
       - **Brief checklists (pre-registered, part of the locked task files):**
         - Every task: the export in `index.ts`.
         - Badge: no `onClick`/`<button`/`role="button"` and no `<Icon`/`<svg`, because the brief says not clickable and text only.
         - Checkbox: `type="checkbox"` (works in an ordinary form) and `<label`/`htmlFor` (clicking the label toggles it).
         - CardVertical: the export only. Forbidding `Object.assign` would fail the reference.
       - **Negative test:** defects planted in a restored Badge triggered every trap: hex, px, unknown token, invented import, typecheck, lint, axe switched off, prop renames and naming drift.
       - **Smoke test (Haiku, Arm 0, locked brief, no `reference.png`):** $0.13 and 27 turns. It scored 4 product violations, all `unknown-token`, and every one is a real invented name (e.g. `--ds-font-size-body-sm`; the token is `body-small`). The vocabulary check found `label` renamed and `variant` without `outline`.
       - **Found, not this eval's:** the committed `.claude/component-patterns.json` on `main` is stale. Regenerating it rewrites AppHeader's entry (`aria-controls`, the `useMenuButton` hook), so an AppHeader change landed without `patterns:generate`.
   - `prepare.js` also applies the redaction decided under "Leakage controls" to `docs/decisions/` and `.claude/rules/components.md` for Arms 1/1b/2.
   - `report.js` → `results.md`: per task × arm table, clean rate, cost per clean component. Copy each arm's median-run files into `results/<task>/<arm>/` for the case-study figure.
     - **Done 2026-10-08** (`npm run ablation:report`, plus `--smoke`, which writes the gitignored `results-smoke.md` from `.runs/_smoke/` and never touches `results/`). `results.md` has five sections:
       1. **Headline table per task × arm:** runs (with pending), clean rate, mean violations (min–max), cost per clean component (shown as "0 clean, $X spent" when nothing is clean), mean cost, turns and minutes.
       2. **Per-arm pooled table** for the Arm 1 vs 2 split.
       3. **Breakdown of product violations** by gate and trap.
       4. **Secondary table:** metadata written, prop-vocabulary issues, story inline styles, Arm 2 reviewer findings (total and high+medium), budget cut-offs, contamination flags.
       5. **Median-run list.**

       It warns when the scored runs use more than one model, or when any cell has fewer than the pre-registered N = 3. The **median run** is chosen by violations, then cost. With an even count it takes the upper-middle (worse) run, so a tie never resolves toward the best. `results/<task>/arm<N>/` gets that run's `output/` (component, `api-proposal.md`, review files, `diff.patch`), its `score.json` and a `MEDIAN.txt`. Tested on three synthetic runs with 0/4/7 violations: it picked the 4, and cost per clean = total ÷ 1.
   - `tasks/*.json`: brief, target, files to delete, `requiredPatterns`/`forbiddenPatterns`, `reference.png` path.
3. `package.json`: `ablation:run`, `ablation:score`.
4. ADR: none for the scaffolding. Record one (or amend ADR-007) only if the results change how the loop is built, e.g. dropping the reviewer.
5. `prepare.js` arm `1b` (tracked in [2026-10-08-agents-md](2026-10-08-agents-md.handoff.md)): copy Arm 1, delete `.claude/rules/`, write the committed `AGENTS.md` and a one-line `CLAUDE.md` (`@AGENTS.md`). It uses the shipped file, not a hand-tuned eval copy, so the arm measures what consumers actually get.

## Budget and order

- **Pilot:** `Badge` × 3 arms × 1 run. Check leakage, timing and `total_cost_usd`, then decide N and whether Accordion fits.
- **Transcript review (after the pilot, before the full run):** read every pilot transcript end to end before trusting any score. Look for:
  - leaks: deleted-file strings, or `git` archaeology
  - stalls or silent skips at the `--eval` auto-approve
  - Arm 2 reviewer findings the scorer doesn't capture
  - scorer false positives or negatives

  Fix the harness (not the briefs or traps) and record what changed here before the full run.
- **Badge pilot (2026-10-08, `claude-opus-5-5`, effort medium, $5 cap, N = 1):**
  - **As first scored:** Arm 0 clean ($0.36, 14 turns, 1.0 min); Arms 1 and 2 had 1 violation each ($0.68, 21 turns, 1.8 min; $1.37, 23 turns, 3.9 min).
  - **Transcript review: two scorer false positives, fixed (developer-approved) and rescored from the retained workspaces. All three arms are now clean.**
    1. **Badge's `forbidden-pattern` matched `'onClick'` inside `Omit<HTMLAttributes…, 'onClick' | …>`.** Arms 1 and 2 removed the handler from the props, which is what the brief asks for and what `components.md` "type-enforced anti-patterns" prescribes. The pattern is now `onClick\??\s*[:=]|<button\b|role=["']button`. Unit-checked: it matches a declared or passed handler, `<button>` and `role="button"`, and doesn't match the `Omit` string. This changes a pre-registered checklist item. It's recorded here because the pilot exists to catch exactly this, and it was fixed before any full-run result existed.
    2. **Prop vocabulary: all three arms named Badge's text `children`, not `label`.** The vocabulary's Content row prescribes `children` for single free-form content, and its Figma line records "label `children` ↔ `Text`", so the shipped `label` is the drift. Stage 0 missed it. Option (a), developer-approved: ADR-026 lists Badge `label` → `children` as open drift (table row plus a dated amendment), and `badge.json` `propVocabulary.equivalents` lets `children` satisfy `label`. Both new ADR lines are added to Badge's redactions, because they name the target's own prop. The remaining vocabulary findings are real: Arms 0 and 2 used `outlined`, where the reference has `outline`.
  - **Contamination flags (Arms 0 and 1) were `curl localhost:6123`:** both arms started Storybook to look at their work. `run.js` now ignores `curl`/`wget` to `localhost`/`127.0.0.1` (`isNetworkShaped`), and the pilot's flags were recomputed from the transcripts: 1/1/0 → 0/0/0. Neither left Storybook running. No arm looked into git history, and the leak reports hold only passing mentions.
  - **Arm 2's `--eval` loop worked as designed:** no stall at the auto-approved API proposal; 3 gate runs with 1 failure (metadata tokens); 1 reviewer spawned, 9 findings (2 medium).
    - The reviewer caught one problem beyond the gate: the filled look on `overlay.subtle` failed WCAG contrast at 3.98–4.48:1. The fix moved it to `overlay.subtlest` and added the pair to `PAIRS`.
    - Arms 0 and 1 picked `overlay.subtlest` themselves, so the products don't differ.
    - **Known scoring gap:** contrast isn't in the headline, because the axe sweep runs in jsdom with `color-contrast` off. A contrast miss in Arm 0 or 1 on a harder task would go uncounted. Report it with the results; don't change the instrument now.
  - **Reading:** Badge doesn't separate the arms at N = 1. All three are clean, and Arm 0 costs about a quarter of Arm 2. That matches the task's role (display-only, the easiest task). Report it plainly under the honest-outcome rule.
  - **Budget:** keep `--max-budget-usd 5` for the full run. Arm 2 used $1.37 on Badge; Checkbox (a11y test) and CardVertical are bigger.
  - **Before the full run:** `checkbox.reference.png` (Figma set `92:8772`), `cardvertical.reference.png`, and the CardVertical redactions. The pilot's `run-1` counts as the first of Badge's N = 3. Its workspace was built before the ADR-026 row existed, and the new redactions strip that row, so later Badge workspaces see the same ADR text apart from the `Amended:` date.
- **Checkbox full run (2026-10-09, `claude-opus-5-5`, effort medium, $5 cap, N = 3):**
  - **Score review: one scorer false positive, fixed (developer-approved) and rescored from the retained workspaces before any CardVertical run.** Arm 1 `run-3` and Arm 2 `run-2` failed `missing-required-pattern` `/<label\b|htmlFor/`. Both render `<Text as="label">` wrapping the `<input>`: clicking the text toggles the checkbox, which is what the brief asks for, and it's the system's typography idiom. The pattern is now `<label\b|htmlFor|as=["']label["']`. Unit-checked: it matches `<Text as="label">`, `<Box as='label'>` and `<label htmlFor`, and doesn't match `as="labelled"` or `aria-label`. This changes a pre-registered checklist item, like the Badge `onClick` fix. Only that trap changed in the two rescored runs; the other seven runs already matched the old pattern, so widening it can't change them.
  - **After rescoring:** Arm 0 0/3 clean (mean 5.0 violations, $0.67/run); Arm 1 3/3 ($0.92); Arm 2 3/3 ($1.58).
  - **Arm 0's violations are real:** in every run `label` is rendered outside `Text` (`raw-text-prop-render`) and the callback is `onCheckedChange` instead of the native `onChange` (`callback-name-drift`). It also had 9 `raw-visible-text` hits in its own `*.stories.tsx`, which moved to system compliance (decision below). Arm 0 fails even without those.
  - **Contamination flag on Arm 2 `run-3` is benign:** `git show HEAD:.claude/component-patterns.json` to check its own regeneration. HEAD is the redacted baseline commit and the reflog is expired, so nothing outside the workspace was reachable.
  - ~~**Open, decide before CardVertical:** story-file `raw-visible-text` hits count in the headline.~~ **Decided 2026-10-09 (developer), before any CardVertical run:** `raw-visible-text` hits in an arm's own `*.stories.tsx` move to **system compliance** (`system.storyVisibleText`, report column "Story raw text"), the same way and for the same reason as the 2026-10-08 `off-scale-inline-style` decision: consumers never see story scaffolding, and Arm 0 was never shown the layout grammar. The trap on the component's own `.tsx` (and `raw-text-prop-render` anywhere) stays in the headline. All 18 Badge and Checkbox runs were rescored under the new rule: Badge is unchanged; Checkbox Arm 0 drops from a mean of 5.0 to 2.0 violations (still 0/3 clean), and Arms 1/2 are unchanged at 3/3. The CardVertical reference still calibrates to 0. Locked: it doesn't change after CardVertical.
- **Human calibration (1 person, after the full run):** before looking at the scores, rate each arm's median run against `reference.png` on a 3-point visual-match scale (matches / minor drift / wrong). Rate blind to arm where possible. Report it next to the trap counts as the case-study figure's visual axis; it's never folded into the headline.
- **Full:** 3 tasks × 3 arms × 3 runs = 27 agentic runs, sequential. (Arm 1b's 9 runs are tracked in the agents-md handoff.) Arm 2 is the expensive one (main session plus one reviewer subagent). Spread runs across usage windows; `run.js` being resumable is what makes that work.
- **Later (separate pass):** the model axis. Arm 0 with Opus vs Arm 2 with Sonnet/Haiku tests whether the harness makes a cheaper model good enough.

## Case-study output

- One figure per task: median Arm 0 vs median Arm 2 rendered side by side, the offending lines highlighted (invented token, raw hex, missing label), and a three-row scorecard (violations · clean rate · cost per clean component).
- One table: all arms, all tasks, including the loop-vs-context split (Arm 1 vs 2).

## Open questions

- ~~Should Arm 0 keep the existing `*.stories.tsx` files?~~ **Settled 2026-10-08:** yes. Stories are what a normal team has, and removing them would make the baseline a straw man.
- ~~ADR/rules leakage: redact or accept?~~ **Settled 2026-10-08:** redact target-API lines, accept passing mentions. See "Leakage controls".
- ~~Does the composeStories/axe runner already exist (`a11y:stories`)?~~ **Yes (checked 2026-10-08):** `npm run a11y:stories` runs `packages/components/src/a11y-stories.sweep.test.tsx` via `vitest.stories.config.ts` (portable stories + axe, jsdom). `score.js` runs it in the workspace instead of writing a new runner.
