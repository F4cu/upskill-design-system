---
status: done
created: 2026-07-08
completed: 2026-07-08
---

# Agentic moments audit — recommended plan of action (2026-07-08)

Full audit of the eight agentic moments (plus `/tokens-author`, `/airtable-sync`) against
online best practices (Anthropic multi-agent writeup, Storybook AI guidance, model-routing
and MCP rate-limit literature — research notes summarized below). Overall verdict: the
architecture is sound and matches where the field independently landed; the actionable work
is five bounded items, none of which touch the ≤2-agent / sequential / frozen-handoff rules.

## What the audit confirmed — do NOT change

- **One adversarial reviewer, never more.** Anthropic's multi-agent writeup: multi-agent burns
  ~15× tokens and is a poor fit for coding tasks with shared context; the one case where a second
  agent earns its cost is an independent context window — exactly `/review-component`'s design.
  Adversarial-review literature adds that reviewer *consensus* is not a correctness signal
  (correlated errors), so more reviewers wouldn't buy safety even if the window allowed it.
- **MCP-interactive-only is infrastructure-validated**, not house style: MCP rate limits are sized
  for human pacing; bulk/automated use saturates them in seconds.
- **The deterministic/agent split for docs is already right**: Storybook's own AI guidance says
  static analysis (Autodocs + react-docgen) owns prop tables; agents only add the judgment layer
  (when/why to use a component). Autodocs is already on globally (`preview.ts` `tags: ['autodocs']`).
- **Shrinking-ledger waivers** (a11y backlog — now empty, contrast waivers) are a
  literature-consistent answer to knowledge-bloat: scope bounded by construction. Preserve the
  pattern; reuse it for any future waiver list.

## Findings → plan of action (priority order)

### 1. Add `model:` and `allowed-tools:` frontmatter to all 10 commands (quick win, one session)

Every command file's frontmatter is `description`-only today. Two consequences: every moment runs
on the session default model, and every moment inherits every tool — e.g. `/token-deprecation-pass`'s
invariant says "no MCP" but nothing enforces it; the Airtable MCP is reachable.

- Tier models to task difficulty (routing literature: 30–50% window savings from per-command
  tiering): `haiku`/`sonnet` for mechanical moments — `/token-deprecation-pass`, `/airtable-sync`,
  `/tokens-author` — default (big) model for `/component-scaffold`, `/layout-generation`,
  `/add-component`, `/review-component`, `/extract-learnings`.
- `allowed-tools`: Figma MCP tools only in the two figma commands + scaffold/layout; no MCP
  anywhere else. This turns the CLAUDE.md MCP table from prose into enforcement.
- The `/review-component` subagent should be spawned read-only (Read/Grep/Glob/Bash-for-lint,
  no Edit/Write) — the prompt already says "reviewer reports only"; make the tool set say it too.

### 2. Close the self-documenting gap: deterministic drift check + one new moment `/docs-sync` (moment 9)

The gap is real but narrower than "keep Storybook docs up to date":
- **Props tables are already solved deterministically** — Storybook Autodocs. Do not build an
  agent for them (research: no team does; agent-generated props docs need human review anyway).
- **The unguarded surface is `docs/00–08*.md`**: nothing in CI touches `docs/`. (Case-study HTML
  files are out of scope — portfolio reference material for a different repo, not system docs.)
- Split per the charter: **detection is a script, rewriting is a moment.**
  - `scripts/docs-check.js` (+ CI wire-in): each `docs/*.md` declares its source files in
    frontmatter (e.g. `sources: [.claude/commands/*.md, ADR-007]`); the script fails when a
    source changed more recently than the doc (git log comparison). Same shape as the
    `component-patterns.json` staleness gate — regenerate-and-diff where possible, mtime-diff
    where judgment is needed.
  - `/docs-sync` (new moment): developer-triggered when the check flags drift; reads the flagged
    doc + its changed sources, rewrites only the stale sections, PRs. Invariant: never touches
    prop tables or anything Autodocs/docgen owns; never runs in CI.
- **Story coverage** goes into `/review-component`'s existing reviewer checklist (one added item:
  "does the story/argTypes cover every public prop and variant axis in the metadata?") rather
  than a separate moment — a reviewer is already looking at the component.

### 3. Widen `/extract-learnings` routing — it's a11y/composition-only today, and a second, undisciplined learning loop has formed

The routing table routes findings only into component metadata. Two kinds of design-system-operations
learnings currently have no target:
- **Layout/composition learnings** — evidence: `/layout-generation`'s "Recurring patterns" section
  (AppHeader prop-mapping table, carousel pattern, logo paths, Google Fonts check) is hand-accreted
  learning *inside the command file*, with no dedup/consolidation discipline. The file is 254 lines
  and mixing durable grammar with app-specific trivia — exactly the context-rot failure mode the
  literature documents.
- **Token learnings** — a wrong token pick or a contrast-pair miss found in review routes nowhere
  (the contrast-pair list in `token-contrast-check.js` is maintained by hand per CLAUDE.md).

Plan:
- Add routing targets: layout findings → the composed component's `usage.patterns` /
  `usage.antiPatterns` (metadata first, command file only for genuinely cross-component grammar);
  token findings → the curated contrast-pair list or `/tokens-author` conventions.
- Add a consolidation step to `--all` mode: flag when `/layout-generation`'s pattern section
  entries duplicate what metadata/`component-patterns.json` now capture, and propose pruning —
  same confirm-before-write rule as the CLAUDE.md escalation.
- Do **not** widen into non-DS scope (process/tooling mistakes) — keep the loop about component,
  layout, and token contracts.

### 4. Close the layout review inconsistency (needs a small ADR)

"No agent code reaches `main` unreviewed" is enforced for components (gate + adversarial review +
PR) but **not** for `/layout-generation` output, which is agent code landing in `apps/showcase`
with only `layout:validate` + typecheck. Decision to record:
- Default: generated layouts go through a PR with in-session `/code-review` (cheap, no subagent).
- Full route pages optionally get the fresh-context adversarial reviewer (reuse the
  `/review-component` subagent shape) — the generator rationalizing its own Figma mapping is the
  same failure mode the component reviewer exists for. Given Pro-window scarcity, keep it opt-in.

### 5. Make the reviewer's ROI measurable — persist run telemetry

`.run.json`'s `reviewerCaughtBeyondGate[]` exists precisely to answer "is the adversarial stage
earning its cost," but `.claude/handoff/runs/` is gitignored and currently empty — the evidence
evaporates. Add a tiny committed aggregate (e.g. `handoff:tidy` appends per-run one-liners to a
ledger: date, component, gate failures, findings-beyond-gate count). A few runs of data settles
the question empirically instead of by argument.

## Explicitly rejected

- More/parallel reviewer subagents anywhere (15× token cost + correlated-error evidence).
- An agent for Storybook props tables or MDX prop extraction (docgen owns it).
- Any scheduled/continuous docs-sync loop — detection is CI, rewriting stays developer-triggered.
- Restructuring the eight-moment index — no researched source suggests a better orchestration
  model for a solo maintainer.

## Suggested sequencing

| Step | Effort | Depends on |
|---|---|---|
| 1. Frontmatter (model + allowed-tools) pass over 10 commands — **done 2026-07-08** (incl. read-only `adversarial-reviewer` agent in `.claude/agents/`; main session now writes `.review.json`) | ~1 session | — |
| 2. `docs-check.js` + frontmatter `sources:` in docs/*.md + CI — **done 2026-07-08** (`npm run docs:check`, `docs-check.yml` on every PR with `fetch-depth: 0`, docsify front-matter plugin added so the YAML doesn't render) | ~1 session | — |
| 3. `/docs-sync` moment (moment 9) + CLAUDE.md index row — **done 2026-07-08** (command committed to main `32b9c7a`; inaugural run over docs 00–06 + 08 delivered as PR #36 — real drift found in 00, 01, 03, 04, 06, 08; 02 and 05 clock-only) | ~1 session | step 2 |

Step 2 caveat for step 3 — resolved (2026-07-08, PR #36 merged): the check's *first* real run
(2026-07-08, pre-commit) flagged 8 of 9 docs as stale — only `07-npm-scripts-reference.md` was
current. Committing the frontmatter reset every doc's clock, so that signal was absorbed by the
commit. The inaugural `/docs-sync` run treated `00–06` and `08` as its work queue and landed via
PR #36 (`ab483ca`, merged `1656143`): real prose drift fixed in `00-start-here` (Vercel →
GitHub Pages; eight → nine moments; eleven → fifteen ADRs; `Pipeline.tsx` link), `01-token-pipeline`
(red hue / ADR-014), `03-accessibility` (brand-aware Tier-3 contrast check, current waiver
example), `04-layout-grammar` (`component-patterns.json` input, ADR-013), `06-agentic-moments`
(nine moments, docs-check gate, `model:`/`allowed-tools:` frontmatter, read-only reviewer agent),
`08-glossary` (nine moments, deterministic gate, `runs/` snapshot path). `02-component-lifecycle`
and `05-governance` were clock-only (no real drift found). No further action needed here.
| 4. `/extract-learnings` routing table extension + consolidation step — **done 2026-07-08** (three routing rows added: layout/composition → composed component's `usage.patterns`/`antiPatterns`, token conventions → `/tokens-author` "Conventions", contrast misses → `PAIRS` in `token-contrast-check.js` — never waivers; new `--all` consolidation step proposes prune/move/keep for `/layout-generation`'s pattern section, confirm-before-write; explicit scope guard against process/tooling learnings; CLAUDE.md moment-8 row updated) | ~1 session | — |
| 5. ADR: layout output review path; amend `/layout-generation` final step — **done 2026-07-08** (ADR-016 recorded: default path is feature-branch PR + in-session `/code-review`, no subagent; opt-in adversarial-reviewer pass for full route pages reuses `/review-component`'s read-only agent shape, no `.review.json`/`.run.json` since it's a one-off not a tracked loop stage; `/layout-generation`'s final step and success signal updated; CLAUDE.md git workflow exception list updated) | small | — |
| 6. Run-telemetry ledger in `handoff:tidy` — **done 2026-07-08** (`scripts/handoff-tidy.js` now promotes every `<Name>.run.json` record under gitignored `runs/` into a committed, deduped `.claude/handoff/run-ledger.json` — component, ranAt, gate pass/fail, `reviewerCaughtBeyondGate` count, `manualRescues` count; verified with a synthetic run record, dedupe confirmed on re-run; CLAUDE.md's handoff-artifacts section documents it) | small | — |

Research notes (with sources/URLs) from the Sonnet research pass are not committed; the
load-bearing citations are inlined above. Key ones: Anthropic "How we built our multi-agent
research system"; Storybook "AI best practices" doc; arXiv 2604.19049 (reviewer consensus ≠
correctness); Augment Code / duet.so model-routing guides; MintMCP rate-limiting writeup.
