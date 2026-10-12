# Taking the harness apart to see what holds it up

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar. The numbers live in `08-measured-impact.md` §"The harness ablation" (and its two follow-ups), which takes them from `scripts/harness-ablation/results.md` and ADR-029. This page tells what the eval taught and what it changed. Where a figure appears here, 08 is its source of record.*

## The question I had been running on assumption

The pattern-schema harness (ADR-013) measured *context*: one prompt, no tools, score what comes back. It never touched the part of the system I'd spent the most effort on: the harness around the model. That meant the tools, the deterministic gate with its retry loop, and the fresh adversarial reviewer that ADR-007 made mandatory on every component. All of it ran on every `/add-component`, and none of it had been measured. I believed the loop earned its cost because it felt rigorous, which isn't evidence.

So in October 2026 I took the harness apart and checked which pieces actually hold it up. The method follows the with/without evals Vercel ran for its AGENTS.md and Atlassian ran for context delivery. Same brief, same model (`claude-opus-5-5`, effort medium), each run agentic in a fresh workspace, and three arms:

- **Arm 0, bare repo.** Components, tokens, stories and npm scripts, with no `CLAUDE.md`, ADRs or metadata. This is the fair baseline: a team with a good component library and no agent harness. It's not "Claude with nothing", which would be a straw man.
- **Arm 1, context only.** Everything written down (instructions, ADRs, metadata, specs), but no commands, agents or skills. The agent knows the conventions and nothing checks it.
- **Arm 2, full harness.** `/add-component --eval`: scaffold, gate with retries, one reviewer subagent, fix step.

## Built so the answer key couldn't leak

Each task deletes a component that already ships and asks for it back, so the shipped version is the answer key: Badge (display, token-heavy), Checkbox (input with an accessibility contract), CardVertical (composite). That design only works if the model can't find the answer, so leakage was engineered out rather than hoped away:

- The workspace is a `git archive` with fresh history, so there's nothing to dig back up.
- Lines in ADRs and conventions that describe the target's own API are redacted by exact match, and **a redaction that stops matching fails the run** instead of leaking silently.
- Every transcript was read for leaks and git archaeology before any score was trusted.

The prediction and the honest-outcome rule were written down before the first run: "if Arm 2 doesn't beat Arm 1 by a meaningful margin, report that and question whether the loop and the reviewer earn their cost." Scoring is a script with the repo's real gates, in two buckets kept apart. **Product quality** is what a consumer would notice, and it's the headline. **System compliance** (metadata, prop vocabulary, story conventions) is reported but never added in, so Arm 0 isn't penalized for conventions it was never shown.

## The headline

| Arm | Clean runs | Cost per clean component |
|---|---:|---:|
| 0 · Bare repo | 6 / 9 | $0.73 |
| 1 · Context only | 9 / 9 | $0.91 |
| 2 · Full harness | 9 / 9 | $1.54 |

27 runs, N = 3 per cell, measured. Per-task tables and costs are in [08](08-measured-impact.md).

My prediction was Arm 0 worse than Arm 1, worse than Arm 2. It held on one half and failed on the other, and the failed half is the more useful one.

## Lesson 1: context turns plausible into shippable

Only one step changed the headline: Arm 0 → Arm 1. All of it came from one task. The bare repo rebuilt Checkbox three times and shipped zero clean ones, with the same two defects every time. The label rendered as raw text outside `Text`, and the change callback was named `onCheckedChange` instead of the native `onChange` the system keeps for form inputs (ADR-025). A careful reader of the neighbouring components could have inferred both, and the model didn't. Both are written down in the context Arm 1 gets, and Arm 1 got them right 3/3.

That changes how I describe the system's value. The code library alone gets you plausible components. What gets you shippable ones is the layer of written-down decisions on top, and it's cheap: about 1.9× the spend per run, for three shippable Checkboxes instead of none.

## Lesson 2: the loop spent its retries on its own paperwork

Arm 2 never beat Arm 1 on any task, and it cost about 1.7× as much per clean component. Reading each run's `.run.json` showed why. The gate failed 12 times across 9 runs, and **every failure was `metadata:validate`**: tokens listed that the component reads only through `Text` or `Icon`, a schema enum, a CSS-spelled token path, one stray directory. The retry loop fixed compliance artefacts the loop itself had to produce, and never a product defect, because Arm 2 never made one for it to catch.

That was uncomfortable to read, since the loop was the most visible piece of engineering in the repo. It also pointed at a fix that came later. A hand-maintained token list in metadata is exactly the kind of field an agent gets wrong and a gate then bounces. The spec rollout (ADR-027, [next chapter](13-spec-architecture.md)) removed the list and derives tokens from the spec's `styles`, which takes away the source of the churn rather than retrying through it.

## Lesson 3: the reviewer works above the headline

The reviewer reported findings beyond the gate in 9 of 9 Arm 2 runs, 1–2 of them high or medium per run. Some of those were real product changes in dimensions the headline doesn't score:

- Checkbox: forced-colors handling, whole-row hover targets, and the keyboard test cases the APG pattern requires. Two of three runs added forced-colors handling, which neither the other arms nor the shipped reference have.
- CardVertical: type-level narrowing so the props the metadata forbids can't compile.
- Badge: a contrast miss, but one the reviewer's own arm had created. Arms 0 and 1 had picked the passing token unprompted.

The pattern is the finding. On interactive components the reviewer adds depth that nothing else in the system produces. On a display component it mostly repairs its own arm's work. That's a reason to make it conditional, not to keep it or drop it everywhere.

## Lesson 4: say where the instrument is blind, don't patch it after the fact

Three gaps showed up. The first two stay on the record unpatched, and the third was fixed in the open, never to rescue a result:

- **Contrast isn't scored.** The axe sweep runs in jsdom with `color-contrast` off, so a contrast miss in any arm goes uncounted. The Badge catch above is real but invisible to the headline.
- **The gates don't check the design.** A blind 3-point rating against Figma (one rater, arms shuffled to letters) gave Arm 2 no "matches" on any task. The only matching Checkbox came from Arm 0, the arm that failed the headline 0/3. Gates and reviewer check conventions, not visual fidelity.
- **The scorer had bugs of its own.** Score reviews caught three false positives (a forbidden-pattern match inside `Omit<…>`, a vocabulary entry where the shipped name was itself the drift, a label check that missed `<Text as="label">`). Each was fixed before the next task ran and rescored from retained workspaces. No brief or trap changed after a result existed for its task.

Two of the three tasks also turned out not to discriminate. Badge is easy by construction. CardVertical was meant as the hard composite and turned out to be a near-copy of CardHorizontal, which Arm 0 read and reproduced. Choosing tasks well is harder than running them.

## What it changed: ADR-029

The eval's job was to decide something, and it did. ADR-029 (2026-10-09) chose between three context architectures: one monolithic always-loaded index, path-scoped rules only, or a tiered hybrid. Four criteria judged them: scale past 100 components, portability to other coding agents, cost per clean component, and enforcement by gate rather than prose. It picked the tiered hybrid:

| Tier | What | Where |
|---|---|---|
| 0 | Tool-agnostic invariants and pointers, ≤ 8KB | root `AGENTS.md` |
| 0b | Claude-specific workflow, importing Tier 0 | root `CLAUDE.md` |
| 1 | Package conventions, loaded by path | `packages/*/AGENTS.md` + a one-line sibling `CLAUDE.md` |
| 2 | Per-component knowledge, schema-validated | `<Name>.metadata.json`, `<Name>.spec.json`, never a per-component rules file |
| 3 | Enforcement | scripts and CI |

The monolith was ruled out by a number already in the repo: `CLAUDE.md` sat at 19,993 of its 20,000-byte cap with 27 components. And the loop changed: **the adversarial reviewer became risk-triggered.** `/add-component` now spawns it only for interactive components, using the same derivation the accessibility gate already uses (`npm run component:risk`). Every other component gets in-session `/code-review`.

Shipping the tiers found two things no review had:

- **Claude Code doesn't load a nested `AGENTS.md` on its own.** Headless probes in a scratch repo showed a nested `CLAUDE.md` loads lazily on the first read under its folder and resolves an `@AGENTS.md` import. A bare nested `AGENTS.md` never loads. So the sibling `CLAUDE.md` is required, and `claudemd:check` now fails without it.
- **A stale file had been loading into every session since 2026-10-01.** A gitignored root `AGENTS.md` held figma-cli's bundled agent rules, which contradict the `/figma-cli` command's own rules. Claude Code read it natively. The committed `AGENTS.md` replaced it, and the budget gate now fails if that rules block reappears. The same audit caught that the ablation's Arm 0 would have leaked conventions through it on a re-run.

## The follow-ups answered the revisit triggers

ADR-029 wrote down what would make it change its mind, and two follow-ups ran against those triggers.

**Does path-loading earn its keep? (Arm 1b, 15 runs.)** Arm 1b removed the nested `CLAUDE.md` files, so the package conventions were reachable only through the root index's pointers. Quality was identical. The pointers were followed in 12 of 12 runs, so for Claude an index that names a file is enough to get it read. Arm 1b was cheaper, but not because of the delivery mechanism, since a pointer read adds the same bytes a path load does. The decision stayed. The token task outside `packages/components/**` added the most interesting run of the set: two Arm 1 runs noticed that the feedback colours reused brand hues, which ADR-014 forbids, and fixed the ADR unprompted. That's now issue #128.

**Does the reviewer earn its cost where it's still spent? (Accordion, 6 runs.)** Arm 2 3/3 clean, Arm 1 2/3, so the trigger fires, narrowly. The margin rests on four hits of one trap in Arm 1's own stories file, the only such hit in all 48 ablation runs. The targeted bug (a conditionally rendered panel breaking `aria-controls`, which the July reviewer had caught) never appeared in either arm. Both kept the panel mounted, and Arm 1 wrote a behavioural accessibility test 3/3 without a loop telling it to. What the reviewer bought was depth: about twice as many test cases (11–13 vs 5–7). It also missed something: one run renamed the open-state API to `value`/`onValueChange`, away from the system's `open`/`onOpenChange`, and the loop passed it.

## Frozen, not rewritten

On 2026-10-12 the spec rollout changed the shape of the files these evals inject and score. A run on the new HEAD would measure the eval's own drift, not the architecture. So the harnesses are frozen at `044d28f`, the last commit before the rollout, and `scripts/frozen-eval.js` makes that a gate, not a convention: `ablation:run` and `harness:run` refuse to run on the current HEAD and print the `git worktree` command for the frozen commit. The results stay as evidence for the ADRs they decided. A future question about the spec-based architecture gets its own pre-registered eval rather than a revived arm.

## What it doesn't prove

- **Small numbers.** N = 3 per cell, and only one of three original tasks separated the arms. Every comparison here is directional.
- **One tool.** Every run used Claude Code. The portability argument for `AGENTS.md` is structural; no other coding agent has run against it.
- **The display-component half is open.** Making the reviewer conditional assumes it adds little on display components. The Badge evidence points that way, but no task was designed to test it, and an interactive task can't.
- **The blind spots are real.** Contrast and visual fidelity aren't in the headline, so "clean" means convention-clean, not design-correct.
- **Scale.** About $47 across 48 ablation runs. It's enough to change a decision in a one-person system, not a benchmark.

## Why this belongs in the case study

The part of the system I was proudest of was the most expensive, and the measurement showed it wasn't what made components shippable. The written-down context was. The rule written before the first run said to report that plainly, so I did, and then acted on it: the reviewer moved to where it measurably adds something, and the gate's churn got traced to a field the next change removed. The eval didn't end with a dashboard. It ended with an ADR, two follow-ups aimed at that ADR's own revisit triggers, and a freeze that keeps the evidence reproducible after the system moved on.

## Sources for this section

- `docs/case-study-source/08-measured-impact.md` §"The harness ablation" and both follow-ups — source of record for every figure
- `scripts/harness-ablation/results.md`, `scripts/harness-ablation/results/visual-rating.json`
- `.claude/handoff/archive/2026-10-07-harness-ablation-eval.handoff.md` — scope, leakage controls, pre-registration, scorer fixes
- `.claude/handoff/archive/2026-10-09-tiered-context-architecture.handoff.md` — implementation steps 1–6.5
- `docs/decisions/029-tiered-context-architecture.md` — the decision, the Tier 0 / Tier 1 / Arm 1b / Accordion amendments, the 2026-10-12 freeze
- `docs/decisions/007-*.md` (the loop it amends), `017-claude-md-context-budget.md` (budgets), `008-*.md` (the interactive derivation)
- `scripts/component-risk.js`, `scripts/claude-md-check.js`, `scripts/frozen-eval.js`
- Issue #128 — the feedback-hue finding from the out-of-path task
- `docs/case-study-source/10-context-engineering.md`, `11-governance-decision-eval.md`, `13-spec-architecture.md` — sibling chapters
