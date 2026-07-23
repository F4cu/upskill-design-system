# The numbers, and where each one comes from

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar. This file is the single home for the system's quantitative claims; the other source files cite it rather than repeating numbers that would drift.*

## Methodology, stated once

Every number below carries one of four tags. **Measured** means read directly off a committed artifact in this repo (a file size, a ledger entry, a workflow YAML). **Estimated** means derived from a measured number via a stated assumption. **External** means a published source outside this repo, cited with enough detail to chase down. **Gap** means the architecture claims it and no data substantiates it — those are listed too, deliberately, at the end. Token figures use the rough heuristic of bytes ÷ 4; JSON runs slightly denser in practice, so treat token counts as conservative comparisons, not billing math.

## Frozen snapshots: the context economics

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

The starkest single ratio is the Airtable snapshot: 977 bytes of filtered four-field governance state standing in for a full-table REST pull of every record with every column. The raw-payload multiplier is plausibly 5–15× (estimated — no raw pull has been captured for comparison; see gaps). The Figma file is itself one captured MCP read reused by two commands — each reuse avoids a fresh ~9,600-token MCP response (measured size, estimated avoidance).

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
- The adversarial reviewer found issues **beyond** what the gate could catch in **7 of 12 runs (58%)** — 18 findings total, **1.5 per run on average** (2.6 among the runs that had any).
- **0 manual rescues** across all 12 runs — the loop never needed human intervention beyond its built-in fix step.

The per-component split is more informative than the average. The reviewer earned its cost on interactive and composite components — Accordion (4 findings), ButtonArrow (3), DropdownMenu (3), TextField (3), Chip (2), TextLink (2), Text (1) — and found **nothing** on the layout primitives: Box, Stack, Inline, Heading, Checkbox all logged zero findings beyond the gate. That pattern suggests a routing heuristic the ledger itself surfaced: the full adversarial path for interactive components, the cheaper standard path for primitives. Whether to adopt it is a judgment call; that the data exists to make it is the point of keeping the ledger.

Scope caveat, stated plainly: the ledger covers the full-review path only — **12 of 27 shipped components (44%)**. The other 15 went through the standard in-session path, which records no findings telemetry. The stability claim is measured for the components where it matters most and unmeasured for the rest.

## The pattern-schema harness: measured, corrected, kept

The one controlled experiment in the repo (`scripts/pattern-accuracy-harness/`, 7 pre-registered tasks × 2 arms, deterministic scoring, corrected rescore per ADR-013's amendment):

| Task kind | Metadata only | + pattern file | Delta |
|---|---:|---:|---|
| Composition + layout (4 tasks) | 13 | 4 | **−69%** |
| Component scaffold (3 tasks) | 19 | 24 | **+26% (regression)** |
| Total | 32 | 28 | −13% |

(The gate-violations-only subset for scaffold is 11→17; the totals above include the trap checklist.) The split drove the scoped decision — pattern file into `/layout-generation` only, never `/component-scaffold` — and the harness stayed in-repo as the standing instrument. Full narrative: [Rejected alternatives §4](05-rejected-alternatives.md).

External anchors for the gate-plus-generator architecture generally: the LLM-Modulo position paper (Kambhampati et al., ICML 2024, [arXiv:2402.01817](https://arxiv.org/abs/2402.01817)) — LLMs generate candidates, external sound critics verify, because the models cannot reliably self-verify; Huang et al. (ICLR 2024, [arXiv:2310.01798](https://arxiv.org/abs/2310.01798)) — intrinsic self-correction without external feedback often *degrades* output, which is why the gate is a script and not a "please double-check" prompt. For the fresh-context reviewer specifically, a 2026 controlled study ([arXiv:2603.12123](https://arxiv.org/abs/2603.12123)) found fresh-session review outperformed same-session self-review (F1 28.6% vs 24.6%) on 150 injected errors — a single-author preprint, not yet peer-reviewed, so it's suggestive corroboration paired with the peer-reviewed self-correction result, not settled proof.

## Context budget: a cap that bites

`CLAUDE.md` sits at **19,615 bytes / 197 lines against a CI-enforced cap of 20,000 / 200 — 98% utilized** (measured). The budget isn't a comfortable margin nobody tests; it's full, and the "Where knowledge lives" routing table exists because it's full. Path-scoping keeps **~3,100 tokens** out of sessions that don't need them: `.claude/rules/components.md` (~1,900 tokens) loads only when touching `packages/components/**`, `.claude/rules/tokens.md` (~1,200) only for `packages/tokens/**`. ADR-017's before-state (289 lines / ~35KB) is the ADR's own record, not independently re-derived from git history — consistent with the current measured size representing a ~44% reduction, and labeled here as self-reported.

## Design-system ROI: the honest external base rate

For the broader claim that a maintained system pays for itself, the strongest quantified public evidence is the [Sparkbox/Carbon study](https://sparkbox.com/foundry/design_system_roi_impact_of_design_systems_business_value_carbon_design_system): eight developers built the same form from scratch and with IBM's Carbon — median **4.2 hours vs 2 hours, a 47% reduction**, with better visual consistency. Softer supporting points: IBM's Commerce Platform case study (a token/component refresh correlating with +5% conversion) and Rastelli's git-history analysis of Badoo's Cosmos (style-change volume dropping after system adoption). Two things deliberately **not** cited: no credible source isolates token-*automation* ROI (Style Dictionary specifically) from component-library ROI generally, and the widely circulated "$520K saved / 300–600% ROI" figures trace back to SEO content with no primary source. For constrained UI generation, the evidence is analogical only — code-API-grounding work like De-Hallucinator ([arXiv:2401.01701](https://arxiv.org/pdf/2401.01701)) shows grounding generation in a retrievable set of valid APIs reduces hallucinated calls, but no study isolates "small fixed component set" as the variable for UI reliability.

## What is not measured (and what would close each gap)

Keeping the gaps on the record is the same discipline as keeping the ledger:

1. **No live-vs-frozen baseline was ever captured.** Every "avoided live fetch" multiplier above is estimated. The cheapest fix — a one-time raw Airtable `list_records` pull and one raw Figma variables read, byte counts recorded next to the snapshot sizes — would convert the 5–15× estimate into a measured ratio in about thirty minutes, with no new scripts or infrastructure.
2. **Escaped-defect rate is not tracked.** "No agent code reaches `main` unreviewed" is a verified *process* guarantee, but nothing counts defects found *after* merge. A GitHub issue label (`escaped-defect`) applied per the existing bug-issue-handoff practice would make "0 known to date" a tracked fact instead of silence.
3. **The standard review path (15 of 27 components) has no findings telemetry.** A one-line findings count appended to `component-review-state.json` when the in-session path runs would close this over time — optional, and partially covered from the outcome side by item 2.
4. **Deliberately not built:** token-metering harnesses, a live-vs-frozen A/B agent experiment, scheduled harness reruns. Each would violate the economic-maintenance charter for marginal evidentiary gain; the harness's own policy (re-run only when inputs change) already covers the last.

## Sources for this section

- `packages/tokens/{figma-variables,token-usage,airtable-governance}.json`, `.claude/{component-patterns,component-pipeline,component-review-state}.json`, `.claude/STATUS_QUO.md` (sizes)
- `.claude/commands/*.md`, `.claude/skills/*` (snapshot consumption grep)
- `.github/workflows/*.yml` (all 7, read in full), `scripts/`, `package.json`
- `.claude/handoff/run-ledger.json` (12 entries, recomputed)
- `scripts/pattern-accuracy-harness/results.md`, `docs/decisions/013-cross-component-pattern-schema.md` (+ amendment)
- `docs/decisions/017-claude-md-context-budget.md`, `scripts/claude-md-check.js`
- External: Anthropic engineering posts (code-execution-with-mcp; building-effective-agents; writing-tools-for-agents), Anthropic prompt-caching docs, arXiv:2402.01817, arXiv:2310.01798, arXiv:2603.12123, arXiv:2401.01701, Sparkbox Carbon ROI study
