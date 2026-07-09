# Division of labor: scripts, agents, and the two subagents

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar.*

## The question a skeptical reader asks first

Open `.claude/agents/` in this repo and you'll find exactly two files: `adversarial-reviewer.md` and `docs-scribe.md`. To someone who's seen "agentic" design systems built as a mesh of specialist bots — a token agent, a Figma agent, a docs agent, a QA agent, all wired together and running on a schedule — two agents looks like a system that gave up early, or never got ambitious.

It's the opposite. The two-agent count is the *conclusion* of a cost analysis, not a starting constraint. This system runs on Claude Pro, where the scarce resource is a rolling weekly usage window, not a per-token budget. That single fact inverts almost every instinct that a multi-agent, API-billed architecture would optimize for — and once you take it seriously, the right design has few agents, not many.

## What was actually proposed, and why it was rejected

Early in the project (documented in ADR-007), a blueprint called "In-Demand, API-Driven Agentic Loop Architecture" was evaluated for the component-generation loop. It specified:

- A hub-and-spoke router spawning 2–3 **parallel** worker agents per task.
- An asymmetric **Sonnet-router / Haiku-worker** split, billed per token — the router decides, cheap workers execute.
- Figma variables **pulled live over the Variables REST API** into a frozen status file.
- An adversarial verifier gating the output before merge.

Three of these four ideas carried a hidden assumption: that agent time is billed in fractions of a cent and parallelism is close to free. On the API, that's true. On Claude Pro, it's false in a way that actively hurts you — three workers running at once don't cost three times the money, they drain the *same* shared weekly window three times as fast, and the system hits a rate limit sooner, not later. Parallelism here isn't a discount, it's a multiplier on the one resource that's actually scarce.

The Figma REST pull failed for an unrelated reason: the Variables API is Enterprise/Org-only, and this is not an Enterprise plan. So even wanting to poll Figma live doesn't work — it has to be interactive, through the plugin, with a human present.

The per-token Haiku-worker tiering assumed API credits that simply don't exist on a Pro seat. It's not that cost-tiering is a bad idea — it's that this system doesn't have the underlying billing model the idea depends on. Fed into a Pro/Claude Code context, it's advice for a different product.

What survived, because it was plan-independent: **frozen state-file handoffs** (never stream live data between stages), **one adversarial verification stage**, and **on-demand, developer-triggered execution** instead of anything continuous. Those three ideas were kept. Everything that assumed cheap parallelism or metered tokens was cut.

## The actual split: what a script does, what an agent does, what a subagent does

The system draws the line in three tiers, and each tier earns its place by a different argument.

**Scripts do anything deterministic, recurring, or checkable by a rule.** Style Dictionary token builds, metadata validation, typecheck, build, the accessibility test suite, pulling Airtable governance fields, scanning the repo for token usage, computing component-pattern schemas — none of this touches a model. It's `npm run x`, wired into GitHub Actions, calling REST APIs directly. A script doesn't hallucinate, doesn't need review, doesn't drain a usage window, and runs the same way at 2am in CI as it does on a laptop. If a task can be fully specified as "check condition, take deterministic action," putting an agent on it is pure waste — slower, non-reproducible, and it burns the one resource (the usage window) that actually has a cap.

**Agents do the nine moments that need judgment a script can't encode.** Reading Figma design context and translating it into a component scaffold. Deciding whether a layout's structural choices actually match component metadata relationships. Reviewing a component's accessibility contract for gaps a linter wouldn't catch. Rewriting a stale doc section so it still reads well to three different audiences. Each of these requires interpreting unstructured input (a design file, a diff, a paragraph of prose) against a body of rules — that's exactly the gap between "checkable by a rule" and "needs judgment," and it's the only gap this system spends agent time on. All nine are developer-triggered; none are scheduled, none watch anything continuously. Ending a session ends the loop.

**Subagents — plural in name only; there are two, and they're both reviewers, not workers.** `adversarial-reviewer.md` and `docs-scribe.md` are the entire roster, and both share a deliberate constraint: their tool access is Read/Grep/Glob(/Bash for the reviewer) — no `Edit`, no `Write`. They cannot change a single file. That's not a prompt instruction that a careless run might ignore; it's enforced by what tools the agent definition even exposes. A subagent's only output is a structured finding; the *main session* decides what to do with it, applies fixes, and owns the actual write. "Reviewer reports, never fixes" is a property of the tool boundary, not a norm anyone has to remember to follow.

And there are exactly two of them because a spawned subagent is doing one specific job neither a script nor the main session can do as well: bringing a **fresh, independent context** to a review. The main session, mid-loop, has been steering the scaffold — it has motivated reasoning about its own work. A subagent that starts cold, reads only the diff and a frozen snapshot, and reviews adversarially doesn't share that bias. That's the entire justification for spending a second agent's worth of usage-window budget. It's why the loop is capped at "sequential, at most two agents" (ADR-007) rather than "as many specialists as there are concerns" — a third agent would need its own version of that same justification, and nothing in the current moments needs a third fresh, independent perspective.

## Where "delegation to cheaper models" actually shows up — and where it doesn't yet

It would be easy to claim this system routes mechanical work to a cheap model and judgment work to a capable one, mirroring the rejected blueprint's Sonnet-router/Haiku-worker split minus the parallelism. The honest state, checked against the actual command files rather than assumed: **most of the nine moments don't pin a model at all** — they inherit whatever model is driving the session. Two command files do declare a model explicitly: `airtable-sync` (not one of the nine moments — a utility wrapper around the sync scripts) runs on `haiku`, and `token-deprecation-pass` (moment 2) and `tokens-author` (also a utility, not one of the nine) declare `sonnet`.

So the pattern that exists today is narrower than "every moment is tiered": a handful of command files use `model:` frontmatter to pin a cheaper tier for work that's mechanical even though it's dressed up as a command (`airtable-sync` is really just two script calls with a description on top), while the moments that involve real judgment — scaffold, layout generation, review, docs rewriting — run on the session's default model rather than an explicitly cheaper one. That's a real, if partial, instance of matching model cost to task difficulty; it's not yet the fully generalized router the rejected blueprint proposed, and the honest version of this story says so rather than rounding up.

## The benefit, stated plainly

None of this is defensive crouching around a resource limit. The constraint produced a specific, checkable set of properties:

- **Predictable spend.** A loop touches the shared usage window sequentially, never in a fan-out, so a run is boundable and interruptible per stage rather than an unpredictable spike.
- **Fewer places to be wrong.** Every deterministic step — validation, build, a11y coverage — is a script, which means it's not a place an agent can hallucinate a plausible-looking pass. The gate either passes or it doesn't.
- **A review that's actually independent**, not just a second pass by the same context that wrote the code — because the reviewer is a fresh subagent by construction, not a role the main session plays after the fact.
- **No agent-written code reaches `main` unreviewed** — enforced by a PR branch requirement plus the tool-boundary-restricted reviewer, not by a policy someone has to remember.
- **Fewer calls into external systems that are rate-limited, plan-gated, or just slow** — Airtable and Figma state are read from committed frozen snapshots almost everywhere; live calls happen only at the one interactive moment (Figma) where the plan makes them unavoidable.

The one-line version, for the reader who still thinks two agents is a modest system: two agents is what's left after every task that a script could do was given to a script, and every remaining task was checked against "does this genuinely need a fresh, independent read" before it was allowed to spend a second agent's worth of budget. That's not a ceiling reached by running out of ambition. It's what's left when ambition is spent on the moments that need it.

## Sources for this section

- `CLAUDE.md` — "Agentic moments", "MCP tools", "On-demand loop guardrails"
- `docs/decisions/007-verified-component-loop.md` (+ amendment)
- `docs/06-agentic-moments.md`
- `.claude/commands/*.md` frontmatter (`model:`, `allowed-tools:`)
- `.claude/agents/adversarial-reviewer.md`, `.claude/agents/docs-scribe.md`
