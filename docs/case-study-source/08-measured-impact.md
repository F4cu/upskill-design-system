# The numbers, and where each one comes from

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar. This file is the single home for the system's quantitative claims; the other source files cite it rather than repeating numbers that would drift.*

## Methodology, stated once

Every number below is tagged **Measured** (read directly off a committed artifact — a file size, a ledger entry, a workflow YAML), **Estimated** (derived from a measured number via a stated assumption), **External** (a published source outside this repo, cited with enough detail to chase down), or **Gap** (the architecture claims it, nothing yet substantiates it). Token counts use bytes ÷ 4 as a rough, conservative heuristic, not billing math.

## Impact, summarized

**Lower cost.** 22 scripts, 37 npm commands, and 7 GitHub Actions run with zero LLM or MCP calls (measured). Agents handle only the 9 Claude commands reserved for jobs a script cannot do, so there is no per-run model spend on the day-to-day pipeline.

- Governance reads: the frozen `airtable-governance.json` costs 977 bytes instead of the 60,695-byte raw pull it replaces — a 62.1× reduction, for that one file specifically, not the snapshot mechanism generally (measured, 2026-07-23; see "Frozen snapshots" below). This is a per-read payload saving, not a call-frequency count — how often each of the 7 consuming commands actually runs isn't tracked, so no "calls avoided per week" number exists yet.
- Figma reads: the variables file is one captured MCP read, reused by two commands (`add-component`, `figma-variable-audit`) — each reuse after the first avoids a fresh ~9,600-token MCP response (measured size of the captured file, estimated avoidance — no second raw pull was run to confirm the size holds).
- Always-on comparison: if the 7 CI workflows ran as agent sessions instead of scripts, a normal week of PR activity would burn roughly 150K–1M tokens of usage window that currently costs zero (estimated — wide range, no baseline experiment; an order-of-magnitude illustration, not comparable to the measured numbers above).

**Reliable visibility.** Committed snapshots replace live API reads at 20 reference points across 7 commands (measured, by grepping the command files) — each reference is one live API call or raw repo scan that never happens.

- The reliability comes from the mechanism, not the file size: a committed snapshot returns identical content on every read, where a live call can vary with timing, rate limits, or partial pagination. A maintainer checks status in one command and reads the same result every time.
- The governance file's small size (977 bytes vs. 60,695 raw) is a side effect of keeping only the four fields the pipeline needs — it's part of the cost story above, not the source of this reliability guarantee.

**Higher-quality output.** Lint runs on every commit (Tier 1), and coverage plus behavioral accessibility tests run before merge (Tier 2, ADR-008) — designers and developers inherit accessible components rather than auditing them after the fact.

- Gate, then human, then reviewer: across `/add-component` runs the deterministic gate passed 12 of 12; a human visual go/no-go (Stage 2b/2c, ADR-007) runs *before* the adversarial reviewer is even spawned, so the fresh-context reviewer only ever sees a component the maintainer has already accepted on sight — and it still caught extra findings in 7 of 12 runs before a human read the code (18 findings total, measured — see "Gates and the adversarial reviewer" below). Caveat: in the controlled harness ablation, the full loop never beat context alone on the product-quality headline and cost about 1.7× as much per clean component — the reviewer's catches there were real but fell outside what the scorer counts (see "The harness ablation" below).
- Learning loop: each finding routes back into component metadata via `/extract-learnings`, so the next generation inherits the fix as a checked rule rather than repeating the mistake — reviewers spend their time on judgment, not on catching regressions the system already knows about.
- Caveat: the routing mechanism is measured as a process (findings do get written back); no before/after experiment measures whether later generations actually produce fewer of the same mistake, so the compounding-quality effect itself stays a reasoned claim, not a tracked one.

## What isn't measured, up front

Before the numbers that are pinned down: three real gaps in this system's own evidence, kept on the record rather than quietly rounded up. The Figma-variables half of the "avoided live fetch" claim has no captured baseline. Escaped-defect rate — did anything a reviewer missed reach production — isn't tracked at all; "no agent code reaches `main` unreviewed" is a verified *process* guarantee, not a defect-rate claim. And the standard in-session review path, 15 of the 27 shipped components, records no findings telemetry, so every ledger number below is honest about covering only the other 12. None of these are fatal to the claims that follow; they're the boundary of what the claims cover. Full list, with what would close each gap, at the end of this chapter.

## Frozen snapshots: the context economics

The numbers below are the price side of the memory architecture described in [Giving AI the right context at the right time](10-context-engineering.md) — this section is what that architecture costs, not what it's shaped like.

The seven substantive frozen-snapshot files total **~127 KB, roughly 31,700 tokens** (measured):

| File | Bytes | ≈ tokens |
|---|---:|---:|
| `packages/tokens/figma-variables.json` | 38,495 | 9,600 |
| `packages/tokens/token-usage.json` | 34,644 | 8,700 |
| `.claude/component-patterns.json` | 23,206 | 5,800 |
| `.claude/component-pipeline.json` | 21,879 | 5,500 |
| `.claude/STATUS_QUO.md` | 4,668 | 1,200 |
| `.claude/component-review-state.json` | 2,936 | 700 |
| `packages/tokens/airtable-governance.json` | 977 | 240 |

These files are consumed at **20 reference points across 7 commands** (`add-component`, `layout-generation`, `review-component`, `figma-variable-audit`, `token-deprecation-pass`, `extract-learnings`, `airtable-sync`) — each reference is one live API call or raw repo scan that never happens (measured, by grepping the command files).

The starkest single ratio is the Airtable snapshot: 977 bytes of filtered four-field governance state standing in for a full-table REST pull of every record with every column. The raw-payload multiplier is **62.1×** (measured, 2026-07-23 — method: all-fields REST pull of both `Primitive tokens` and `Semantic tokens` tables, 60,695 combined raw bytes across 344 records ÷ 977 committed governance bytes). The Figma file is itself one captured MCP read reused by two commands — each reuse avoids a fresh ~9,600-token MCP response (measured size, estimated avoidance).

Two external anchors say this mechanism is not a local superstition. Anthropic's engineering post ["Code execution with MCP"](https://www.anthropic.com/engineering/code-execution-with-mcp) (Nov 2025) works through an agent workflow that consumed **150,000 tokens** streaming raw tool payloads through context and drops to **2,000 tokens — a 98.7% reduction** — by loading only what's needed: the same move the snapshots make, applied at the vendor's own scale. And Anthropic's [prompt-caching pricing](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) sets cache reads at **10% of base input price**: a stable committed file re-read across a session is cacheable; a live API response is full-price, every time, and burns rate limit besides.

## Scripts vs agents: the inventory

Measured by direct count and by reading every workflow YAML in full:

- **22 scripts** in `scripts/`, **37 npm script entries**, **7 GitHub Actions workflows** — and all 7 workflows contain **zero LLM or MCP calls**. Every step is `npm ci`, `node scripts/*.js`, an `npm run`, or a `gh api` call.
- Against that: **9 agentic moments** (all developer-triggered) and exactly **2 subagent definitions**.

One framing honesty-check belongs next to that count: "100% of recurring work runs at zero LLM cost" is true **by construction, not as an emergent optimization** — the charter defines recurring work and agent work as disjoint sets. That is the stronger claim anyway: the architecture makes the expensive path structurally impossible to schedule, rather than trusting someone to notice a creeping agent bill.

The counterfactual is worth stating with its assumptions visible: if the CI gates were naive agent sessions instead of scripts (~3,000–15,000 tokens per gate run, reading files plus reasoning), a normal week of PR activity would burn roughly **150K–1M tokens of usage window** that currently costs zero (estimated — wide range, no baseline experiment; treat as an order-of-magnitude illustration, not a measurement).

External anchor: Anthropic's ["Building Effective Agents"](https://www.anthropic.com/engineering/building-effective-agents) — "find the simplest solution possible, and only increase complexity when needed"; workflows (predefined code paths) for well-defined tasks needing predictability, agents only where flexibility earns its cost. ["Writing effective tools for agents"](https://www.anthropic.com/engineering/writing-tools-for-agents) frames tooling as "a contract between deterministic systems and non-deterministic agents" — the deterministic side of that contract is exactly what the script layer is.

## Gates and the adversarial reviewer: the ledger

`run-ledger.json` holds **12 full-path component-loop runs** (all 2026-07-09). Measured, recomputed from the raw file:

- **12 of 12** recorded runs passed the deterministic gate (the ledger records post-pass runs only — this is not evidence gates never fail mid-loop, only that no failure survives to the record).
- **12 of 12** runs then cleared the human visual checkpoint (Stage 2b/2c) before the reviewer was spawned — the order is fixed by the command, not a convention a run could skip: no adversarial review starts on a component the maintainer hasn't looked at first.
- The adversarial reviewer found issues **beyond** what the gate *and* the visual checkpoint could catch in **7 of 12 runs (58%)** — 18 findings total, **1.5 per run on average** (2.6 among the runs that had any). Those are defects a human eye reading the rendered component missed and a fresh, read-only AI reader reading the code caught — the two checks are catching different classes of error, not duplicating each other.
- **0 manual rescues** across all 12 runs — the loop never needed human intervention beyond its built-in fix step, and every run still closes with a human PR merge regardless of what either check found.

The per-component split is more informative than the average. The reviewer earned its cost on interactive and composite components — Accordion (4 findings), ButtonArrow (3), DropdownMenu (3), TextField (3), Chip (2), TextLink (2), Text (1) — and found **nothing** on the layout primitives: Box, Stack, Inline, Heading, Checkbox all logged zero findings beyond the gate. That pattern suggests a routing heuristic the ledger itself surfaced: the full adversarial path for interactive components, the cheaper standard path for primitives. Whether to adopt it is a judgment call; that the data exists to make it is the point of keeping the ledger.

Scope caveat, stated plainly: the ledger covers the full-review path only — **12 of 27 shipped components (44%)**. The other 15 went through the standard in-session path, which records no findings telemetry. The stability claim is measured for the components where it matters most and unmeasured for the rest.

## The pattern-schema harness: measured, corrected, kept

The one controlled experiment in the repo (`scripts/pattern-accuracy-harness/`, 7 pre-registered tasks × 2 arms, deterministic scoring, corrected per ADR-013's two amendments). Tasks were locked in before any run — the harness's own honest-outcome rule states plainly, verbatim: *"if Arm B does not reduce violations meaningfully, report that plainly and recommend not shipping the schema. Do not massage tasks to manufacture a win."* Each task ran twice through identical headless prompts, Arm A with per-component metadata only, Arm B with the full pattern file added, scored by the same deterministic gates the system already runs in CI plus a grep/AST trap checklist — no LLM judged the output, a script did:

| Task kind | Metadata only | + pattern file | Delta |
|---|---:|---:|---|
| Composition + layout (4 tasks) | 13 | 4 | **−69%** |
| Component scaffold (3 tasks) | 17 | 22 | **+29% (regression)** |
| Total | 30 | 26 | −13% |

(The gate-violations-only subset for scaffold is 9→15; the totals above include the trap checklist.) The 13% aggregate reduction would read as a modest win on its own — broken out by task kind, it's a split verdict, and the split is what drove the scoped decision: pattern file into `/layout-generation` only, never `/component-scaffold`, on the theory that the ~23K-character aggregate crowds out a scaffold task's attention on its narrower schema and file-contract rules. The harness stayed in-repo as the standing instrument, and later caught a real bug in its own scoring — a false positive on text props passed in attribute position — which was corrected from retained raw outputs with no tasks rerun; the fix sharpened the split rather than changing it. A second scorer fix in October removed four symmetric false positives (one per arm on two scaffold tasks: the scorer didn't know brand-layer tokens), lowering both totals by 2 and leaving every delta unchanged. Full narrative: [Rejected alternatives §1](04-rejected-alternatives.md).

External anchors for the gate-plus-generator architecture generally: the LLM-Modulo position paper (Kambhampati et al., ICML 2024, [arXiv:2402.01817](https://arxiv.org/abs/2402.01817)) — LLMs generate candidates, external sound critics verify, because the models cannot reliably self-verify; Huang et al. (ICLR 2024, [arXiv:2310.01798](https://arxiv.org/abs/2310.01798)) — intrinsic self-correction without external feedback often *degrades* output, which is why the gate is a script and not a "please double-check" prompt. For the fresh-context reviewer specifically, a 2026 controlled study ([arXiv:2603.12123](https://arxiv.org/abs/2603.12123)) found fresh-session review outperformed same-session self-review (F1 28.6% vs 24.6%) on 150 injected errors — a single-author preprint, not yet peer-reviewed, so it's suggestive corroboration paired with the peer-reviewed self-correction result, not settled proof.

## The harness ablation: what the context buys, and what the loop doesn't (yet)

The pattern-schema harness measured *context*: single-shot prompts, no tools. The second controlled experiment (`scripts/harness-ablation/`, October 2026) measures the *harness* — tools, gates, the retry loop, the reviewer — by taking pieces of it away. It follows the with/without method of Vercel's AGENTS.md eval and Atlassian's context-delivery eval. Three arms, the same brief, the same model (`claude-opus-5-5`, effort medium, $5 cap per run), each run agentic (`claude -p` with tools) in a fresh workspace:

- **Arm 0, bare repo.** Components, tokens, stories and the standard npm scripts. No `CLAUDE.md`, no `.claude/`, no ADRs, no metadata. The fair baseline: a team with a good component library and no agent harness, not "Claude with nothing".
- **Arm 1, context only.** Arm 0 plus `CLAUDE.md`, rules, ADRs and metadata, but no commands, agents or skills — the agent knows the conventions, nothing checks it.
- **Arm 2, full harness.** Everything, driven by `/add-component <Name> --eval`: scaffold, deterministic gate with retries, one adversarial reviewer subagent, fix step.

Each task deletes a component that already ships and asks for it back, so the shipped version is the answer key: `Badge` (display-only, token-heavy), `Checkbox` (input, a11y contract), `CardVertical` (composite preset). 3 tasks × 3 arms × 3 runs = 27 runs, sequential. Leakage was controlled rather than assumed: the workspace is a `git archive` with a fresh history and an expired reflog; the target's directory, export, stories and screenshot baselines go; lines in ADRs and rules that describe the target's own API or Figma mapping are redacted by exact match (a redaction that stops matching fails the run instead of leaking silently); every transcript was read for leaks and git archaeology before any score was trusted.

**Pre-registered before the first run:** a prediction (violations Arm 0 > Arm 1 > Arm 2, Arm 2 most expensive per run), the same honest-outcome rule as the pattern harness ("if Arm 2 doesn't beat Arm 1 by a meaningful margin, report that and question whether the loop and the reviewer earn their cost"), median-run-only figures, and N = 3. Every task brief, trap and checklist was locked before its task ran.

Scoring is a script, run inside each workspace with the repo's real gates, in two buckets kept apart so Arm 0 isn't penalised for conventions it was never shown. **Product quality** (the headline — what a consumer would notice): typecheck, lint with jsx-a11y, axe over every story, missing deliverables, raw hex/px traps, an `unknown-token` trap (every `var(--ds-*)` must exist in the built CSS), an `invented-import` trap, and a per-task checklist. **System compliance** (reported, never added in): metadata, prop vocabulary (ADR-026), story conventions.

### Results (measured)

| Arm | Clean runs | Mean violations | Total cost | Cost per clean component |
|---|---:|---:|---:|---:|
| 0 · Bare repo | 6 / 9 | 0.7 | $4.39 | $0.73 |
| 1 · Context only | 9 / 9 | 0.0 | $8.21 | $0.91 |
| 2 · Full harness | 9 / 9 | 0.0 | $13.85 | $1.54 |

Per task, only one separates the arms:

| Task | Arm 0 | Arm 1 | Arm 2 |
|---|---|---|---|
| Badge | 3/3 clean · $0.33/run | 3/3 · $0.72 | 3/3 · $1.34 |
| Checkbox | **0/3 clean** · 2.0 violations/run · $0.67/run | 3/3 · $0.92 | 3/3 · $1.58 |
| CardVertical | 3/3 · $0.46 | 3/3 · $1.10 | 3/3 · $1.70 |

Arm 0's Checkbox failures are real and identical in all three runs: the label rendered as raw text outside `Text`, and the change callback named `onCheckedChange` instead of the native `onChange` the system's ADR-025 contract keeps for form inputs. Both are conventions a reader of the neighbouring components could have inferred and didn't; both are written down in the context Arm 1 gets.

### The honest reading

The pre-registered prediction held on one half and failed on the other.

- **Context earns its cost.** Arm 0 → Arm 1 is the only step that changes the headline: 6/9 → 9/9 clean, for about 1.9× the spend per run. On the task where the conventions mattered, the bare repo produced zero shippable components for $2.02; context produced three for $2.76.
- **The loop and the reviewer don't show up in the headline.** Arm 2 never beats Arm 1 on any task, and costs about 1.7× as much per clean component. Under the honest-outcome rule, that is the result, and it is reported as one.

Two things qualify that result without overturning it.

**What the loop's retries actually fixed.** Arm 2's gate failed 12 times across its 9 runs, and every failure was `metadata:validate` — tokens listed that the component reads only through `Text` or `Icon`, a schema enum, a CSS-spelled token path, one stray directory from a `mkdir` in the wrong folder. The retry loop repaired system-compliance artefacts every time and never a product defect, because Arm 2 never produced one for it to catch (measured, from each run's `.run.json`).

**What the reviewer caught that the instrument doesn't score.** The reviewer reported findings beyond the gate in 9 of 9 Arm 2 runs (mean 4.7–7.7 per task, 1–2 of them high or medium). Some are real product changes in a dimension the headline doesn't measure:

- **Badge, all three runs:** the filled look on `overlay.subtle` failed WCAG contrast at 3.98–4.48:1; the reviewer added the pair to the contrast check and moved the fill to `overlay.subtlest`. Arms 0 and 1 had picked `overlay.subtlest` on their own, so the shipped products don't differ — but the axe sweep runs in jsdom with `color-contrast` off, so a contrast miss in another arm on a harder task would have gone uncounted. That is a known instrument gap, stated here rather than patched after the fact.
- **Checkbox:** forced-colors handling (in 2 of 3 Arm 2 runs, absent from every Arm 0/1 run *and* from the shipped reference), whole-row hover targets, and test gaps the APG keyboard pattern requires (Space un-toggling, Enter not toggling, disabled skipped in Tab order).
- **CardVertical:** type-level narrowing of props the metadata forbids (`onClick` on the card root), and one run that correctly flagged its own preset as contradicting ADR-023's parts model.

None of that is in the clean rate, by design: extra quality beyond the reference isn't a violation avoided. Whether it is worth $0.63 more per component than Arm 1 is a judgment, and the data to make it is now on the record.

**The visual axis doesn't follow the headline either.** A blind 3-point rating of each cell's median run against the Figma reference (one rater, the developer, arms shuffled to letters, N = 1 per cell) gave Arm 2 no "matches" on any task, gave the only matching Checkbox to Arm 0 — the arm that failed the headline 0/3 — and rated Arm 1's CardVertical "wrong". Traced causes include Arms 1 and 2 sizing the Checkbox box with the `size.300` primitive where the reference uses the semantic `size.icon.sm`. Neither the gates nor the reviewer check visual fidelity against the design; they check conventions. This is a calibration signal for the case-study figure, not a result.

### What the task set taught

Two of three tasks didn't discriminate, for different reasons. Badge is the easiest task by construction. CardVertical was picked as the hard composite and turned out to be a near-copy of a neighbour: all nine runs, Arm 0 included, reproduced the reference's props, icons, progress pattern and size tokens, and Arm 0 got them by reading `CardHorizontal`. That is a property of the task, not an Arm 0 win. The one CardVertical difference the scorer deliberately doesn't count — Arm 2 exposed an ADR-026 `headingLevel` in every run where Arm 0 always hard-coded `h3` — points the same way as the reviewer findings: the harness's extra output is real but sits above the reference, where a violations count can't see it.

The instrument also earned its keep on itself: the pilot and the score reviews caught three scorer false positives (a forbidden `onClick` pattern matching inside `Omit<…>`, a prop-vocabulary entry where the shipped `label` was itself the drift, a label check that missed `<Text as="label">`). Each was fixed before the next task ran, recorded with its reason, and rescored from retained workspaces — no brief or trap changed after a result existed for its task.

### What would change the verdict

- **A task where conventions and keyboard/ARIA behaviour both matter** — the pre-registered `Accordion` stretch task — is the obvious next run; it is the kind of component where the ledger already shows the reviewer earning its cost (4 findings in its own review).
- **Contrast in the headline** (axe in a real browser, or the token contrast check run per workspace) would make the reviewer's Badge catch countable.
- **The model axis:** Arm 0 on Opus vs Arm 2 on a cheaper model tests the other way the loop could pay for itself — making a cheaper model good enough.

Until one of those runs, the defensible claim is narrow: **in this system, written-down context is what turns an agent's output from plausible into shippable; the gate-and-reviewer loop adds quality the headline doesn't measure, at about 1.7× the cost per clean component.** No ADR changes on the strength of 27 runs; the loop stays as built (ADR-007), and the question stays open with the instrument kept in the repo to re-ask it.

## Context budget: a cap that bites

`CLAUDE.md` sits at **19,615 bytes / 197 lines against a CI-enforced cap of 20,000 / 200 — 98% utilized** (measured). The budget isn't a comfortable margin nobody tests; it's full, and the "Where knowledge lives" routing table exists because it's full. Path-scoping keeps **~3,100 tokens** out of sessions that don't need them: `.claude/rules/components.md` (~1,900 tokens) loads only when touching `packages/components/**`, `.claude/rules/tokens.md` (~1,200) only for `packages/tokens/**`. ADR-017's before-state (289 lines / ~35KB) is the ADR's own record, not independently re-derived from git history — consistent with the current measured size representing a ~44% reduction, and labeled here as self-reported.

## Design-system ROI: the honest external base rate

For the broader claim that a maintained system pays for itself, the strongest quantified public evidence is the [Sparkbox/Carbon study](https://sparkbox.com/foundry/design_system_roi_impact_of_design_systems_business_value_carbon_design_system): eight developers built the same form from scratch and with IBM's Carbon — median **4.2 hours vs 2 hours, a 47% reduction**, with better visual consistency. Softer supporting points: IBM's Commerce Platform case study (a token/component refresh correlating with +5% conversion) and Rastelli's git-history analysis of Badoo's Cosmos (style-change volume dropping after system adoption). Two things deliberately **not** cited: no credible source isolates token-*automation* ROI (Style Dictionary specifically) from component-library ROI generally, and the widely circulated "$520K saved / 300–600% ROI" figures trace back to SEO content with no primary source. For constrained UI generation, the evidence is analogical only — code-API-grounding work like De-Hallucinator ([arXiv:2401.01701](https://arxiv.org/pdf/2401.01701)) shows grounding generation in a retrievable set of valid APIs reduces hallucinated calls, but no study isolates "small fixed component set" as the variable for UI reliability.

## What is not measured (and what would close each gap)

Keeping the gaps on the record is the same discipline as keeping the ledger:

1. **No live-vs-frozen baseline was ever captured.** ~~Every "avoided live fetch" multiplier above is estimated.~~ **Resolved 2026-07-23** for the Airtable half: a raw `list_records` pull of both tables (no `fields[]` filter, paginated) measured 60,695 combined bytes against the 977-byte committed `airtable-governance.json` — a 62.1× multiplier, now tagged measured above. The Figma-variables half of this gap remains open (no raw Figma variables read has been captured).
2. **Escaped-defect rate is not tracked.** "No agent code reaches `main` unreviewed" is a verified *process* guarantee, but nothing counts defects found *after* merge. A GitHub issue label (`escaped-defect`) applied per the existing bug-issue-handoff practice would make "0 known to date" a tracked fact instead of silence.
3. **The standard review path (15 of 27 components) has no findings telemetry.** A one-line findings count appended to `component-review-state.json` when the in-session path runs would close this over time — optional, and partially covered from the outcome side by item 2.
4. **Deliberately not built:** token-metering harnesses, a live-vs-frozen A/B agent experiment, scheduled harness reruns. Each would violate the economic-maintenance charter for marginal evidentiary gain; the harness's own policy (re-run only when inputs change) already covers the last.

## Sources for this section

- `packages/tokens/{figma-variables,token-usage,airtable-governance}.json`, `.claude/{component-patterns,component-pipeline,component-review-state}.json`, `.claude/STATUS_QUO.md` (sizes)
- `.claude/commands/*.md`, `.claude/skills/*` (snapshot consumption grep)
- `.github/workflows/*.yml` (all 7, read in full), `scripts/`, `package.json`
- `.claude/handoff/run-ledger.json` (12 entries, recomputed)
- `scripts/pattern-accuracy-harness/results.md`, `docs/decisions/013-cross-component-pattern-schema.md` (+ amendment)
- `scripts/harness-ablation/results.md`, `scripts/harness-ablation/results/visual-rating.json`, per-run `.run.json`/`.review.json` (gitignored `.runs/`), `.claude/handoff/archive/2026-10-07-harness-ablation-eval.handoff.md` (scope, pre-registration, every scorer fix)
- `docs/decisions/017-claude-md-context-budget.md`, `scripts/claude-md-check.js`
- External: Anthropic engineering posts (code-execution-with-mcp; building-effective-agents; writing-tools-for-agents), Anthropic prompt-caching docs, arXiv:2402.01817, arXiv:2310.01798, arXiv:2603.12123, arXiv:2401.01701, Sparkbox Carbon ROI study
