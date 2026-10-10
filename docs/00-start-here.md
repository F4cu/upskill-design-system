---
title: "Start here"
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
# clock reset 2026-09-23: ADR-022 sidebar wording corrected (ADR list derived from filenames, not autogenerate); this page does not describe sidebar mechanics, still accurate
# clock reset 2026-09-23: ADR-022 amendment moves this page to /start-here/ behind a splash root; the published site URL on this page is unchanged, still accurate
# clock reset 2026-10-01: adds /figma-cli command + ADR-002 amendment (figma-cli as the Plugin API transport for the Figma moments); this page lists no per-command transport detail, still accurate
# clock reset 2026-10-01: adds ADR-023 (subcomponents) + ADR-009 cross-reference; this page lists no individual ADRs or component APIs, still accurate
# clock reset 2026-10-01: CardVertical metadata learnings + ADR-023 amendment (Figma mirrors the preset; code slot → Figma instance swap, open parts not Figma slots); this page describes no Figma property mapping, still accurate
# clock reset 2026-10-02: ADR-023 amendment (one prop per datum; component-drawn separators) + size.050/size.separator tokens; this page lists no component APIs or token steps, still accurate
# clock reset 2026-10-02: tokens-author Conventions gains a bullet (component dimension without a token → size primitive + named device alias, never raw px); this page doesn't list the convention bullets, still accurate
# clock reset 2026-10-02: CLAUDE.md renames Button's ghost variant to transparent (ADR-024); this page doesn't list variants, still accurate
# clock reset 2026-10-02: governance pull deprecates button.ghost/elevated/inverted (ADR-024 cleanup); deprecation mechanism this page describes unchanged, still accurate
# clock reset 2026-10-02: ADR-024 consequence wording corrected (bare <Button> call sites migrated to explicit accent); page doesn't describe Button variants, still accurate
# clock reset 2026-10-06: ADR-024 amendment (transparent becomes a ghost button; per-variant hover tokens); page doesn't describe Button variants, still accurate
# clock reset 2026-10-06: ADR-024 follow-up marked done (button.accent.* rename, background.disabled); page doesn't describe Button tokens, still accurate
# clock reset 2026-10-06: figma-variable-push.md example path swapped from the deleted button.ghost to button.danger.default; page still accurate
# clock reset 2026-10-06: ADR-023 amendment (Figma Parent.Root with native slots; example frame per pattern) + components.md Figma-mirror rule line; this page lists no individual ADRs or component APIs, still accurate
# clock reset 2026-10-06: ADR-024 issue reference corrected (#22 → #24); page doesn't cite it, still accurate
# clock reset 2026-10-07: adds ADR-026 (prop vocabulary + scaffold API proposal step); this page lists no individual ADRs or component APIs, still accurate
# clock reset 2026-10-07: ADR-026 drift table marks the TextField/AppHeader/DropdownMenu migrations done; this page lists no component APIs, still accurate
# clock reset 2026-10-07: ADR-026 records the Chip pressed/selected and default-value decisions; this page lists no component APIs, still accurate
# clock reset 2026-10-07: ADR-026 amendment records the Figma alignment pass (mappings, Figma-only properties, set renames); this page describes no Figma property names, still accurate
# clock reset 2026-10-07: ADR-026 amendment adds the Checkbox Figma alignment; this page describes no Figma property names, still accurate
# clock reset 2026-10-07: ADR-026 amendment adds Checkbox disabled variants and the restored box component; this page describes no Figma property names, still accurate
# clock reset 2026-10-07: ADR-026 amendment adds the TextField Figma alignment; this page describes no Figma property names, still accurate
# clock reset 2026-10-07: /figma-cli gains a Plugin API pitfalls list; this page describes no per-command steps, still accurate
# clock reset 2026-10-07: parent-variant rule for nested state (TextField Has error) added to ADR-026, components.md Figma line and /figma-cli pitfalls; this page describes no Figma property detail, still accurate
# clock reset 2026-10-07: ADR-026 amendment adds the Select Figma set and the DropdownMenu/Item rename; this page describes no Figma property names, still accurate
# clock reset 2026-10-07: /figma-cli pitfalls gain the variant drag-out note; TextField set id updated in ADR-026; this page describes no Figma detail, still accurate
# 2026-10-07: adds ADR-027 (proposed: component spec file, Button pilot); ADR count corrected to twenty-seven (was already one behind after ADR-026); page lists no individual ADRs or per-component files
# clock reset 2026-10-07: ADR-027 amendment records the CardVertical pilot spec; this page lists no individual ADRs or per-component files, still accurate
# clock reset 2026-10-07: ADR-027 links its harness-arm handoff; this page lists no handoffs or individual ADRs, still accurate
# clock reset 2026-10-08: ADR-027 accepted (harness arm result amendment); the ADR count is unchanged and this page lists no individual ADR statuses, still accurate
# clock reset 2026-10-07: ADR-001 amendment (tokens lists what the component itself reads, enforced); this page lists no metadata fields, still accurate
# 2026-10-07: adds ADR-028 (focus indicator); ADR count updated to twenty-eight; page lists no individual ADRs
# clock reset 2026-10-07: ADR-013 amendment corrects harness totals (ROADMAP follows); layout-generation reads the component set from the package exports (#98); page cites neither the totals nor the set's source, still accurate
# clock reset 2026-10-08: /add-component, /component-scaffold and /review-component gain an --eval mode for the harness-ablation eval; this page lists the moments, not their modes, still accurate
# clock reset 2026-10-08: ADR-026 amendment records Badge `label` → `children` as open drift (harness-ablation pilot); this page lists no individual ADR contents, still accurate
# 2026-10-09: adds ADR-029 (tiered context architecture, risk-triggered reviewer) + ADR-007/017 amendments; ADR count updated to twenty-nine; page lists no individual ADRs
# clock reset 2026-10-09: /add-component and /review-component gain the risk-triggered reviewer (ADR-029); this page lists the moments, not their stages, still accurate
# clock reset 2026-10-09: /component-scaffold and /add-component Stage 1 fill tokens.* via metadata:derive-tokens (ADR-029 Step 5); this page's level of detail is unaffected, still accurate
# clock reset 2026-10-09: ADR-029 gains the Step 6 readout amendment (Arm 1b ties Arm 1); this page lists no ADR contents, still accurate
# clock reset 2026-10-10: ADR-029 gains the Step 6.5 Accordion readout amendment; this page lists no ADR contents, still accurate
# clock reset 2026-10-10: ADR-026 amendment drops the variant ↔ Style mapping (Figma Variant) and names default native slots Children; this page describes no Figma property names, still accurate
# clock reset 2026-10-10: ADR-026 amendment marks the Badge label → children migration done (code, showcase, Figma); this page lists no component APIs, still accurate
---
# Start here

UpSkill is a learning-first, **lite agentic** design system for a small SaaS product. "Lite" is a deliberate constraint, not an apology: a fixed, small component set (layout primitives, typography, `Button`, form inputs, `Card`, and the page-specific additions listed per phase), and economic maintenance — recurring automation is plain scripts and GitHub Actions calling REST APIs directly, [MCP](08-glossary.md) tools are reserved for one-off interactive tasks, and agent involvement is limited to [nine defined moments](06-agentic-moments.md). The premise stated in `AGENTS.md` is that **one person must be able to maintain the whole system**, and every architectural choice documented on this site traces back to that.

The pipeline in one sentence: [design tokens](08-glossary.md) are authored as committed DTCG JSON, built by [Style Dictionary](08-glossary.md) into [CSS custom properties](08-glossary.md) and JS/TS constants, consumed by coded React components, governed through Airtable, automated through GitHub Actions — with Figma as a downstream mirror rather than the source of truth. In plain terms: design decisions live as data in this repo, a build step turns them into the values components use, Airtable tracks their status, and Figma reflects them without defining them.

## Documentation map

"Where does what live" spans five surfaces, each for a different audience and question. Knowing which one you're reading (or should be reading) saves confusion:

| Surface | Audience / question | Open it |
|---|---|---|
| Storybook (`packages/components`) | Anyone asking "how does this component behave, in every variant and theme?" — Storybook is the documentation layer for coded components. | `/run-storybook`, or `npm run storybook` inside `packages/components`. |
| Airtable | Design/product asking "what's the governance status of this token or component" (owner, successor, sign-off). | Open the base directly; the repo's read-side mirror is `airtable-governance.json` / `.claude/component-signoff.json` (see the observability map below — never a live call from a session). |
| This site (Starlight, `docs/`) | Someone evaluating or maintaining the system who wants "how this actually works, page by page," with every claim linked to its source file/script/ADR. | `npm run docs:serve` locally; published at https://f4cu.github.io/upskill-design-system/docs/. |
| `AGENTS.md` + `CLAUDE.md` + `packages/*/AGENTS.md` | An agent asking "what must I know to generate or reuse correctly in this repo?" | Read directly — `AGENTS.md` for tool-agnostic invariants, `CLAUDE.md` for Claude-specific workflow, the nested package `AGENTS.md` files for component/token specifics. |
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
- [09 — Context engineering](09-context-engineering.md) — the instruction ladder (`AGENTS.md` + `CLAUDE.md` → rules → commands → snapshots → handoffs) and the CI gates that keep it honest
- [10 — Machine-readable metadata](10-machine-readable-metadata.md) — the metadata stack: the per-component contract, its validators, the cross-component pattern aggregate, and the write-back loop (reads naturally right after 02)

The twenty-nine architectural decision records live in [`docs/decisions/`](decisions/001-component-metadata-schema.md) and are linked from whichever page cites them — they hold the *why* in full; the pages here summarize and point.
