---
sources:
  - docs/decisions/*.md
  - .claude/commands/*.md
  - ROADMAP.md
# clock reset 2026-07-09: ADR-018 amendment adds undefined-prerequisite rubric detail; this page doesn't describe the scribe rubric, still accurate
# clock reset 2026-07-10: four commands gain deterministic-gate steps; this page describes no per-command steps, still accurate
# clock reset 2026-07-10: /extract-learnings gains a handoff:tidy close-out step; this page doesn't describe per-moment steps, still accurate
# clock reset 2026-07-12: #64 docs sweep landed (ADR-007/015 gain renamed-path/stage parentheticals); this page carried no stage or review-path vocabulary, still accurate
# clock reset 2026-07-13: #70 mirrors Airtable deprecation state into DTCG $deprecated on committed token source (ADR-002 amendment); this page describes no token-format detail, still accurate
# verified 2026-07-13 (issue #74): checked against ADR-010/ADR-015 amendments, CLAUDE.md, and the four lifecycle command files incl. the full/standard rename (e948407); this page carries no stage or review-path vocabulary, ADR and moment counts still correct
# clock reset 2026-07-21: ROADMAP.md Homepage checkbox marked done and reassigns the horizon-brand demo to the Pipeline Health Dashboard; this page describes no per-page brand assignment, still accurate
# clock reset 2026-07-21: ADR-020 replaces --_gap/--_align/--_box-px style vars with data-attribute selectors; this page carries no CSS-variable detail, still accurate. ROADMAP.md Phase 11 remaining items (Settings page, cross-page nav, responsive QA, root build chain) all marked done; this page already lists Homepage/CourseOverview/UserSettings/Dashboard/Pipeline as existing showcase pages, still accurate
# clock reset 2026-07-23: ADR-007 promoted proposed→accepted (exit condition met: Accordion 2026-07-09, 12 ledger runs) — status flip + amendment only; this page's ADR list and moment descriptions are unaffected, still accurate
---
# Start here

UpSkill is a learning-first, **lite agentic** design system for a small SaaS product. "Lite" is a deliberate constraint, not an apology: a fixed, small component set (layout primitives, typography, `Button`, form inputs, `Card`, and the page-specific additions listed per phase), and economic maintenance — recurring automation is plain scripts and GitHub Actions calling REST APIs directly, [MCP](08-glossary.md) tools are reserved for one-off interactive tasks, and agent involvement is limited to [nine defined moments](06-agentic-moments.md). The premise stated in `CLAUDE.md` is that **one person must be able to maintain the whole system**, and every architectural choice documented on this site traces back to that.

The pipeline in one sentence: [design tokens](08-glossary.md) are authored as committed DTCG JSON, built by [Style Dictionary](08-glossary.md) into [CSS custom properties](08-glossary.md) and JS/TS constants, consumed by coded React components, governed through Airtable, automated through GitHub Actions — with Figma as a downstream mirror rather than the source of truth. In plain terms: design decisions live as data in this repo, a build step turns them into the values components use, Airtable tracks their status, and Figma reflects them without defining them.

## Documentation map

"Where does what live" spans five surfaces, each for a different audience and question. Knowing which one you're reading (or should be reading) saves confusion:

| Surface | Audience / question | Open it |
|---|---|---|
| Storybook (`packages/components`) | Anyone asking "how does this component behave, in every variant and theme?" — Storybook is the documentation layer for coded components. | `/run-storybook`, or `npm run storybook` inside `packages/components`. |
| Airtable | Design/product asking "what's the governance status of this token or component" (owner, successor, sign-off). | Open the base directly; the repo's read-side mirror is `airtable-governance.json` / `.claude/component-signoff.json` (see the observability map below — never a live call from a session). |
| This site (Docsify, `docs/`) | Someone evaluating or maintaining the system who wants "how this actually works, page by page," with every claim linked to its source file/script/ADR. | `npm run docs:serve` locally; published at https://f4cu.github.io/upskill-design-system/docs/. |
| `CLAUDE.md` + `.claude/rules/` | An agent asking "what must I know to generate or reuse correctly in this repo?" | Read directly — `CLAUDE.md` for cross-cutting invariants, path-scoped rules for component/token specifics. |
| The live showcase (`apps/showcase`) | Anyone who wants to see the system *running*, not explained — a Vite/React app deploying to GitHub Pages (replacing the earlier Vercel plan), with built pages, a system-health dashboard, and a pipeline diagram. | `npm run dev -w @upskill/showcase`, or the deployed site. |

Where a page on this site describes something the showcase demonstrates live, it links out — for example, the pages produced by the layout grammar and the fixed component set:

- [Homepage.tsx](https://github.com/F4cu/upskill-design-system/blob/main/apps/showcase/src/pages/Homepage.tsx) — the carousel pattern (ADR-006) and Phase 5c components in situ
- [CourseOverview.tsx](https://github.com/F4cu/upskill-design-system/blob/main/apps/showcase/src/pages/CourseOverview.tsx) — the page whose Figma frame (node 96:5854) drove the landmark grammar in ADR-011
- [UserSettings.tsx](https://github.com/F4cu/upskill-design-system/blob/main/apps/showcase/src/pages/UserSettings.tsx) — Phase 5b components
- [Dashboard.tsx](https://github.com/F4cu/upskill-design-system/blob/main/apps/showcase/src/pages/Dashboard.tsx) — the system-health dashboard
- [Pipeline.tsx](https://github.com/F4cu/upskill-design-system/blob/main/apps/showcase/src/pages/Pipeline.tsx) — the interactive pipeline diagram

## Observability map

"Where do I look to know system state" — the frozen-memory files, terminal views, dashboard, and telemetry ledger that answer it, without live API calls:

| Surface | Answers | Open it |
|---|---|---|
| Frozen snapshots (`airtable-governance.json`, `token-usage.json`, `figma-variables.json`, `.claude/component-signoff.json`, `.claude/component-review-state.json`, `.claude/component-pipeline.json`, `.claude/component-patterns.json`, `.claude/STATUS_QUO.md`, `.claude/pipeline-status.json`) | "What's the last-captured state of governance, usage, review, and CI/issues — without hitting a live API?" (CLAUDE.md's "Frozen-memory snapshots" table has the full source/capture mapping.) | Read the file directly, or regenerate with `npm run sense` (most files) / `npm run pipeline:status` (`.claude/pipeline-status.json`: CI workflow conclusions + open issues, via `gh`). |
| `npm run status` | "Component and token totals, governance summary, and the latest five token changes — what does the system look like right now?" | Terminal, no args. |
| `npm run status:board` | "Every component's stage and review checklist (visual/code/learnings) in one table." | Terminal, no args. |
| `npm run status:component <Name>` | "Where does this one component stand, and what's the next step?" | `npm run status:component -- <Name>`. |
| The pipeline dashboard | "The same state, visually, as a maintainer-facing dashboard" — component lifecycle (both axes), token governance backlog, Figma drift, open issues, and a DAG of the pipeline itself. | `npm run pipeline-dashboard`, or the showcase's `/dashboard` and `/pipeline` pages. |
| `.claude/handoff/run-ledger.json` | "How has the adversarial-review stage actually performed, run over run?" — the committed, append-only per-run review telemetry ledger. | Read the file directly; entries are promoted into it by `npm run handoff:tidy`. |

## How to read this site

Pages 01–06, 09, and 10 each follow the same template:

1. **What it is** — plain description
2. **Why it's built this way** — the real constraint or trade-off, cited from the ADR that records it
3. **How it works, concretely** — real code, config shapes, and file paths from this repo
4. **Diagram** — only where the relationship is genuinely spatial or sequential
5. **Related** — the specific ADRs, commands, and scripts the page draws on

The suggested reading order is the page order — tokens first, because everything downstream consumes them:

- [01 — Token pipeline](01-token-pipeline.md) — the four-layer model, the Style Dictionary build, and why code (not Figma) is the source of truth
- [02 — Component lifecycle](02-component-lifecycle.md) — the metadata schema, the two-axis lifecycle, and the tests for when a new component is justified
- [03 — Accessibility](03-accessibility.md) — the three-tier a11y contract (plus the automatic story axe sweep) and the jsdom trade-off
- [04 — Layout grammar](04-layout-grammar.md) — the fixed Figma-level → HTML-landmark mapping
- [05 — Governance](05-governance.md) — the Airtable two-way sync and the "don't downgrade done" guard
- [06 — Agentic moments](06-agentic-moments.md) — the lite-agentic charter, the nine moments, and the verified `/add-component` loop
- [07 — CLI reference](07-cli-reference.md) — every command, grouped by purpose
- [08 — Glossary](08-glossary.md) — terms explained for a non-developer collaborator
- [09 — Context engineering](09-context-engineering.md) — the instruction ladder (`CLAUDE.md` → rules → commands → snapshots → handoffs) and the CI gates that keep it honest
- [10 — Machine-readable metadata](10-machine-readable-metadata.md) — the metadata stack: the per-component contract, its validators, the cross-component pattern aggregate, and the write-back loop (reads naturally right after 02)

The twenty architectural decision records live in [`docs/decisions/`](decisions/001-component-metadata-schema.md) and are linked from whichever page cites them — they hold the *why* in full; the pages here summarize and point.
