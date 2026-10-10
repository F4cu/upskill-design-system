---
title: "ADR-029 — Tiered context architecture and a risk-triggered reviewer"
---
# ADR-029 — Tiered context architecture and a risk-triggered reviewer

**Date:** 2026-10-09
**Amended:** 2026-10-10
**Status:** `accepted`

## Context

The harness ablation (`scripts/harness-ablation/`, `results.md`, handoff `archive/2026-10-07-harness-ablation-eval.handoff.md`) took the component harness apart to see which pieces make a component shippable. It answered two questions this system had been running on assumption: does written-down context earn its cost, and does the always-on gate + adversarial-reviewer loop (ADR-007) earn its cost on top of it?

That raises a third question this ADR answers: which context architecture should the system commit to as it grows past 27 components, and what does the loop look like afterwards?

### Candidate architectures

- **A. Monolithic always-loaded index.** One `AGENTS.md` at the root holding every convention, loaded into every session (the shape of Vercel's AGENTS.md eval).
- **B. Path-scoped on-demand rules.** Conventions load only when a session touches matching paths (the shape of Atlassian's context-delivery eval). This is what runs today: `.claude/rules/components.md` and `.claude/rules/tokens.md` (ADR-017), with a 20KB always-loaded `CLAUDE.md` on top.
- **C. Tiered hybrid.** A small tool-agnostic root index, package-scoped conventions loaded by path, per-component knowledge in machine-readable metadata/spec JSON, and deterministic gates as scripts and CI.

Four pillars judge them: **scalability** (does it hold at 100+ components?), **portability** (does a non-Claude coding agent get the conventions?), **cost per clean component**, and **deterministic QC** (is enforcement a gate, not prose?).

### Evidence (measured, 27 runs, `claude-opus-5-5`, N = 3 per cell)

| Arm | Clean | $/clean | Context tokens / run (badge · cardvertical · checkbox) |
|---|---:|---:|---|
| 0 · Bare repo | 6/9 | $0.73 | 246K · 345K · 668K |
| 1 · Context only | 9/9 | $0.91 | 871K · 1,284K · 1,060K |
| 2 · Full harness | 9/9 | $1.54 (+69% vs Arm 1) | 1,199K · 1,641K · 1,474K (main session only) |

Token counts are summed from `scripts/harness-ablation/.runs/*/arm*/run-*/result.json` (input + cache write + cache read). They are not in `results.md`.

- **Context earns its cost.** The only change in the headline is Arm 0 → Arm 1 (Checkbox 0/3 → 3/3). The six Arm 0 product violations (`callback-name-drift`, `raw-text-prop-render`) are conventions written in ADRs and metadata.
- **The loop doesn't.** Arm 2 never beats Arm 1 on any task. All 12 gate retries were `metadata:validate` (self-inflicted compliance churn, zero product defects repaired). Arm 2 regressed Badge prop-vocabulary (0.7 vs Arm 1's 0.0).
- **The reviewer finds real things above the headline:** forced-colors handling, APG keyboard test gaps, type narrowing. Those are concentrated in **interactive** components. On Badge (display-only), its main fix repaired a contrast miss Arm 2 created itself.
- **Static vs pulled context.** In Arm 1, CLAUDE.md (~5K tokens) + `components.md` (~3.6K) × 23 turns ≈ 200K, about 23% of Badge's 871K. The rest is the agent reading ADRs, metadata and specs on demand.
- **The monolith ceiling is already measured.** CLAUDE.md is at 19,993 / 20,000 bytes with 27 components.

### What the data does NOT support

- **Option A vs Option B is unmeasured.** Arm 1b never ran and `AGENTS.md` doesn't exist. All 27 tasks touched `packages/components/**`, so path-scoping never saved anything in this task set. Option C is chosen on structure and low regret, not on a measured A/B difference.
- **Portability is unmeasured.** Every run used Claude Code.
- **Confidence is limited.** N = 3, and only 1 of 3 tasks separated the arms. The scorer has a contrast blind spot (jsdom axe has `color-contrast` off).

## Decision

**Option C, the tiered hybrid.** Per-component knowledge is carried by schema-validated JSON, conventions load by path, a small root index is shared across tools, and gates enforce. The adversarial reviewer becomes **risk-triggered**: it runs for interactive components, not by default.

1. **Tier 0, root index: `AGENTS.md`.** ≤ 8KB, tool-agnostic. It holds invariants and pointers, never procedures:
   - the fixed component set
   - the token layer order and the `var(--ds-*)`-only rule
   - the layout grammar invariants
   - the ADR-009 extend/new/internal test
   - pointers to metadata, specs, the schema and the frozen snapshots
2. **Tier 0b, Claude-specific root: `CLAUDE.md`.** It imports `@AGENTS.md` and keeps only Claude-specific content: agentic moments, commands/skills, MCP policy, git workflow, knowledge routing. Content moves out of CLAUDE.md into `AGENTS.md`; it is not copied.
3. **Tier 1, package-scoped conventions.** Loaded by path, never globally. The delivery mechanism is decided separately and recorded here as an amendment:
   - **(a)** keep `.claude/rules/` and give other tools a pointer from `AGENTS.md`, or
   - **(b)** make nested `packages/*/AGENTS.md` canonical, with Claude delivery through a nested `CLAUDE.md` → `@AGENTS.md`. Codex and Cursor load nested `AGENTS.md` natively. (b) is preferred, provided Claude Code loads a nested `CLAUDE.md` lazily (only when it reads files under that directory) and resolves its import. If it loads at launch, (b) breaks the path-scoping ADR-017 depends on, and (a) is chosen.
4. **Tier 2, per-component knowledge** lives in `metadata.json` / `*.spec.json` only (schema-validated, tool-neutral). **Never add a per-component rules file.** That rule is what keeps Option B's fragmentation risk from materialising at 100+ components.
5. **Tier 3, enforcement** is deterministic scripts and CI (`components-check.yml` already runs the full gate on every PR). Prose never enforces what a gate can.
6. **Loop change (amends ADR-007).** `/add-component` spawns the adversarial reviewer **only for interactive components**, using the same derivation `scripts/a11y-coverage.js` uses for Tier 2 a11y (ADR-008): `component.type ∈ {interactive, input}`, an interactive ARIA role, or a widget keyboard contract. Every other component gets the in-session `/code-review` path (ADR-010's two-path model). `--review` forces the subagent and `--no-review` skips it. `--eval` keeps current behaviour (reviewer always), so the ablation's Arm 2 stays re-runnable.

### Alternatives rejected

- **Option A alone.** CLAUDE.md is already at its cap with 27 components, and Atlassian measured ~92% token inflation when conventions are dumped into context instead of indexed.
- **Option B alone.** `.claude/rules/` is Claude-only, which locks the system to one tool.
- **Keeping the reviewer always-on.** +69% $/clean with no change to the headline across 9 runs.

## Consequences

- **Two always-loaded files to keep in sync**, each with a budget gate. `scripts/claude-md-check.js` gains an `AGENTS.md` cap and an effective-size cap on CLAUDE.md that counts its resolved imports (ADR-017 amendment).
- **Non-Claude tools don't get automatic path-scoped loading** unless the Tier 1 decision picks nested `AGENTS.md`.
- **Display-only components lose the reviewer's above-headline catches.** Accepted. The contrast blind spot that let Badge's miss go unscored is tracked separately; the token contrast gate (`token-contrast-check.js`) still runs on every token PR.
- **Gate churn becomes the next cost to cut.** With the reviewer conditional, the 12 `metadata:validate` retries are the largest remaining waste in the loop. Deriving `tokens` from the CSS module and making validation errors name the expected value attack it at the source.
- **The ≤2-agent rule still holds** (ADR-007). The second agent is now conditional, not removed.

### Implementation order

Each lands in its own PR: ship `AGENTS.md` and extend `claudemd:check` → decide and wire Tier 1 delivery → risk-triggered reviewer in `/add-component` (`npm run component:risk -- <Name>` shares `a11y-coverage.js`'s derivation) → optionally, cut gate churn → close the evidence gaps (Arm 1b with the shipped `AGENTS.md`, one task outside `packages/components/**`). The plan lives in `.claude/handoff/2026-10-09-tiered-context-architecture.handoff.md`. Until the reviewer change ships, `/add-component` runs as ADR-007 describes.

### Revisit triggers

- Arm 1b (shipped `AGENTS.md` only, no path-scoped rules) differs from Arm 1 on violations or tokens.
- The out-of-path task shows path-scoping matters, in either direction.
- The pre-registered Accordion stretch task shows the reviewer earning its cost on display components too, or failing to earn it on interactive ones.

A tie on any of these is a reportable result and is recorded here as an amendment.

## Amendment (2026-10-09) — Tier 0 shipped: `AGENTS.md`

**Claude Code reads `AGENTS.md` natively.** Checked on Claude Code 2.1.280 in a scratch repo with no `CLAUDE.md`: a codeword placed only in `AGENTS.md` was answered without tools, and `/context` listed `AGENTS.md` under memory files. With a `CLAUDE.md` containing `@AGENTS.md` alongside it, `/context` showed the same memory total (5.6k tokens for a 21KB `AGENTS.md`). The file loads once, and the import adds only CLAUDE.md's own 12 tokens. `@AGENTS.md` stays in CLAUDE.md: it costs nothing, and it keeps older Claude Code versions, which don't read `AGENTS.md`, working.

**What moved.** Project purpose (the tool-agnostic paragraph), the token architecture and Style Dictionary invariant, the Figma vocabulary and code-first rule, the fixed component set and ADR-009 test, the layout grammar invariants, and the code conventions. They went from CLAUDE.md into `AGENTS.md`, which also gains the pointers Tier 0 requires: metadata and spec files with their schemas, frozen snapshots, gates, and ADRs. CLAUDE.md keeps the routing table, a short Figma-moments paragraph, frozen snapshots, MCP policy, git workflow, commands, agentic moments, ADR policy, and common tasks. Sizes: CLAUDE.md 15,017 bytes, `AGENTS.md` 5,843, 20,860 effective, against caps of 20,000 / 8,000 / 24,000 (ADR-017 amendment).

**Found while shipping.**
- **A stale root `AGENTS.md` had already been loading into every session.** Since 2026-10-01 a gitignored root `AGENTS.md` held figma-cli's bundled agent rules (7.3KB, ~1.8K tokens), and Claude Code loaded it natively. Those rules conflict with `/figma-cli`'s hard rules (for example, "never show terminal commands"). The committed file replaces it, `.gitignore` no longer lists `AGENTS.md`, and `claudemd:check` fails if a figma-cli rules block reappears in it.
- **The ablation's Arm 0 would have leaked context.** `scripts/harness-ablation/prepare.js` stripped `CLAUDE.md` but not `AGENTS.md`, so a re-run of Arm 0 would have loaded the conventions it is meant to lack. `AGENTS.md` is now stripped in Arm 0, and the ancestor guard checks for it too. Arms 1 and 2 carry the same content as before, split across two files.

**Portability is still unmeasured.** No non-Claude agent CLI is installed on the maintainer's machine, so the planned smoke test (ask Codex or Cursor for the component set and token layer order) has not run. It is recorded as pending in the PR, and the "Portability is unmeasured" line above still stands.

## Amendment (2026-10-09) — Tier 1 delivery: nested `AGENTS.md` (option b)

**The prerequisite holds.** It was checked on Claude Code 2.1.280 with headless probes in a scratch repo, using a codeword in each file and asking the session to list every codeword in its context:

| Setup | Launch, no reads | After reading a file under the package | After writing a new file there (no read) |
|---|---|---|---|
| `pkg/CLAUDE.md` = `@AGENTS.md`, `pkg/AGENTS.md` | not loaded | loaded, import resolved | not loaded |
| `pkg/AGENTS.md` alone | not loaded | **not loaded** | — |
| `.claude/rules/x.md` with `paths: pkg/**` (the old mechanism) | not loaded | loaded | not loaded |

A nested `CLAUDE.md` loads lazily and resolves its import, with the same trigger as the path-scoped rules it replaces: a read loads it, a write alone doesn't. Claude Code does **not** read a nested `AGENTS.md` without the sibling import, unlike the root one. So the sibling `CLAUDE.md` is required, not a convenience.

**Decision: (b).** `.claude/rules/components.md` → `packages/components/AGENTS.md` and `.claude/rules/tokens.md` → `packages/tokens/AGENTS.md`, moved with `git mv` and with their `paths:` frontmatter dropped. Each package gets a one-line `CLAUDE.md` containing `@AGENTS.md`. `.claude/rules/` no longer exists. Codex and Cursor get the package conventions by path, natively. That's the portability gain (a) couldn't give, and it's still unmeasured here for the same reason as Tier 0.

**Gate.** `claudemd:check` replaces its `paths:` frontmatter check with three Tier 1 checks:
- every nested `AGENTS.md` (tracked or untracked, not gitignored) has a sibling `CLAUDE.md` with an `@AGENTS.md` line;
- each pair is ≤ 16,000 bytes. There was no prior per-rule cap; components sits at 14,530, so the number fixes today's headroom rather than inventing a target;
- any `.claude/rules/*.md` fails, so package conventions keep one home.

**Harness.** `scripts/harness-ablation/prepare.js` now strips the four nested files in Arm 0 (it used to strip `.claude/`, which held the rules). The CardVertical task's redaction is repointed to `packages/components/AGENTS.md`. The text it removes is unchanged. Arms 1 and 2 carry the same conventions as before, at a new path, delivered by the same lazy trigger. Arm 1b (Step 6) will remove the nested files as well as `.claude/rules/`.

## Amendment (2026-10-09) — Step 6 readout: Arm 1b and an out-of-path task

**Setup, locked before any run** (handoff Step 6, developer decisions):
- **Arm 1b is pointer-only:** Arm 1 minus the nested `packages/*/CLAUDE.md`. The nested `AGENTS.md` files stay, so Tier 1 conventions are reachable only by following the root index's pointers. That's Vercel-style index plus retrieval, and roughly what a tool that loads only the root `AGENTS.md` sees. The Tier 1 amendment above said Arm 1b would remove the nested files too. That was rejected, because it would leave the root pointer dangling and test content removal, not delivery.
- **Baselines:** the three component tasks compare against the historical Arm 1 without re-running it. A new `feedback` token task runs Arms 1 and 1b on the same HEAD.
- **Feedback task:** it deletes the 24 `color.{background,text,border,icon}.feedback.*` theme tokens and asks for them back. It's scored on `tokens:build`, the baseline contrast gate, and eight traps.
- **Prediction:** a tie on violations, with 1b cheaper.
- **Run settings:** `claude-opus-5-5`, effort medium, N = 3, 15 runs, $10.33.

| Task set | Arm 1 | Arm 1b |
|---|---|---|
| badge · checkbox · cardvertical (Arm 1 historical, pre-ADR-029 HEAD) | 9/9 clean · $0.91 per clean · 871K / 1,060K / 1,284K context tokens per run | 9/9 clean · $0.78 per clean · 740K / 770K / 1,056K |
| feedback (same HEAD) | 1/3 clean · $0.70 per run · 599K | 1/3 clean · $0.39 per run · 282K |
| Read the relevant Tier 1 file itself | (loaded by path) | 12/12 runs |

**Against the revisit triggers:**
1. **Arm 1b vs Arm 1 on violations: no difference.** On tokens, 1b is cheaper on every task. That doesn't argue for dropping the nested `CLAUDE.md` siblings, for two reasons:
   - When 1b follows the pointer and reads the file, the same bytes enter context that path-loading would have added. Delivery can't explain the gap.
   - The component comparison is against a different HEAD, with a 20KB monolithic CLAUDE.md and `.claude/rules/`. On the same HEAD, the feedback gap comes from scope, not overhead. Two of Arm 1's three runs added `green`/`yellow` primitives and amended ADR-014 (below). Arm 1's one plain run used 272K, in line with 1b's 248K–339K.

   Tier 1 delivery stays option (b).
2. **The out-of-path task shows path-scoping didn't matter here.** Both arms read `packages/tokens/AGENTS.md` in 3/3 runs, and both produced the same violations. This is the first measurement on a task outside `packages/components/**`. The prediction held.
3. **Accordion has not run.** Its trigger is still open.

**Sensitivity of the feedback score.** All four feedback "violations" (two per arm) are the pre-registered `collateral-change` trap. None is a defect:
- Arm 1 runs 1 and 3 found that `teal` and `amber` are brand-slot hues. They added Radix `green`/`yellow` as reserved feedback hues and amended ADR-014, which is option 1 of #128, unprompted.
- Arm 1b runs 1 and 3 added feedback pairs to the contrast `PAIRS`, which is the documented convention. They only added pairs, and the score uses the baseline script, so the gate wasn't weakened.

The headline keeps the locked trap (developer decision). Under a narrower trap (additive primitives and new PAIRS allowed; changes to existing tokens, removed pairs and waivers still counted), both arms are 3/3. The verdict is a tie either way.

**Also seen:**
- The pointers worked in 12/12 Arm 1b runs. For Claude, an index that names the Tier 1 file is enough to get it read.
- Arm 1b's secondary drift: 2/3 Badge runs named the variant value `outlined` instead of `outline` (Arms 0 and 2 did the same; Arm 1 didn't). One Checkbox run wrote no metadata.
- A Stage 0 calibration fix: dark `icon.feedback.warning` aliased a light-scale amber step. It now uses `amber.dark.9`.

**Still unmeasured:** portability (no non-Claude CLI has run), and the Accordion task. Confidence stays limited: N = 3, and the component tasks were already at ceiling for Arm 1.

## Amendment (2026-10-10) — Step 6.5 readout: the Accordion stretch task

**Setup, locked before any run** (handoff Step 6.5, developer decisions): rebuild `Accordion` from a behaviour-only brief, Arms 1 and 2, `claude-opus-5-5`, effort medium, N = 3, 6 runs, $10.15. Thirteen redactions remove its prop names, Figma mapping, contrast pairs and the ROADMAP line naming the July pilot's bug. ADR-009's accordion-trigger example is kept, since both arms see it. The headline adds four brief-checklist items (open state announced, keyboard-operable header, heading outline, export) and one forbidden pattern: a conditionally rendered panel under `aria-controls`, the dead reference the July reviewer caught. The trigger was made operational before the runs. The reviewer *earns its cost on the headline* if Arm 2 has more clean runs than Arm 1, or if the dead-reference trap fires in Arm 1 and never in Arm 2.

| Arm | Clean | $/run | $/clean | a11y test cases | Reviewer findings (high+medium) |
|---|---:|---:|---:|---:|---:|
| 1 · Context only | 2/3 | $1.19 | $1.79 | 5–7 | — |
| 2 · Full harness | 3/3 | $2.19 | $2.19 | 11–13 | 9–11 (3–4) |

**Against the trigger: it fires, narrowly.** Arm 2 has 3/3 clean runs and Arm 1 has 2/3. The one non-clean Arm 1 run (run 2) has 4 `raw-text-prop-render` hits, all in its own stories file: `{module.description}` passed as children to `Accordion.Item`, which wraps string children in `<Text>` at runtime. The locked 2026-10-09 rule keeps that trap in the headline everywhere, stories included, and the developer kept it.

**Sensitivity.** If story-file hits of that trap moved to system compliance, the way `raw-visible-text` did, the result is a 3/3 tie and the trigger reads "fails to earn it on the headline". Across all 48 ablation runs, this is the only story-file hit of that trap. So the headline margin rests on story scaffolding, not on anything a consumer would see.

**The bug the forbidden pattern targets never appeared.** All six runs keep the panel mounted (`hidden={!open}`), and all six wrote a behavioural a11y test covering `aria-expanded`, Enter/Space and arrow keys. Arm 1 wrote the test in 3/3 runs without being told to by a loop. The ADR-008 convention in `packages/components/AGENTS.md` was enough.

**What the reviewer bought.** Ten high or medium findings across three runs.
- **One was headline-visible:** an arrow-key handler on a static `<div>`, which fails `jsx-a11y` lint. The reviewer had it fixed before the gate.
- **Nine were above the headline:**
  - test gaps: Shift+Tab, focus inside open panels, roving-scope edge cases
  - title and subtitle joining into the accessible name with no space
  - a raw title `<span>`
  - a broken controlled story
  - a chevron overlay intercepting the panel area

  Arm 2's tests are about twice the size of Arm 1's. On this component the reviewer earns its cost on depth, and only marginally on the headline.

**What it didn't catch.** Arm 2 run 2 moved open state to the container as `value`/`defaultValue`/`onValueChange` (a `string[]`), away from the system's `open`/`onOpenChange`. The loop passed it. The other five runs reproduced the reference names (`title`, `subtitle`, `open`, `defaultOpen`, `onOpenChange`, `headingLevel`). Three runs built a data-array API and three built `Accordion.Item` parts. The automated vocabulary check reads only `*Props` types, so it can't see the data-array runs' item type. The names were read by hand.

**Prediction:**
- **Held:**
  - both arms ≥ 2/3 clean
  - the reviewer had ≥ 1 above-headline finding per run
  - Arm 1 wrote the test in ≥ 2/3 runs, with thinner keyboard coverage
- **Didn't hold:**
  - an exact headline tie: it ties only under the sensitivity reading
  - Arm 2 at 1.5–2× the cost per clean component: it's 1.22× per clean, and 1.84× per run

**Decision unchanged.** The risk-triggered reviewer (Step 4) keeps spending the subagent on interactive components. This run is the first measured case where it's no worse than context alone on the headline, and it buys deeper tests. The trigger's other half, the reviewer on *display* components, can't be tested by an interactive task and stays open. Not counted: one Arm 1 attempt cut off by a 429 before any result was recorded; the run restarted in a fresh workspace.

