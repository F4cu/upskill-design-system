---
description: Rewrite stale docs/ reference pages flagged by the docs-check staleness gate — read each flagged doc plus the sources that changed since it was last committed, rewrite only the stale sections, and open a PR. Use when npm run docs:check (or docs-check.yml in CI) fails.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Docs sync

**Trigger:** Developer, when `npm run docs:check` (or `docs-check.yml` on a PR) reports one or more `docs/NN-*.md` pages as stale. Never runs in CI — detection is the script's job; rewriting is this moment's.

**When to use:** A source file a docs page declares in its `sources:` frontmatter has a git commit newer than the doc's last commit, and the doc needs its stale sections brought back in line. Also accepts an explicit work queue: `/docs-sync 00 04 06` syncs those pages regardless of what the check currently reports (needed when a commit has already reset the staleness clocks, e.g. the inaugural run after the frontmatter landed).

## Inputs (read all before starting)

- The check output — run `npm run docs:check` and collect the flagged docs with their newer-than-doc sources. If the developer passed an explicit doc list, use that as the work queue instead.
- Each flagged doc in full, including its `sources:` frontmatter.
- For each flagged doc, what actually changed: `git log --oneline <doc-last-commit>.. -- <source>` and `git diff <doc-last-commit>.. -- <source>` for each newer source. The diff, not the source's current state, defines the rewrite scope.

## Steps

1. Build the work queue (check output or explicit list). For each doc, list its newer sources and summarize the relevant changes from the diffs.
2. Classify each doc: **real drift** (the doc now states something the sources contradict, or omits something load-bearing the sources added) vs **clock-only staleness** (the source change doesn't affect anything the doc says). Clock-only docs need no prose change — any commit touching the doc resets the gate, so note them in the output and leave the text alone (the sync PR's commit resets them).
3. For real drift, rewrite **only the stale sections**. Preserve the doc's voice, structure, and cross-links; do not restructure or pad. If the doc cites a file, script, or command, verify the citation still resolves.
4. Update the doc's `sources:` frontmatter if the rewrite makes it depend on a source it didn't declare (or drops one it no longer describes). Every entry must match at least one tracked file — the check errors on dangling patterns.
5. Create a branch `docs-sync/<YYYY-MM-DD>`, commit, and open a PR against `main`. After committing, run `npm run docs:check` on the branch and confirm it passes (the gate compares committed history, so it can only go green post-commit).

## Invariants (must survive any edit to this file)

- **Never touch prop tables or anything Storybook Autodocs / react-docgen owns.** Component prop documentation is generated deterministically; this moment covers only the hand-written `docs/NN-*.md` reference site.
- **Rewriting never runs in CI.** `docs-check.yml` detects; this developer-triggered moment rewrites. If asked to automate the rewrite, push back per the continuous-loop rule in CLAUDE.md.
- **No MCP, no live API calls.** Everything needed is in the repo and its git history.
- **Rewrite only what drifted.** A stale flag is not a license to rewrite the page.

## Output

```
## Docs synced
[doc] — [sections rewritten] — driven by [source(s) + what changed]

## Clock-only (no prose change, commit resets the gate)
[doc] — [source that flagged it] — why the doc is still accurate

## Sources frontmatter changes
[doc]: added/removed [pattern]
```

## Success signal

`npm run docs:check` passes on the branch after the commit. Every rewritten claim traces to a source diff. PR is open against `main`.
