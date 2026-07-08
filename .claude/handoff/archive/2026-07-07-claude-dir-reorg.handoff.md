---
status: done
created: 2026-07-07
completed: 2026-07-08
---

**Completion note (2026-07-08):** all five tasks executed as specified, with one
deliberate deviation from T4: run-file deletion on PR-open was rejected (see
ADR-015 Decision) because it would break `sense.js`'s `deriveImplementation()`,
which reads `.review.json`/`.learnings.json` presence — confirmed with the
developer before proceeding. Everything else (T1 triage/archive, T2 gitignore
flip, T3 `handoff-tidy.js` + index, T4 path migration + `qa-driver.mjs` merge
into `driver.mjs`'s new `route` subcommand, T5 ADR-015 + CLAUDE.md) landed as
written.

# Handoff — Reorganize `.claude/` artifacts (lifecycle convention + tidy script)

Self-contained execution handoff. Written 2026-07-07 after a full inventory of `.claude/`
and a best-practices research pass (sources at bottom). Execute in one session. Read
`CLAUDE.md` first — especially "Frozen-memory snapshots", "Agentic moments", and the
on-demand loop guardrails; everything below stays inside the system's lite philosophy
(deterministic scripts, no new agents, no always-on watchers).

**Note on this file:** it uses the very convention it introduces (dated filename +
status frontmatter). Until Task 2 flips `.gitignore`, this file is untracked — commit it
as part of Task 2.

## Diagnosis (verified 2026-07-07)

1. `.claude/handoff/` mixes three artifact kinds with no lifecycle signal:
   - **Per-run loop JSON** — `<Name>.{snapshot,review,run,learnings}.json` for
     Accordion, Badge, Button, Icon, Select (20 files). All five components' loop
     runs are complete and merged; all 20 files are dead but linger.
   - **Ad-hoc markdown handoffs** — 9 files, mix of done and active, indistinguishable
     without opening each one.
   - **A design spec** (`pipeline-dashboard-chart-spec.md`) sitting next to handoffs.
2. **Git policy contradicts the durable-handoff rule.** `.gitignore` line 14
   (`.claude/handoff/*`) ignores everything, but handoffs are supposed to live in a
   durable committed location (prior session feedback). The active multi-brand
   handoff exists only on this machine.
3. **`.claude/qa/` is undeclared** — 1.4 MB of untracked dashboard QA screenshots +
   `qa-driver.mjs`, no naming convention, overlapping the role of
   `.claude/skills/run-storybook/shots/`.
4. Minor: `.claude/scheduled_tasks.lock` and `.claude/.DS_Store` are untracked strays.

## Settled decisions — do not relitigate

- **Lifecycle lives in the file; status lives in one index.** Markdown handoffs carry
  3-line frontmatter (`status: active | done | superseded`, `created:`, `completed:`).
  New handoffs are named `YYYY-MM-DD-slug.handoff.md`. One generated
  `handoff/index.json` is what future sessions read — never glob the directory.
- **Tidying is a deterministic script** (`npm run handoff:tidy`), not an agent step.
- **Committed vs ignored:** active + archived markdown handoffs are **committed**
  (archives are case-study material for this project); per-run loop JSON stays
  **gitignored** (regenerable via `npm run sense:component <Name>`, consumed by
  `/extract-learnings`); `qa/` stays **gitignored** as declared scratch.
- **Rejected alternatives** (from research): filename-only status encoding
  (ungreppable as count grows); per-artifact status files (over-fragmentation);
  extending `component-pipeline.json` (different axis — that file tracks component
  implementation stage, not handoff docs).
- This changes a convention agents follow → **record an ADR** (next free number;
  check `docs/decisions/` — ADR-013 was the last known) and reflect the *what to do*
  in CLAUDE.md per the ADR section's split.

## Tasks (sequential; verification gate after each)

### T1 — Triage existing files

Pre-verified statuses (spot-check, don't re-derive from scratch):

| File | Status | Evidence |
|---|---|---|
| `system-case-study.handoff.md` | done | `system-case-study-draft.md` exists (its deliverable) |
| `system-case-study-draft.md` | done (deliverable, keep with archive) | — |
| `docsify-docs-site.handoff.md` | done | `docs/00-start-here.md`…`_sidebar.md` built |
| `token-contrast-fixes.handoff.md` | done (mostly) | `red` hue in `primitives.json`, CLAUDE.md hue list updated. Verify asks A/B (step-11 darkening, cyan monotonicity) actually landed before marking done; if not, note the residue in the frontmatter |
| `case-study-refresh.handoff.md` | verify | check `docs/add-component-loop-case-study.html` (gitignored) freshness; likely done |
| `pipeline-dashboard.handoff.md` | done (mostly) | dashboard committed (c5efba4, 7747660). Verify T5/T6 checkboxes |
| `pipeline-dashboard-chart-spec.md` | verify | `qa/splitchart-*.png` suggest charts landed; confirm in `apps/showcase` |
| `multi-brand-refactor.md` | **active** | Phase 2 WIP on branch `multi-brand/phase-2` |
| `figma-variable-push-prep.md` | **active** | waiting for next `/figma-variable-push` run |

Actions: add frontmatter to all 9; rename the two active ones to the dated convention
(`multi-brand-refactor.md` → `2026-07-03-multi-brand-refactor.handoff.md`,
`figma-variable-push-prep.md` → `2026-07-07-figma-variable-push-prep.handoff.md` —
dates from their original write dates). Move `done` files to `handoff/archive/`.
Delete the 20 per-run JSON files (all consumed; regenerable).

**Gate:** `handoff/` contains only active `.handoff.md` files + `archive/` + this file.

### T2 — Git policy flip

Replace `.gitignore` line 11–14 block with:

```
# Handoff docs (active + archive) are committed — durable across sessions/machines.
# Per-run component-loop artifacts are regenerable (npm run sense:component) and
# consumed by /extract-learnings — ignored.
.claude/handoff/runs/
# QA scratch (screenshots, ad-hoc drivers) — declared ephemeral.
.claude/qa/
.claude/scheduled_tasks.lock
```

Create `handoff/runs/` as the new home for future per-run JSON (T4 updates the
writers). Commit all active + archived handoffs including this file.

**Gate:** `git status` shows handoff md files tracked; `git check-ignore
.claude/handoff/runs/x .claude/qa/x` both match.

### T3 — `handoff:tidy` script + index

`scripts/handoff-tidy.js`, npm script `handoff:tidy`. Behavior:
- Parse frontmatter of every `handoff/*.handoff.md` + `handoff/archive/*.handoff.md`;
  fail loudly on a file missing frontmatter (that's the methodology enforcement).
- Move `done`/`superseded` files from `handoff/` to `handoff/archive/`.
- Regenerate `handoff/index.json`: `[{ name, kind: "handoff"|"spec"|"run",
  status, created, updated (file mtime ISO date), path }]`, including `runs/*.json`
  entries with `status: "in-flight"` so a dangling run is visible.
- No deletion — archiving only; deleting is a human choice.
Style per CLAUDE.md: no comments unless non-obvious, no defensive handling of
internal paths.

**Gate:** run it twice — second run is a no-op; `index.json` lists exactly the files
present; hand-break one frontmatter field and confirm it fails.

### T4 — Update writers and consumers

- `/add-component`, `/review-component`, `/extract-learnings` command files: per-run
  artifacts read/write under `handoff/runs/<Name>.*.json` (path change only);
  `/extract-learnings` deletes the component's run files once its PR opens, so
  "run files exist" = "loop in flight". `scripts/sense.js` (`sense:component`)
  writes snapshots to the same new path — grep it for the old path.
- `.claude/qa/qa-driver.mjs`: if it duplicates `run-storybook/driver.mjs`
  capability, delete it; if it adds reusable route-screenshot capability the skill
  lacks, fold it into the skill and note it in `SKILL.md`. Delete the merged-work
  screenshots either way.

**Gate:** `npm run sense:component Button` writes to `handoff/runs/`; grep repo for
`\.claude/handoff/[A-Z]` finds no stale flat-path references (CLAUDE.md included).

### T5 — Record it

- ADR (`docs/decisions/`): Context = the three diagnosis points; Decision = the
  settled-decisions block above; Consequences = frontmatter is mandatory (tidy
  script fails without it), archives are permanent case-study material.
- CLAUDE.md: ~5-line "Handoff artifacts" subsection (likely under "Frozen-memory
  snapshots"): naming, frontmatter, `runs/` split, `handoff:tidy`, "read
  `index.json`, never glob". Update the Common-tasks table with `handoff:tidy`.
- One commit per task or one overall — committer's choice; direct to current branch
  per repo git workflow.

**Gate:** `npm run handoff:tidy && npm run metadata:validate` pass; mark this file's
frontmatter `status: done`, set `completed:`, and let the tidy script archive it.

## Research sources (Sonnet pass, 2026-07-07)

- code.claude.com/docs/en/best-practices — official `.claude/` taxonomy; no official
  handoff-artifact convention exists (teams invent their own, as this repo did).
- nathanonn.com "Claude Code Handoff Doc Skill" — dated-filename session-log pattern.
- claudedirectory.org / medium.com @ilyas.ibrahim — handoff template + archive-subfolder
  + registry/index pattern.
- irina.codes, pub.towardsai.net — commit what agents read back as ground truth;
  ignore regenerable/session-local artifacts.
- Key pitfalls the design guards against: stale snapshots silently consumed (index +
  frontmatter), context bloat from glob-reading dead files (read `index.json` only),
  filename-only lifecycle encoding (frontmatter is the source of truth).
