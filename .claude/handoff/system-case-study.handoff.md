# Handoff — Draft the System Case Study narrative

## Context
This repo (`upskill-design-system`) is a lite-agentic design system built as a
job-search case-study artifact (see `ROADMAP.md` Phase 11, "System case study"). Read
`CLAUDE.md` and `ROADMAP.md` in full first — they are the source of truth for how the
system actually works. Skim `docs/decisions/*.md` (ADRs) for the "why" behind key
calls, especially ADR-002 (token architecture / Figma-as-mirror), ADR-007 (verified
component loop), ADR-010 (component lifecycle two axes).

**Your job is to research and write a narrative draft only.** You are not building the
page, writing JSX/HTML, or touching any code. The output is a Markdown draft that a
developer will hand to a coding agent (Sonnet/Opus) to turn into either the `apps/showcase`
landing page or a dedicated `docs/system-case-study.html`. Do not decide that format —
just write the content.

**Accuracy is the whole point.** Every claim must trace back to something real in
`CLAUDE.md`, `ROADMAP.md`, an ADR, or an actual script/command file — cite the specific
file or script by name inline as you write (e.g. "`scripts/airtable-sync.js` pushes..."),
so the reviewing developer can spot-check each claim. Do not invent statistics,
capabilities, or benefits. If you're not sure something is still true, flag it as a
question in the draft rather than asserting it.

**This draft feeds two downstream artifacts, in this order** — write for the first,
structure for the second:
1. A detailed Markdown draft handed to a coding agent (Sonnet/Opus) to build an
   interactive HTML page — needs enough concrete depth (mechanisms, before/after
   specifics, file citations) that the coding agent isn't inventing content to fill
   sections. Target **~2,500–4,000 words total** across the 6 sections below — denser
   than a portfolio piece, closer to internal documentation with a narrative thread.
2. A later, separate summarization pass down to a short portfolio case study (reference
   length/shape: `facundorosales.com/projects/awin-design-system.html`, ~1,200–1,500
   words, Challenge/Approach/Solution/Impact with a few headline stats). To make that
   pass extraction rather than re-research, **close every section with a 1–2 sentence
   "Headline" callout** — a quotable, self-contained claim in that portfolio's style
   (e.g. "8 developer-triggered moments replace what would otherwise be continuous
   agent involvement" / "≤2 agents per loop, sequential, by design — not a capability
   limit"). Mark it clearly, e.g. `> **Headline:** ...`, so it's easy to pull out later.

**Reference material.** These two sources cover design-systems-plus-AI-agents territory
directly and are a better starting point than a cold web search for task 5 (and useful
background for tasks 1, 2, and 6, where the "why agentic, why bounded" framing matters):
- `https://learn.thedesignsystem.guide` — Romina Kavcic's Substack; covers design tokens
  as machine-readable assets, AI agents interacting with design systems, and case
  studies across many real design systems.
- `https://blog.murphytrueman.com` — Murphy Trueman's blog; covers design system
  governance, component architecture, and adapting systems for machine readability and
  organizational resilience.
Use `WebFetch`/`WebSearch` to pull specific posts relevant to each task rather than
citing the sites generically — cite the specific post title + URL, same as any other
external source, and only use a claim if it actually supports the point being made.

**Image placeholders.** Where a diagram would clarify structure better than prose
(token pipeline flow, Airtable two-way sync, the agentic-moments loop stages), insert
an inline placeholder rather than describing it only in words:
`<!-- IMAGE PLACEHOLDER: <short description of the diagram, e.g. "token pipeline:
primitives -> theme/device -> Style Dictionary -> CSS/JS -> components"> -->`
List these at the point in the text where the diagram belongs, not collected at the
end — the developer will generate or hand-draw them later.

## Tasks (in order) — one section per heading

1. **Token pipeline.** Explain the flow: Figma → primitives/theme/device JSON layers
   (three-layer model, DTCG format) → Style Dictionary build → CSS custom properties +
   JS/TS constants → consumed by components. Explain *why code, not Figma, is the
   source of truth* (ADR-002 amendment: Enterprise-gated Variables REST API and
   Code Connect, Token Studio's single-file limit vs. this repo's multi-file
   architecture) — this is a deliberate, defensible constraint, not a limitation to
   apologize for.

2. **CLI/script automation vs. agentic moments.** Explain what "lite agentic" means in
   practice: GitHub Actions + plain scripts handle everything recurring (token builds,
   Airtable sync, PR diff comments); the 8 developer-triggered agentic moments
   (`.claude/commands/`) are reserved for judgment work a script can't do (drift
   audits, scaffolding, adversarial review). Explain the economic rationale — see the
   "Pivot — Ad-hoc agentic loops" section of `ROADMAP.md` (Claude Pro's rolling usage
   window as the scarce resource, sequential ≤2-agent loops, frozen-file handoffs
   instead of live API calls between stages, one person maintaining the whole system).

3. **Airtable governance flow, both directions.** Explain code → Airtable
   (`scripts/airtable-sync.js`, runs on merge to `main` via `sync-tokens.yml`: pushes
   primitives/semantic/device tokens and component `Maturity`/`Implementation`) and
   Airtable → code (`scripts/airtable-pull.js`: pulls `status`/`owner`/`successor`/
   `notes` into `airtable-governance.json`, and human `done`/`todo` sign-off into
   `.claude/component-signoff.json`). Be explicit about *who* edits which side — humans
   set governance fields and sign-off in Airtable; scripts derive and push the rest —
   and the "never overwrite a human `done`" guard (ADR-010).

4. **Benefits per audience.** Three short subsections:
   - *Maintainers* — frozen-memory snapshots (`STATUS_QUO.md`, `.claude/component-pipeline.json`)
     mean answering "what's the system's health?" costs zero live API calls; a
     one-bit Airtable sign-off is the only manual governance step.
   - *Developers/consumers* — metadata-driven scaffolding (`/component-scaffold`,
     `/add-component`), enforced accessibility contracts (two-tier a11y, ADR-008),
     layout generation constrained to real composition rules.
   - *Reviewers* — the adversarial-review loop (`/review-component`) catches things
     deterministic gates structurally can't (cite the real example: the Accordion
     `aria-controls` dead-reference bug from the pilot run, `docs/add-component-loop-case-study.html`).
   Ground every claim in a named mechanism — no generic "AI makes it faster" language.

5. **Business impact.** Two parts:
   - *External narratives.* Use `WebSearch`/`WebFetch` to find how real design-system
     case studies (e.g. Shopify Polaris, IBM Carbon, Atlassian, Salesforce Lightning,
     GitHub Primer, or similar) frame business impact — the recurring narrative shapes
     (design/dev velocity, component-reuse rate, reduced design-debt/QA cycles,
     consistency-driven support-cost reduction, time-to-first-PR for a new
     contributor). Cite each source (title + URL) inline. The goal is borrowing
     *narrative structure and the categories of impact that matter to a reader*, not
     copying numbers — those belong to other companies' products, not this repo.
   - *Lite-agentic vs. fully-agentic comparison, grounded in this repo.* Quantify what
     "lite" avoids in **agent-invocation terms**, not dollars. This project runs on
     Claude Pro, where the scarce resource is the rolling **usage window**, not
     per-token API billing (ROADMAP.md, "Pivot — Ad-hoc agentic loops"). So: count the
     recurring operations this system runs as plain scripts/CI instead of live agent
     calls — `tokens:build` (Style Dictionary), `scripts/airtable-sync.js`
     (`sync-tokens.yml`, every merge to `main`), `scripts/airtable-pull.js`,
     `scripts/sense.js`, `scripts/token-usage.js`, `scripts/token-contrast-check.js`
     (`tokens-check.yml`, every token-touching PR), `scripts/a11y-coverage.js` +
     `a11y:test`, `scripts/validate-metadata.js`, `layout:validate` — versus a
     hypothetical fully-agentic system that routes each of these through an LLM call.
     Contrast that against the 8 explicitly bounded agentic moments (`.claude/commands/`)
     and the ≤2-agent, sequential, frozen-file-handoff cap on the one loop that exists
     (`/add-component`, ADR-007) — a fully-agentic design would have no such cap and no
     script/agent boundary at all.
     If you include an illustrative token-or-dollar figure for a reader's intuition
     (e.g. "if this were billed via the API instead"), label it explicitly as an
     illustrative estimate, state your assumptions (tokens per call, a cited API price
     point), and show the arithmetic so it's falsifiable — never present it as this
     project's actual cost, since Claude Pro isn't billed per token.

6. **Honest rejected-alternatives framing.** What was considered and turned down, and
   why — this is what makes the case study read as senior judgment rather than a
   feature list. Cover at least: the Enterprise-gated Figma Variables REST API (why
   Figma stayed a downstream mirror instead of the source of truth), parallel-agent
   swarms (why the loop is sequential and capped at 2 agents — Claude Pro rate limits,
   not a capability gap), and appearance-based component renames/merges (ADR-009's
   three-question test — visual similarity alone isn't a reason to add or merge
   components).

## Definition of done
- A single Markdown draft, one heading per section above (6 sections), ~2,500–4,000
  words total.
- Every factual claim cites the file/script/ADR it comes from; every external
  narrative claim cites the source (title + URL) it comes from.
- Illustrative cost/token figures (if any) are explicitly labeled as illustrative,
  with assumptions and arithmetic shown — never asserted as this project's real cost.
- Each of the 6 sections ends with a marked `> **Headline:** ...` callout.
- Diagram-worthy moments have an inline `<!-- IMAGE PLACEHOLDER: ... -->` at the point
  they belong, not just prose description.
- No JSX, no HTML, no page implementation — narrative content only.
- Anything uncertain is flagged as a question, not asserted.

## Output
Write the draft to `.claude/handoff/system-case-study-draft.md` for the developer to
review before handing it to a coding agent for implementation.

## Constraints
- Research and writing only. Do not edit component code, tokens, scripts, or create
  any new route/page.
- Don't touch `docs/add-component-loop-case-study.html` here — that's a separate
  handoff (`case-study-refresh.handoff.md`). You may read it and cite it, not edit it.
