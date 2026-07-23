# Division of labor: scripts, agents, and the two subagents

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar.*

## The number that should lead this chapter

22 scripts in `scripts/`, 37 npm script entries, 7 GitHub Actions workflows — and all 7 workflows contain zero LLM or MCP calls, verified by reading every YAML. Against that: 9 agentic moments, all developer-triggered, and exactly 2 subagent definitions. That ratio is the whole argument of this chapter before a single sentence of reasoning: the overwhelming majority of what keeps this system running never touches a model.

Open `.claude/agents/` and the two subagent files — `adversarial-reviewer.md`, `docs-scribe.md` — read the same way to a skeptical reader who's seen "agentic" design systems built as a mesh of specialist bots wired together and running on a schedule: two agents looks like a system that gave up early. It's the opposite. The count is the *conclusion* of a cost analysis, not a starting constraint. This system runs on Claude Pro, where the scarce resource is a rolling weekly usage window, not a per-token budget — a fact that inverts almost every instinct a multi-agent, API-billed architecture would optimize for.

## What was rejected, briefly

Early in the project (ADR-007), a blueprint for the component-generation loop specified parallel worker agents, a Sonnet-router/Haiku-worker cost split, and a live Figma REST pull. It assumed cheap, close-to-free parallelism and per-token billing — neither holds on a Pro seat, where three workers running at once drain the *same* shared window three times as fast rather than costing three times the money, and the Figma Variables REST API is Enterprise-only regardless of billing model. What survived because it was plan-independent — frozen state-file handoffs, one adversarial verification stage, on-demand triggering — is what shipped. Full story, including why a different Anthropic plan would make a different call here: [Rejected alternatives §2](04-rejected-alternatives.md#2-the-parallel-agent-swarm-adr-007).

## The actual split: what a script does, what an agent does, what a subagent does

The system draws the line in three tiers, and each tier earns its place by a different argument.

**Scripts do anything deterministic, recurring, or checkable by a rule.** Style Dictionary token builds, metadata validation, typecheck, build, the accessibility test suite, pulling Airtable governance fields, scanning the repo for token usage, computing component-pattern schemas — none of this touches a model. It's `npm run x`, wired into GitHub Actions, calling REST APIs directly. A script doesn't hallucinate, doesn't need review, doesn't drain a usage window, and runs the same way at 2am in CI as it does on a laptop. If a task can be fully specified as "check condition, take deterministic action," putting an agent on it is pure waste.

**Agents do the nine moments that need judgment a script can't encode.** Reading Figma design context and translating it into a component scaffold. Deciding whether a layout's structural choices actually match component metadata relationships. Reviewing a component's accessibility contract for gaps a linter wouldn't catch. Rewriting a stale doc section so it still reads well to three different audiences. Each requires interpreting unstructured input against a body of rules — that's the gap between "checkable by a rule" and "needs judgment," and it's the only gap this system spends agent time on. All nine are developer-triggered; none are scheduled or watch anything continuously.

**Subagents — plural in name only; there are two, and they're both reviewers, not workers.** `adversarial-reviewer.md` and `docs-scribe.md` share a deliberate constraint: their tool access is Read/Grep/Glob(/Bash for the reviewer) — no `Edit`, no `Write`. They cannot change a single file. That's enforced by what tools the agent definition exposes, not a prompt instruction a careless run might ignore. A subagent's only output is a structured finding; the *main session* decides what to do with it and owns the actual write.

There are exactly two of them because a spawned subagent does one specific job neither a script nor the main session can do as well: bringing a **fresh, independent context** to a review. The main session, mid-loop, has motivated reasoning about its own work; a subagent that starts cold and reads only the diff and a frozen snapshot doesn't share that bias. That's the entire justification for spending a second agent's worth of usage-window budget — which is why the loop is capped at "sequential, at most two agents" (ADR-007) rather than "as many specialists as there are concerns."

## Where "delegation to cheaper models" actually shows up — and where it doesn't yet

It would be easy to claim this system routes mechanical work to a cheap model and judgment work to a capable one, mirroring the rejected blueprint's router/worker split minus the parallelism. The honest state: **most of the nine moments don't pin a model at all** — they inherit whatever model is driving the session. Two command files declare a model explicitly: `airtable-sync` (a utility wrapper around the sync scripts, not one of the nine moments) runs on `haiku`, and `token-deprecation-pass` (moment 2) and `tokens-author` (also a utility) declare `sonnet`.

So the pattern that exists today is narrower than "every moment is tiered": a handful of command files pin a cheaper tier for work that's mechanical even though it's dressed up as a command, while the moments that involve real judgment — scaffold, layout generation, review, docs rewriting — run on the session's default model. That's a real, if partial, instance of matching model cost to task difficulty; it's not the fully generalized router the rejected blueprint proposed, and the honest version of this story says so rather than rounding up.

## The benefit, stated plainly

None of this is defensive crouching around a resource limit. The constraint produced a specific, checkable set of properties:

- **Predictable spend.** A loop touches the shared usage window sequentially, never in a fan-out, so a run is boundable and interruptible per stage rather than an unpredictable spike.
- **Fewer places to be wrong.** Every deterministic step is a script, which means it's not a place an agent can hallucinate a plausible-looking pass. The gate either passes or it doesn't.
- **A review that's actually independent**, not just a second pass by the same context that wrote the code — the reviewer is a fresh subagent by construction.
- **No agent-written code reaches `main` unreviewed** — enforced by a PR branch requirement plus the tool-boundary-restricted reviewer.
- **Fewer calls into external systems that are rate-limited, plan-gated, or just slow.** This isn't a local superstition: Anthropic's own engineering write-up on MCP efficiency works through a workflow that dropped from 150,000 tokens to 2,000 — a 98.7% reduction — by not streaming raw tool payloads through model context, the same move the frozen snapshots make. The caching economics compound it: a stable committed file re-read across a session is prompt-cacheable at 10% of base input price, while a live API response is full-price every time ([numbers and sources](08-measured-impact.md)).

The one-line version, for the reader who still thinks two agents is a modest system: two agents is what's left after every task a script could do was given to a script, and every remaining task was checked against "does this genuinely need a fresh, independent read" before it was allowed to spend a second agent's worth of budget. That's not a ceiling reached by running out of ambition — it's what's left when ambition is spent on the moments that need it.

## Sources for this section

- `CLAUDE.md` — "Agentic moments", "MCP tools", "On-demand loop guardrails"
- `docs/decisions/007-verified-component-loop.md` (+ amendment)
- `docs/06-agentic-moments.md`
- `.claude/commands/*.md` frontmatter (`model:`, `allowed-tools:`)
- `.claude/agents/adversarial-reviewer.md`, `.claude/agents/docs-scribe.md`
- [Rejected alternatives](04-rejected-alternatives.md) — full blueprint and Figma-wall detail
