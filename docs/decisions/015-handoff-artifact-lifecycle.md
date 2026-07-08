# ADR-015 — Handoff artifact lifecycle convention

**Date:** 2026-07-08
**Status:** `accepted`

## Context

`.claude/handoff/` had accumulated three artifact kinds with no lifecycle signal:
per-run component-loop JSON (`<Name>.{snapshot,review,run,learnings}.json`) for five
components whose loops were long complete but whose files lingered; nine ad-hoc
markdown handoffs mixing done and active work, indistinguishable without opening
each one; and a design spec sitting alongside them. Separately, `.gitignore` ignored
`.claude/handoff/*` wholesale, contradicting the project's own convention (prior
session feedback, see `feedback-handoff-file-location` memory) that durable handoffs
belong in a committed repo path, not local-only state — the active multi-brand
refactor handoff existed on only one machine. `.claude/qa/` had also accumulated 1.4MB
of untracked screenshots and an ad-hoc Playwright driver with no declared status,
overlapping `.claude/skills/run-storybook/driver.mjs`'s job.

Rejected alternatives: filename-only status encoding (ungreppable as the count
grows); a status file per artifact (over-fragmentation for a solo-maintained repo);
extending `.claude/component-pipeline.json` (that file tracks component
implementation stage, a different axis from handoff-doc lifecycle).

## Decision

- Markdown handoffs carry 3-line YAML frontmatter: `status: active | done |
  superseded`, `created:`, `completed:`. New handoffs are named
  `YYYY-MM-DD-slug.handoff.md`.
- `scripts/handoff-tidy.js` (`npm run handoff:tidy`) is the only thing that moves
  files: it archives `done`/`superseded` handoffs into `handoff/archive/` and
  regenerates `handoff/index.json` — the single file future sessions read instead
  of globbing the directory. It fails loudly on any `.md` handoff/spec file missing
  frontmatter; that failure is the methodology enforcement, not a bug to work around.
- Active and archived markdown handoffs (and specs sitting alongside them) are
  **committed** — they are durable, cross-session, and case-study material for this
  project. Per-run component-loop JSON moves to `.claude/handoff/runs/` and stays
  **gitignored** (regenerable via `npm run sense:component <Name>`, consumed by
  `/review-component` and `/extract-learnings`). `.claude/qa/` stays **gitignored**
  as declared ephemeral scratch.
- `.claude/qa/qa-driver.mjs`'s one capability the `run-storybook` skill's driver
  lacked — screenshotting an arbitrary app route (not a Storybook story) — was
  folded into `driver.mjs` as a `route` subcommand; the qa scratch directory was
  then deleted rather than kept as a second, overlapping driver.
- Run-file *deletion* on PR-open (considered during this pass, to make "run files
  exist" mean "loop in flight") was rejected: `scripts/sense.js`'s
  `deriveImplementation()` reads `.review.json` + `.learnings.json` presence to
  derive a component's `"in review"` pipeline status (documented in CLAUDE.md's
  "Frozen-memory snapshots"), and deleting those files after the PR opens would
  silently break that derivation. Run files persist indefinitely under `runs/`.

Applying this pass also caught one stale status: the reorg handoff's own T1 triage
table called `multi-brand-refactor.md` `active`/"Phase 2 WIP", but `git log`/
`ROADMAP.md` showed all three phases already merged to `main` by 2026-07-06.
Corrected to `done` before archiving — commit history is authoritative over a
handoff's own prose when the two disagree.

## Consequences

- A handoff without frontmatter is now a hard failure at tidy time, not a silent
  gap — this is deliberate friction to keep the convention from eroding the way the
  pre-ADR state did.
- Archives are permanent: nothing is ever deleted by the tidy script, only moved.
  Human judgment (not a script) decides if an archived handoff is ever pruned.
- Future writers of per-run component-loop artifacts (`sense-component.js`,
  `/add-component`, `/review-component`, `/extract-learnings`) must target
  `.claude/handoff/runs/`, not the flat `.claude/handoff/` directory.
