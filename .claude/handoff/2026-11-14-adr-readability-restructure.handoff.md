---
status: active
created: 2026-11-14
completed:
---

# ADR readability restructure: current decision first, Ruled out and Change history last

Proposal to restructure `docs/decisions/` so each ADR reads as the current decision, with what was rejected or reversed collected at the end. ADR-026 is converted as the pilot (uncommitted on branch `extract-learnings/dialog` at the time of writing; commit it with the rollout or on its own). **Next step: the developer reviews the ADR-026 pilot and approves or edits the layout before the rollout.**

## Audit findings (2026-11-14)

- 21 of 31 ADRs carry `## Amendment` sections, about 95 in total. Heaviest: 026 (12), 027 (11), 001 and 030 (8), 029 (7), 002 and 023 (6), 025 (5). Also amended: 006, 008, 010, 013, 017 (2 each); 007 (3); 012, 015, 018, 021, 022, 024, 028 (1 each). No amendments: 003, 004, 005, 009, 011, 014, 016, 019, 020, 031.
- **The current rule is spread across the body plus every amendment, and the body goes stale.** ADR-026's body still said "No new gate yet" and listed `variant` ↔ `Style` as a mapping after later amendments reversed both. An agent that reads only the top can act on a dead rule.
- **No summary.** Status is one word, and the decision only starts after a long Context section.
- **Rejected options are buried in Context** as numbered paragraphs.
- **Execution logs are mixed in with decisions** (Figma node ids, instance counts, migration tables): about half of ADR-026.

## Best-practice research (sources)

- Status and date visible at the top; link both directions when one decision replaces another; keep a change history ([AWS prescriptive guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/best-practices.html), [AWS blog](https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/), [TechTarget](https://techtarget.com/searchapparchitecture/tip/4-best-practices-for-creating-architecture-decision-records)).
- Rejected options get their own section: MADR's "Considered Options" ([MADR](https://adr.github.io/madr), [Zimmermann's MADR primer](https://ozimmer.ch/practices/2022/11/22/MADRTemplatePrimer.html)).
- State the trade-offs honestly; a record that lists only benefits is marketing ([ADR anti-patterns](https://jopr.org/blog/detail/10-adr-antipatterns)).
- **Divergence to keep in mind:** most sources say accepted ADRs are immutable and a change gets a new superseding ADR. This project deliberately amends in place (ADR-001). The proposal keeps living ADRs but makes the top always current; the verbatim amendment text moves to git history (`git log -p -- <file>`).

## Proposed layout (as piloted in ADR-026)

1. **Header:** `**Status:** … · **Date:** … · **Last amended:** …` on one line, then a 2–3 sentence `> **In short.**` blockquote.
2. **Decision:** current rules only, every amendment folded in. Subsections as the content needs (ADR-026 gained "Enforcement").
3. **Context** and **Consequences**, rewritten to describe the current state (past-tense where they describe the original problem).
4. **Ruled out:** a table `Ruled out | When | Why`. Holds the original rejected options and every rule a later amendment reversed, so nothing gets proposed twice.
5. **Change history:** one dated line per amendment, newest first, plus a pointer to `git log -p`. Closed migration tables and execution logs (node ids, instance counts) go in collapsed `<details>` blocks so nothing is lost.

Why two end sections, not one "Ruled out": not every amendment rules something out (e.g. ADR-026 Tier 4 only closed open work). Mixing them would blur reversed decisions with ordinary progress.

Pilot result: ADR-026 went from 309 to 262 lines; `npm run docs:check` and `npm run spec:validate` pass.

## Rollout steps (after approval)

1. **Convention change** (record it as part of the change, per CLAUDE.md "Architectural decisions"):
   - `docs/decisions/000-template.md`: add the summary blockquote, `## Ruled out`, `## Change history`.
   - ADR-001: amend its amendment convention (it is the "see ADR-001" reference).
   - `CLAUDE.md` "How:" line: refinement → edit the Decision in place, bump `Last amended`, add a Ruled out row if something is reversed, add one Change history line. Run `npm run claudemd:check` (budget, ADR-017).
2. **Convert the 20 remaining amended ADRs**, heaviest first (027, 001, 030, 029, 002, 023, 025, …). Move content, never delete it: anything that isn't current goes to Ruled out, Change history or a `<details>` block.
3. **Unamended ADRs (10):** only the header line, summary, and a Ruled out table lifted from Context's options. Optional; lower value.
4. **Gates:** `npm run docs:check`, `npm run spec:validate` (reads ADR ids from filenames only, so renaming is not allowed), and a docs-site build if available.

## Checked dependencies

- `scripts/harness-ablation/tasks/{accordion,badge,cardvertical,checkbox}.json` redact ADR text by exact `find` strings (ADRs 001, 013, 021, 023, 024, 025, 026). Safe: the eval is frozen (`scripts/frozen-eval.js`, `FROZEN_AT = 044d28f`) and re-runs from a worktree at that commit, so it never reads the restructured files.
- `scripts/validate-spec.js` only checks that `ADR-NNN` files exist. Keep filenames unchanged.
- `scripts/docs-check.js` lists ADR-007 as a declared source in a comment; check whether touching ADR-007 needs a same-PR doc touch (docs-check coupling).
- `scripts/prop-vocabulary-waivers.json` reasons cite ADR-026; the AppHeader waiver says "Not yet recorded in ADR-026", which is still true after the pilot (it is listed as open drift).
