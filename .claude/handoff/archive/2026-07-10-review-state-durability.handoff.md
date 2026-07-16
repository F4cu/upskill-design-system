---
status: done
created: 2026-07-10
completed: 2026-07-16
---

# Durable component review state (fix pipeline regression from CI sense runs)

## Problem

Commit `942239a` (post-merge snapshot workflow, `sync.yml` from PR #59) ran
`node scripts/sense.js` on a fresh CI checkout and committed a regressed
`component-pipeline.json`: every component back to `"established"`,
`reviewedAt: null`. Root cause: `deriveImplementation()` and
`buildComponentPipeline()` in `scripts/sense.js` read review artifacts from
`.claude/handoff/runs/` (`<Name>.{review,run,learnings}.json`), which is
gitignored — absent in CI, so derivation falls through to the pre-loop default.
The committed `run-ledger.json` doesn't help: sense.js never reads it and it
only holds full-loop runs (12), not the 13 lighter-path reviews.

All 25 local `.review.json` files are intact on the maintainer's machine —
nothing was actually lost except the committed snapshot.

## Decision (option 2, user-approved)

Make review state durable in a new committed file
`.claude/component-review-state.json`:

```json
{ "Box": { "reviewedAt": "…", "path": "full", "learningsBackfilled": true } }
```

- **Written by `sense.js` itself** (not handoff:tidy): when local `runs/`
  artifacts exist, merge them over the committed state (newest `reviewedAt`
  wins; `learningsBackfilled` latches true) and rewrite the file. In CI, no
  local artifacts → file is read as-is, never regressed.
- **Read by `sense.js`** as the baseline for `implementation` /`reviewedAt`/
  `reviewPath`/`learningsBackfilled`; local artifacts layer on top.
- `sync.yml` adds the new file to its `git add` list (no-op in CI but keeps
  the contract explicit).
- Amend ADR-015 (dated amendment) with the why; add the file to the
  CLAUDE.md frozen-snapshot table (watch the ≤200-line budget).
- Backfill: run `npm run sense` locally → writes review-state from the 25
  local `.review.json` files and restores the correct pipeline; commit.

## Steps

- [x] `scripts/sense.js`: read/merge/write `.claude/component-review-state.json`
- [x] `.github/workflows/sync.yml`: git add the new file
- [x] ADR-015 amendment (2026-07-10)
- [x] CLAUDE.md frozen-snapshot table row
- [x] `.claude/component-review-state.json` committed and populated
- [x] Commit to `main`, mark this handoff `done`, `npm run handoff:tidy`
