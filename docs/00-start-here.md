---
sources:
  - docs/decisions/*.md
  - .claude/commands/*.md
  - ROADMAP.md
# clock reset 2026-07-09: ADR-018 amendment adds undefined-prerequisite rubric detail; this page doesn't describe the scribe rubric, still accurate
# clock reset 2026-07-10: four commands gain deterministic-gate steps; this page describes no per-command steps, still accurate
# clock reset 2026-07-10: /extract-learnings gains a handoff:tidy close-out step; this page doesn't describe per-moment steps, still accurate
# clock reset 2026-07-12: 4-stage Implementation model lands in sense.js + ADR-010 amendment (#64); stage-vocabulary sweep for this page follows in the dedicated docs PR
# clock reset 2026-07-12: commands gain visual-review step + adversarial/in-session path rename (#64 PR 2); stage-vocabulary sweep for this page follows in the dedicated docs PR
---
# Start here

UpSkill is a learning-first, **lite agentic** design system for a small SaaS product. "Lite" is a deliberate constraint, not an apology: a fixed, small component set (layout primitives, typography, `Button`, form inputs, `Card`, and the page-specific additions listed per phase), and economic maintenance — recurring automation is plain scripts and GitHub Actions calling REST APIs directly, [MCP](08-glossary.md) tools are reserved for one-off interactive tasks, and agent involvement is limited to [nine defined moments](06-agentic-moments.md). The premise stated in `CLAUDE.md` is that **one person must be able to maintain the whole system**, and every architectural choice documented on this site traces back to that.

The pipeline in one sentence: [design tokens](08-glossary.md) are authored as committed DTCG JSON, built by [Style Dictionary](08-glossary.md) into [CSS custom properties](08-glossary.md) and JS/TS constants, consumed by coded React components, governed through Airtable, automated through GitHub Actions — with Figma as a downstream mirror rather than the source of truth. In plain terms: design decisions live as data in this repo, a build step turns them into the values components use, Airtable tracks their status, and Figma reflects them without defining them.

## The two documentation surfaces

This repo documents itself in two distinct registers. Knowing which one you're reading saves confusion:

1. **This site** — the reference. "How this system actually works, page by page," written for someone evaluating or maintaining it who wants to browse the architecture. Every claim links to the file, script, or ADR it comes from.
2. **The live showcase** — `apps/showcase`, a Vite/React app deploying to GitHub Pages (replacing the earlier Vercel plan — one hosting story shared with this docs site), containing built pages, a system-health dashboard, and a pipeline diagram. It is the system *running*, not the system *explained*.

Where a page on this site describes something the showcase demonstrates live, it links out — for example, the pages produced by the layout grammar and the fixed component set:

- [Homepage.tsx](https://github.com/F4cu/upskill-design-system/blob/main/apps/showcase/src/pages/Homepage.tsx) — the carousel pattern (ADR-006) and Phase 5c components in situ
- [CourseOverview.tsx](https://github.com/F4cu/upskill-design-system/blob/main/apps/showcase/src/pages/CourseOverview.tsx) — the page whose Figma frame (node 96:5854) drove the landmark grammar in ADR-011
- [UserSettings.tsx](https://github.com/F4cu/upskill-design-system/blob/main/apps/showcase/src/pages/UserSettings.tsx) — Phase 5b components
- [Dashboard.tsx](https://github.com/F4cu/upskill-design-system/blob/main/apps/showcase/src/pages/Dashboard.tsx) — the system-health dashboard
- [Pipeline.tsx](https://github.com/F4cu/upskill-design-system/blob/main/apps/showcase/src/pages/Pipeline.tsx) — the interactive pipeline diagram

## How to read this site

Pages 01–06 and 09 each follow the same template:

1. **What it is** — plain description
2. **Why it's built this way** — the real constraint or trade-off, cited from the ADR that records it
3. **How it works, concretely** — real code, config shapes, and file paths from this repo
4. **Diagram** — only where the relationship is genuinely spatial or sequential
5. **Related** — the specific ADRs, commands, and scripts the page draws on

The suggested reading order is the page order — tokens first, because everything downstream consumes them:

- [01 — Token pipeline](01-token-pipeline.md) — the four-layer model, the Style Dictionary build, and why code (not Figma) is the source of truth
- [02 — Component lifecycle](02-component-lifecycle.md) — the metadata schema, the two-axis lifecycle, and the tests for when a new component is justified
- [03 — Accessibility](03-accessibility.md) — the three-tier a11y contract and the jsdom trade-off
- [04 — Layout grammar](04-layout-grammar.md) — the fixed Figma-level → HTML-landmark mapping
- [05 — Governance](05-governance.md) — the Airtable two-way sync and the "don't downgrade done" guard
- [06 — Agentic moments](06-agentic-moments.md) — the lite-agentic charter, the nine moments, and the verified `/add-component` loop
- [07 — npm scripts reference](07-npm-scripts-reference.md) — every npm script, grouped by purpose
- [08 — Glossary](08-glossary.md) — terms explained for a non-developer collaborator
- [09 — Context engineering](09-context-engineering.md) — the instruction ladder (`CLAUDE.md` → rules → commands → snapshots → handoffs) and the CI gates that keep it honest

The eighteen architectural decision records live in [`docs/decisions/`](decisions/001-component-metadata-schema.md) and are linked from whichever page cites them — they hold the *why* in full; the pages here summarize and point.
