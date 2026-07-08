# ADR-016 — Layout output review path

**Date:** 2026-07-08
**Status:** accepted

## Context

CLAUDE.md's on-demand loop guardrails state "no agent code reaches `main` unreviewed." For
components this is enforced end-to-end: `/add-component` runs a deterministic gate, then
`/review-component` spawns one fresh-context adversarial reviewer, then opens a PR — nothing
lands on `main` without both a gate pass and an independent review.

`/layout-generation` has no equivalent. Its final step runs `npm run layout:validate` +
`npm run typecheck` and stops; the output (a route page in `apps/showcase/src/pages/` or a
story file) is never required to go through a PR, let alone a review. This was flagged in the
2026-07-08 agentic moments audit (`.claude/handoff/2026-07-08-agentic-moments-audit.handoff.md`,
finding 4) as an inconsistency: the same failure mode the component reviewer exists for — a
generator rationalizing its own structural choices (here, its own Figma-to-grammar mapping) —
is unguarded for layouts.

The options considered:
1. **Do nothing** — leaves the stated invariant false for one of the two agent-code-generating
   moments.
2. **Always spawn the adversarial reviewer for layout output**, mirroring `/review-component`
   exactly.
3. **Tiered default**: every generated layout goes through a PR with in-session `/code-review`
   (cheap, no subagent, no fresh context); a full route page may optionally also get the
   adversarial reviewer subagent, reusing `/review-component`'s subagent shape.

Option 2 conflicts with the Pro-window-scarcity guardrail already governing moment 6
("Sequential, ≤2 agents" — spawn at most one fresh subagent, spent where independent context is
the whole point). Layout generation runs more often and more exploratory than component
scaffolding (iterating on a page draft is normal; iterating on a component is not), so making
every run pay for a fresh-context subagent would burn the scarce resource on low-stakes drafts.

## Decision

Layout-generation output always goes through a PR before landing on `main`, but the review tier
is tiered by stakes, not uniform:

- **Default:** every generated layout (route page or `--story` output) is committed on a
  feature branch and opened as a PR against `main`; the developer runs in-session `/code-review`
  on the diff before merging. No subagent, no handoff file — same cost profile as any other
  hand-written diff.
- **Opt-in:** for a full route page (not a `--story` fragment), the developer may additionally
  invoke the adversarial reviewer subagent, reusing the read-only `adversarial-reviewer` agent
  definition and `.review.json` shape from `/review-component`. This is opt-in, not automatic —
  the generator's own Figma-mapping rationalization risk is real but not every layout run
  justifies spending a fresh context window on it.

This keeps "no agent code reaches `main` unreviewed" true for both agent-code moments while
respecting the ≤2-agent / sequential / Pro-window-scarcity guardrails already in place: the
default path spends zero subagents, and the opt-in path spends at most one, exactly like
`/review-component`.

## Consequences

- `/layout-generation`'s final step changes from "run the validator and stop" to "run the
  validator, then commit to a feature branch and open a PR" — the git workflow's blanket
  "commit directly to the current branch" rule gets a second named exception (alongside
  `/add-component`+`/review-component` and `/docs-sync`).
- No new agent role is created — the opt-in path reuses `.claude/agents/adversarial-reviewer.md`
  and the `.review.json` shape verbatim rather than defining a parallel reviewer for layouts.
- Cost stays bounded: routine layout iteration (the common case) costs one in-session
  `/code-review` pass, not a subagent spawn; only full route pages the developer flags as
  higher-stakes pay for the fresh-context review.
- CLAUDE.md's "Git workflow" section needs its exception list updated to name this new PR path,
  and `/layout-generation`'s final step needs the branch+PR instructions and the opt-in
  reviewer invocation.
