# Handoff — Build a standalone Docsify documentation site for this repo

**Task type:** one-off generation (not recurring — build once, hand-edit after).
**This is a new, third artifact — don't conflate it with the other two documentation
efforts already in this repo:**
- `system-case-study-draft.md` / `system-case-study.handoff.md` — the narrative,
  interview-oriented case study (Challenge/Approach/Solution/Impact voice, headline
  callouts for a portfolio pass). **Leave that file exactly as-is.** It's a source you
  read from here, not something this task edits.
- `ROADMAP.md` Phase 11 / `apps/showcase` — the live Vite/React app (showcase pages,
  health dashboard, pipeline diagram, `llms.txt`), deployed via Vercel. Also untouched by
  this task.

This task builds a **third thing**: a plain-markdown reference documentation site — "how
this system actually works, page by page" — for a reader who wants to browse the
architecture rather than read a narrative or watch a live dashboard.

**Update (2026-07-02):** `ROADMAP.md` now has a dedicated section for this work —
`Pivot — Standalone documentation site (Phase 12)` / `Phase 12 — Docsify Reference Site`,
placed after Phase 11. That resolves the "does this get its own ROADMAP.md section"
question below. When executing this build, check off Phase 12's boxes as stages complete
rather than restructuring the roadmap further.

**Update (2026-07-02):** The cross-linking open question is resolved: this site does
**not** need to cross-link with `system-case-study-draft.md` (narrative register stays
separate, no pointer back needed). It **can** link to `apps/showcase` — e.g. from
`00-start-here.md`, pointing to specific built pages there as live examples of what the
reference documentation describes. Still don't edit anything under `apps/showcase/`;
this is a one-way link out, not a co-editing task.

## 1. Who this is for

Someone evaluating or maintaining this system who wants a browsable reference: what the
token pipeline actually does, how governance flows both directions, what the eight
agentic moments are for, what each ADR decided and why. Same audience posture as a
well-run internal wiki — assume software fluency (this reader can read a code snippet),
but don't assume they've read every ADR or script already.

**Voice:** documentation register, not narrative register — this is a reference, not a
pitch. Explain the *why* behind each mechanism (most ADRs already do this — lean on them),
but skip the "headline callout" / interview framing that `system-case-study-draft.md`
uses. Real code snippets, real config shapes, and real file paths are fine and expected
here — unlike a teaching site aimed at other people's systems, this site is documenting
*this* system, so specificity is the point. Never paste real secrets (`.env` values,
API keys) even as an example — use placeholders for those.

## 2. Sources (this repo, current state — not pinned, it's the repo you're in)

- `CLAUDE.md` — whole file, the connective-tissue document.
- `docs/decisions/*.md` — all 11 ADRs (001–011; skip `000-template.md`).
- `.claude/commands/*.md` — all 10 command specs.
- `.claude/skills/run-storybook/SKILL.md`.
- `docs/npm-scripts-reference.md` — existing npm scripts reference; reuse/adapt rather than
  rewriting from scratch.
- `docs/glossary.md` — existing glossary; reuse/adapt rather than rewriting from scratch.
- `ROADMAP.md` — read for context and phase history, but don't distill it page-by-page;
  it's project history, not system architecture.
- `.claude/handoff/system-case-study-draft.md` — **use as a research shortcut, not a
  template.** Every claim in it already cites the file/script/ADR it came from, so it's
  a fast way to find the right citation instead of re-deriving it — but rewrite the voice
  into documentation register and don't copy its "Headline" callouts or narrative framing
  wholesale. Treat it as a synthesized index into the real sources, not a source itself.

## 3. Deliverable

Same tooling shape as the sibling `design-systems-101` repo, tailored in content:

- **Static site, zero/near-zero build step.** [Docsify](https://docsify.js.org) — plain
  markdown files, one small `index.html` + `_sidebar.md`, no bundler.
- **Location: `docs/`.** This repo already has real content there
  (`npm-scripts-reference.md`, `glossary.md`, `decisions/`, `add-component-loop-case-study.html`)
  — build the Docsify
  shell around it rather than starting a parallel folder. `add-component-loop-case-study.html`
  stays a standalone self-styled page (link to it from the relevant Docsify page, don't
  fold it in as a markdown page — it's HTML, not Docsify content). The 11 ADRs in
  `docs/decisions/` can be linked directly into the sidebar as their own pages; no need to
  duplicate their content into a synthesized page unless a page genuinely needs to weave
  several ADRs into one narrative (e.g. the token pipeline page pulling from ADR-002,
  ADR-003, ADR-004, ADR-005 together).
- **Diagrams as Mermaid**, fenced ```mermaid``` blocks (Docsify's mermaid plugin renders
  these; GitHub renders them natively as a fallback). Diagram only genuinely spatial/
  sequential relationships: token resolution order, the component lifecycle's two axes,
  the `/add-component` loop's stages. Don't diagram lists.
- **GitHub Pages off `main` (`/docs`).** Check current Pages settings for this repo before
  enabling — confirm nothing else already claims that slot. This doesn't conflict with
  `apps/showcase`, which deploys separately via Vercel per `ROADMAP.md` Phase 11.
- **Real code/config snippets are appropriate here** (unlike `design-systems-101`, which
  explicitly bans real code as "not a template to replicate"). This site *is* the
  template's documentation, so pull real DTCG JSON shapes, real metadata schema fragments,
  real script names — just never real secrets.

**Mobile-friendly, same bar as `design-systems-101`:** viewport meta tag intact, Docsify's
responsive sidebar (not a custom nav), no forced horizontal scroll on 375–430px, Mermaid
diagrams wrapped in a horizontally-scrollable container (`overflow-x: auto`) with few-node
diagrams, 44×44px minimum tap targets, tested at iOS Safari widths before calling it done.

## 4. Information architecture (draft — refine ordering as needed, keep the arc)

```
00-start-here.md          — what this system is, how to read this site, pointers to the
                             case study (narrative) and apps/showcase (live artifact) as
                             the other two documentation surfaces
01-token-pipeline.md      — three-layer model (primitive/theme/device), DTCG format,
                             Style Dictionary build, Figma-as-mirror and why (ADR-002 incl.
                             amendments, ADR-003 supersession, ADR-004, ADR-005)
                             [diagram: token pipeline flow]
02-component-lifecycle.md — metadata schema (ADR-001), two-axis lifecycle model (ADR-010),
                             extend-vs-new-vs-internal test (ADR-009), carousel precedent
                             (ADR-006) [diagram: lifecycle's two axes]
03-accessibility.md       — two-tier a11y contract (ADR-008), backlog ledger, jsdom
                             trade-off
04-layout-grammar.md      — Figma-level → HTML-landmark mapping (ADR-011), the inline-style
                             allowlist it replaced
05-governance.md          — Airtable two-way sync (code→Airtable, Airtable→code), the
                             "don't downgrade done" guard (ADR-010), ADR practice itself as
                             a governance artifact (003's supersession as the worked
                             example) [diagram: two-way sync]
06-agentic-moments.md     — the "lite agentic" charter, scripts-vs-agents split, the 8
                             developer-triggered moments, the verified `/add-component`
                             loop and its guardrails (ADR-007: sequential ≤2 agents,
                             frozen-file handoffs, deterministic gates)
                             [diagram: loop stages, matching the current shape — Sense →
                             Scaffold → Gate → Visual checkpoint → delegates to
                             `/review-component` → PR]
07-cli-reference.md       — adapted from `docs/npm-scripts-reference.md`
08-glossary.md            — adapted from `docs/glossary.md`
```

Link directly to `docs/decisions/00X-*.md` from whichever page cites each ADR, rather than
re-hosting ADR content as separate sidebar pages, unless testing shows Docsify's sidebar
handles that awkwardly.

## 5. Page template (apply to pages 01–06)

1. **What it is** (2–4 sentences, plain documentation voice)
2. **Why it's built this way** — the real constraint or trade-off that shaped it (most
   ADRs already state this explicitly — cite directly)
3. **How it works, concretely** — real code/config snippet or file reference, not a
   paraphrase
4. **Diagram**, only if genuinely spatial/sequential
5. **Related** — links to the specific ADR(s), command(s), or script(s) this page draws on

## 6. Execution approach

Sequential, not a parallel subagent swarm — this repo's own charter (CLAUDE.md
"Agentic moments" guardrails) pushes back on parallel agents outside the 8 defined
moments, and a 9-page reference site has a real consistency risk that parallelism makes
worse: split across independent subagents with no shared context, pages drift in voice,
duplicate or contradict each other's framing, and citation style goes inconsistent —
exactly the connective-tissue quality this site depends on.

Two-pass split instead, both sequential, one page at a time:

1. **Gather** — read the page's cited sources (ADRs, commands, scripts) and pull out the
   concrete facts/snippets/file references it needs, per the page template in §5. This
   step is mechanical extraction, not prose — a Sonnet subagent per page is fine here if
   parallelized, since a wrong or dropped citation is easy to catch in review and doesn't
   propagate into other pages' voice.
2. **Write** — turn the gathered citations into the actual page prose, in the
   documentation register from §1. Do this pass with Fable, sequentially, one page after
   another in the same thread/session so voice and cross-references stay consistent
   across the site.

If speed matters more than this default, the fallback is to parallelize only step 1
(fact-gathering) across subagents and keep step 2 (writing) strictly sequential — never
parallelize the writing pass itself.

## 7. Constraints

- Don't restate `system-case-study-draft.md`'s narrative framing or "Headline" callouts —
  different register, different job.
- Don't edit `system-case-study-draft.md`, `system-case-study.handoff.md`,
  `case-study-refresh.handoff.md`, `docs/add-component-loop-case-study.html`, or anything
  under `apps/showcase/` as part of this task. `ROADMAP.md` is the one exception: its
  Phase 12 section (added 2026-07-02) belongs to this task — check off its boxes as
  stages complete, don't otherwise restructure the roadmap.
- Don't invent claims untraceable to a real file in this repo — if something's unclear,
  flag it as an open question in the page.
- Real code/config snippets are fine; real secrets are never fine, even as examples.

## 8. Done when

- Every ADR (001–011) and every command (10 files) is referenced from at least one page.
- `docs/npm-scripts-reference.md` and `docs/glossary.md` content is reachable from the site (adapted in, or
  linked and confirmed to render inside Docsify's frame).
- `npx docsify serve docs` renders the site locally with working sidebar nav and no broken
  internal links.
- GitHub Pages URL is live (after confirming no conflict with existing Pages config).
- Site checked at a 375–430px viewport: no horizontal page scroll, sidebar collapses to a
  usable toggle, diagrams scroll within their own container instead of the page.
- Phase 12 boxes in `ROADMAP.md` checked off to match.

Both open questions are now resolved (2026-07-02): the `ROADMAP.md` section question —
yes, Phase 12. The cross-linking question — no link to the case study draft; `00-start-here.md`
may link out to specific `apps/showcase` pages as live examples.
