# Three lenses on the same frozen state

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar.*

## The status CLI — a terminal glance

```
27 components — 0 done · 25 in review · 2 in progress · 0 todo
gate passed for every reviewed row; VIS/CODE/LEARN: ✓ done · ○ pending · – n/a

COMPONENT       TYPE         STAGE                     PATH      VIS  CODE  LEARN
Accordion       interactive  in review                 full      ○    ✓     ✓
AppHeader       container    in review                 standard  ○    ✓     –
Box             container    in review                 full      ○    ✓     ✓
Checkbox        input        in review                 full      ○    ✓     ✓
Button          interactive  in progress (unreviewed)  –         –    –     –
Select          input        in progress (unreviewed)  –         –    –     –
```

That's `npm run status:board`, trimmed to the header and a sample of rows. It's the whole review-ledger story from [the measured-impact numbers](08-measured-impact.md) rendered as a glance instead of a JSON diff: which components cleared the gate, which review path they took (`full` vs `standard`), which checklist items are still open — the question a maintainer actually asks day to day, *where is every component in the pipeline, and is anything stale*, answered without opening Airtable, without a Figma tab, without starting an agent session, without a single network call.

The answer turns out to be the same file set read three different ways: no new state captured, no new API called, three read-only lenses over the frozen files the pipeline already commits — a terminal glance, a shareable web view, and an agent-context aggregate.

`scripts/status.js`, wired to three `npm run` entries, is the cheapest of the three: plain Node, no dependencies beyond `child_process` for a couple of `git` reads, no AI. The file's own header comment states the discipline plainly — it's "a dumb renderer: stage logic lives in `sense.js` and is read back from `component-pipeline.json`, never re-derived." The CLI doesn't compute maturity or implementation stage; it formats what `sense.js` already decided.

- `npm run status` — component/token totals plus the five most recent token changes, replayed from git history of `packages/tokens/src` (the frozen files carry no per-token timestamps, so this one command reaches past the snapshot to the commit log — the one place in this trio that isn't a pure snapshot read).
- `npm run status:board` — the full per-component table above, sorted by pipeline stage.
- `npm run status:component <Name>` — one component's checklist card, with a "next" hint synthesized from which checklist item is still open.

## The Pipeline Health Dashboard — a shareable web view

`apps/showcase/src/pages/Dashboard.tsx` (route `/dashboard`, live at https://f4cu.github.io/upskill-design-system/) is the same underlying state made presentable to someone who isn't going to run a CLI — an interviewer, a hiring manager, anyone the maintainer wants to hand a URL to instead of a terminal session. ROADMAP.md's Phase 11 section frames it exactly this way: "a health dashboard exposing the frozen-memory snapshots a maintainer would actually watch," built "because nothing outside Storybook makes it visible."

The page is a straightforward composition of the same fixed component set the rest of the system uses (`Box`, `Stack`, `Card`, `Badge`, `Heading`) plus two small chart primitives (`PipelineDag`, `SplitChart`), reading from `dashboardData.ts` — which itself imports directly from committed JSON: `component-pipeline.json`, `airtable-governance.json`, `token-usage.json`, `figma-variables.json`, and `pipeline-status.json` (CI conclusions and open GitHub issues, captured pre-deploy by a `gh`-backed script, joined at build time only). The standalone `/pipeline` route (`Pipeline.tsx`) reuses the same `PipelineDag` component as a hero, on its own.

Four sections, each reading a distinct snapshot: component lifecycle (maturity/implementation splits plus the full component table — the same data `status:board` renders as text), token governance (deprecated-in-use backlog by layer), Figma drift (variables mirrored, snapshot age), and open issues. None of it calls Airtable, Figma, or GitHub at request time — every render is a build-time read of a file already sitting in the repo, which is the same invariant the rest of the pipeline runs on, just given a UI. *(A screenshot of the live dashboard belongs here in the eventual `system-case-study.html` build; this source file references the live URL instead of attempting one.)*

Visual state gets the same observability treatment, just one layer down: `npm run screenshot:check` (ADR-019) diffs every component's committed screenshot baseline on every PR, advisory rather than blocking today. The last full pass measured 54/54 shots at 0.000% diff — a maintainer doesn't have to open Storybook and eyeball 27 components to know nothing shifted visually; the CI run already answered that question.

## `.claude/STATUS_QUO.md` — the agent-facing aggregate

The third lens isn't for a human glancing at a terminal or a browser — it's the same state prepared for an agent's context window. `npm run sense` regenerates `.claude/STATUS_QUO.md` from the same three source files status.js and the dashboard both read (`airtable-governance.json`, `token-usage.json`, `figma-variables.json`), aggregated into one markdown document: governance counts, the full component table with review-checklist columns, token usage totals, Figma drift age. Loop agents (`/add-component`, `/layout-generation`, and the rest) read this file instead of calling Airtable or Figma live — it's the mechanism, not a separate one, just formatted for a different reader.

The three views never disagree, because they're not three sources of truth — they're one source (`component-pipeline.json` plus its siblings) rendered through three formatters: a box-drawing terminal renderer, a React page, and a markdown aggregator. A maintainer checking `status:board` at 9am, an interviewer looking at `/dashboard` at 2pm, and an agent reading `STATUS_QUO.md` mid-loop at 4pm are all looking at the same 27-component table, current as of whenever `sense` last ran.

## The throughline

The frozen-snapshot mechanism was justified in [the measured-impact section](08-measured-impact.md) on cost grounds — 31,700 tokens standing in for live API calls at 20 reference points. This section is the other half of that argument: the same files that make agent context cheap also make maintainer observability free. Building three lenses over one file set costs nothing structurally new — no additional API surface, no additional state to keep in sync, no additional staleness risk beyond what the snapshot regeneration cadence already carries. The benefit is the maintainer never has to context-switch into Airtable, Figma, or an agent session just to answer "where does everything stand" — the answer was already sitting in a committed file, three keystrokes or one URL away.

## Sources for this section

- `apps/showcase/src/pages/Dashboard.tsx`, `Pipeline.tsx`, `apps/showcase/src/pipeline/dashboardData.ts`
- `scripts/status.js`, `package.json` (`status`, `status:board`, `status:component` entries)
- `.claude/STATUS_QUO.md`, `scripts/sense.js`
- `docs/decisions/019-screenshot-baseline-visual-regression.md`, `npm run screenshot:check`
- `ROADMAP.md` — Phase 11 section ("Pivot — Case-study visibility" and "Pipeline Health Dashboard")
- `.claude/handoff/archive/pipeline-dashboard.handoff.md`
- [The numbers](08-measured-impact.md) — frozen-snapshot economics cited above, not repeated
