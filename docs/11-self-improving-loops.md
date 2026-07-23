---
sources:
  - .claude/agents/docs-scribe.md
  - scripts/handoff-tidy.js
  - scripts/token-deprecation-mirror.js
  - scripts/pattern-accuracy-harness/run.js
  - scripts/pattern-accuracy-harness/score.js
  - docs/decisions/013-cross-component-pattern-schema.md
  - docs/decisions/015-handoff-artifact-lifecycle.md
  - docs/decisions/017-claude-md-context-budget.md
  - docs/decisions/018-docs-scribe-critic-stage.md
  - docs/decisions/019-screenshot-baseline-visual-regression.md
---
# Self-improving loops

## What it is

Several mechanisms in this system change their own behavior, or their own record of the truth, based on evidence gathered while the system runs — rather than staying fixed the way a plain rule or a plain gate does. This page is the family portrait: it names the four groups these mechanisms fall into, points at the page or decision record ([ADR](08-glossary.md)) that owns each one's full mechanics, and draws the line between a loop that *learns* and a gate that only *checks*.

The four groups:

| Group | What changes, and from what evidence |
|---|---|
| **Learning loops** | A finding from a real review becomes a permanent addition to a contract — component [metadata](10-machine-readable-metadata.md), a token convention, or a curated list — so the next agent inherits it as a checked fact. |
| **Measurement loops** | A committed, append-only record of outcomes accumulates so a costly step (an adversarial reviewer, a docs critic) can be judged on real numbers instead of defended by intuition. |
| **Self-retiring ledgers** | A tracked list of known debt is designed to shrink to empty, and mechanically forbidden from growing back once new work no longer needs it. |
| **Self-stabilizers** | The system polices its own upkeep — its instruction budget, its own diffs, its own documentation's readability — with a script or subagent rather than a person remembering to check. |

## Why it's built this way

None of these loops were designed in one sitting as "a self-improvement system." Each one is the fix for a specific failure this project already lived through, generalized just far enough to be reusable. `CLAUDE.md` grew past its adherence budget before [ADR-017](decisions/017-claude-md-context-budget.md) capped it; `.claude/handoff/` mixed live and dead work before [ADR-015](decisions/015-handoff-artifact-lifecycle.md) gave it a lifecycle; a review finding used to die in a PR comment before `/extract-learnings` gave it a permanent home; a plausible-sounding idea (feed the cross-component pattern file into every generation task) turned out to help one task and hurt another before [ADR-013](decisions/013-cross-component-pattern-schema.md)'s harness measured the split.

The common thread is the project's standing principle, stated plainly in [Context engineering](09-context-engineering.md): **measure, don't assert.** A rule that "more context helps" or "the adversarial stage is worth it" is a belief until something records what actually happened. These four groups are the four different *shapes* that measuring can take: routing a finding into a durable artifact, keeping receipts in a ledger, letting a tracked list empty out, or having the system check its own diffs.

It matters that these are documented as one family rather than four unrelated facts, because the same anti-pattern threatens all of them: a loop that nobody re-reads decays back into a plain rule nobody trusts. Naming them together is itself part of keeping them honest.

## How it works, concretely

### Learning loops

[`/extract-learnings`](06-agentic-moments.md) is the engine: it reads a component's `.review.json` after an adversarial review and routes each finding to the narrowest durable home — ARIA and keyboard findings into the component's [metadata](10-machine-readable-metadata.md) (`accessibility.ariaAttributes`, `accessibility.keyboardInteractions`), consumer misuse into `usage.antiPatterns`, token-convention violations into `/tokens-author`'s Conventions section, contrast misses into the curated `PAIRS` array in `scripts/token-contrast-check.js` (never a silent [waiver](08-glossary.md)). Running `--all` widens the scope one notch further: a pattern repeating across two or more components may be *proposed* as a `CLAUDE.md` addition — never auto-applied, always confirmed by the developer. A `.learnings.json` file marks a run as processed; `scripts/sense.js` reads its absence to populate the pending-learnings backlog in `.claude/STATUS_QUO.md`, so unprocessed findings stay visible rather than quietly forgotten.

The docs-scribe critic ([ADR-018](decisions/018-docs-scribe-critic-stage.md)) is the same shape applied to prose instead of code. It is a read-only subagent (`.claude/agents/docs-scribe.md`) spawned once per real-drift `/docs-sync` run, judging the rewritten sections for three audiences — product manager, product designer, software engineer — against `docs/08-glossary.md` as the term canon. Its finding types are a closed set (`undefined-term`, `undefined-prerequisite`, `glossary-gap`, `buried-lead`, `sentence-density`, `missing-example`, `audience-mismatch`) — it cannot invent a new kind of complaint. A `glossary-gap` finding is a proposal only: a human confirms before the glossary actually grows, the same "propose, don't auto-apply" discipline `--all` uses. The prerequisite-chain rule (recurse one level into a definition's own vocabulary, no deeper) exists because of a real failure: a glossary fix for "Glob pattern" once passed review while quietly leaning on an undefined "wildcard," which itself leaned on an undefined "file path." See [Agentic moments](06-agentic-moments.md) for the full moment-9 procedure.

### Measurement loops

`.claude/handoff/run-ledger.json` is the receipts drawer. It is append-only and committed, promoted from the gitignored per-run `<Name>.run.json` files by `npm run handoff:tidy` (`scripts/handoff-tidy.js`). Its most load-bearing field is **`reviewerFindingsBeyondGateCount`** — the number of findings a `/review-component` adversarial reviewer caught that the deterministic gate (metadata validation, typecheck, build, a11y) could not. That single number across every logged run is the empirical answer to "does the adversarial stage earn its Claude-Pro usage-window cost," a question [ADR-007](decisions/007-verified-component-loop.md) leaves open on purpose rather than settling by argument. [ADR-018](decisions/018-docs-scribe-critic-stage.md) commits the docs-scribe critic to being judged the identical way once it has 2–3 runs behind it.

The pattern-accuracy harness (`scripts/pattern-accuracy-harness/`) is the same instinct run as a formal experiment rather than an ongoing tally: a pre-registered 7-task, 2-arm A/B (with and without `component-patterns.json` in the prompt), scored by `score.js` against the repo's real deterministic gates plus a trap checklist. It found the pattern file *helps* layout/composition tasks (violations roughly halved) and *hurts* scaffold tasks (violations rose) — the honest, mixed result behind [ADR-013](decisions/013-cross-component-pattern-schema.md)'s "layout-generation only" rule. A later amendment fixed a scorer false positive (an `@attr`-position exemption in the trap checker) and rescored all 14 cells from the retained outputs without rerunning the tasks — the instrument correcting itself, and the correction is documented as a dated ADR amendment rather than a silent edit. The harness stays in the repo, unused day-to-day, as the standing tool for re-running this same question if the inputs ever change.

### Self-retiring ledgers

Two tracked-debt lists are built to shrink to nothing and stay there. `scripts/a11y-backlog.json` waived pre-existing interactive components that lacked a behavioral accessibility test; the backlog is now `[]`, and — enforced by [ADR-008](decisions/008-behavioral-a11y-tier.md), see [Accessibility](03-accessibility.md) — a new interactive component is not allowed to be added to it, only required to ship its test. `scripts/token-contrast-waivers.json` works the same way for known contrast failures: each entry carries a reason and a GitHub issue, and any *new* contrast miss is routed through `/extract-learnings` into the curated `PAIRS` list, never quietly waived. Both lists are evidence the system holds itself to "waivers shrink, they don't grow" as a mechanical rule, not a promise.

### Self-stabilizers

These keep the system's own instruction surface and documentation lean without a person remembering to police it. `npm run claudemd:check` fails CI when `CLAUDE.md` exceeds 200 lines / 20KB, or when a `.claude/rules/*.md` file is missing its `paths:` frontmatter (an unscoped rule silently loads into every session and defeats the whole routing scheme) — [ADR-017](decisions/017-claude-md-context-budget.md). `scripts/sense.js`'s `writeIfChanged` helper blanks wall-clock-only fields before writing, so re-running `npm run sense` with no real change produces zero diff instead of manufacturing one every day.

The **clock-reset convention** is this same idea applied to the docs site itself, and it is used in every page's frontmatter without ever being explained until now. Each `docs/NN-*.md` page declares its load-bearing `sources:` in frontmatter; `npm run docs:check` fails when any listed source has a commit newer than the page, flagging it stale. Sometimes a source changed but the page's prose is still fully accurate — nothing in it needs rewriting. Rather than force a cosmetic rewrite just to touch the file, the convention is to append a one-line `#` comment inside the frontmatter block: `# clock reset YYYY-MM-DD: <what changed> <why the page is unaffected>`. That comment's own commit becomes the doc's "last touched" timestamp, resetting `docs:check`'s staleness clock honestly — the page was reviewed against the change and found accurate, which is different from a rewrite (where the prose itself changes) and different from ignoring the failure (where nobody looked). You can see the convention used repeatedly at the top of this page's sibling pages, for example [09 — Context engineering](09-context-engineering.md)'s frontmatter.

Screenshot baselines ([ADR-019](decisions/019-screenshot-baseline-visual-regression.md)) close the loop with **trust promoted on evidence**: re-baselining a component's canonical screenshot is human-approved, the CI perceptual-diff step runs advisory (`continue-on-error`) rather than blocking because cross-OS antialiasing makes local and CI ratios differ, and the documented escalation path — CI-generated baselines first, then blocking once diff ratios are quiet — only tightens the gate once the evidence says it is safe to.

## Pure gates, for contrast

Not everything that runs automatically is a learning loop. `npm run metadata:validate`, `npm run layout:validate`, and the `docs:check` staleness *detection* itself are pure gates: they check a fixed rule against the current state and pass or fail, but they never route a finding anywhere, never accumulate evidence, and never change what they check for next time. They are backstops the loops above depend on, not instances of the pattern this page describes.

## Summary table

| Mechanism | Feedback signal | Durable home it updates | ADR |
|---|---|---|---|
| `/extract-learnings` | Adversarial-review findings (`.review.json`) | Component metadata, `/tokens-author` conventions, contrast `PAIRS` | [007](decisions/007-verified-component-loop.md) |
| Docs-scribe critic | First-read comprehension findings on rewritten doc sections | Rewritten prose, proposed glossary entries | [018](decisions/018-docs-scribe-critic-stage.md) |
| `run-ledger.json` | Per-run gate + reviewer telemetry (`reviewerFindingsBeyondGateCount`) | Append-only ledger, judges the adversarial stage's ROI | [015](decisions/015-handoff-artifact-lifecycle.md), [018](decisions/018-docs-scribe-critic-stage.md) |
| Pattern-accuracy harness | Pre-registered 7-task × 2-arm A/B scored against real gates | `component-patterns.json`'s consumption rule (`/layout-generation` only) | [013](decisions/013-cross-component-pattern-schema.md) |
| `a11y-backlog.json` | Behavioral test coverage per component | Shrinking waiver list, now `[]` | [008](decisions/008-behavioral-a11y-tier.md) |
| `token-contrast-waivers.json` | Known contrast failures with a tracked issue | Shrinking waiver list; new misses go to `PAIRS` instead | [008](decisions/008-behavioral-a11y-tier.md) |
| `claudemd:check` | Line/byte count of `CLAUDE.md`; `paths:` presence on rules | Enforced budget on the always-loaded instruction file | [017](decisions/017-claude-md-context-budget.md) |
| Clock-reset convention | A source changed but the page's prose didn't | Frontmatter comment resetting `docs:check`'s staleness clock | — (convention, no dedicated ADR) |
| Screenshot baselines | Perceptual diff ratio, advisory in CI | Committed PNG baselines; escalation path to blocking | [019](decisions/019-screenshot-baseline-visual-regression.md) |

## Related

- Docs: [Agentic moments](06-agentic-moments.md), [Machine-readable metadata](10-machine-readable-metadata.md), [Context engineering](09-context-engineering.md), [Accessibility](03-accessibility.md), [Governance](05-governance.md), [Glossary](08-glossary.md)
- ADRs: [007 — Verified component loop](decisions/007-verified-component-loop.md), [013 — Cross-component pattern schema](decisions/013-cross-component-pattern-schema.md) (+ amendment), [015 — Handoff artifact lifecycle](decisions/015-handoff-artifact-lifecycle.md) (+ amendment), [017 — CLAUDE.md context budget](decisions/017-claude-md-context-budget.md), [018 — Docs-scribe critic stage](decisions/018-docs-scribe-critic-stage.md) (+ amendment), [019 — Screenshot baseline visual regression](decisions/019-screenshot-baseline-visual-regression.md)
- Scripts: `npm run handoff:tidy`, `npm run patterns:generate`, `npm run docs:check`, `npm run claudemd:check`, `npm run screenshot:check` / `npm run screenshot:approve` — see the [CLI reference](07-cli-reference.md)
- Case study: [The metadata contract](case-study-source/06-machine-readable-contract.md), [Rejected alternatives](case-study-source/05-rejected-alternatives.md), [Self-improving loops](case-study-source/07-self-improving-loops.md)
