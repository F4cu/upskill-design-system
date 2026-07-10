---
status: active
created: 2026-07-10
completed:
---

# CI / automation audit — optimization plan

> **2026-07-10 — all five items executed as PRs, pending merge:**
> item 1 → #57 · item 3 → #58 · item 2 → #59 · item 4 → #60 · item 5 → #61.
> Merge order: #61 **last** (docs/07 sources include workflows the others change).
> Item 2 decision: default `GITHUB_TOKEN` (`contents: write`), no PAT — main is
> unprotected and GITHUB_TOKEN pushes can't trigger workflows, so no loop.
> After #60 merges: Settings → Pages → Source = "GitHub Actions" (one-time).
> Known pre-existing failure: docs-check is red on `main` (docs/06 + docs/08
> stale vs scripts/sense.js) — shows on all five PRs; needs `/docs-sync`.

Audit of the four workflows, 34 npm scripts, and 11 commands (2026-07-10). Guiding principle from the charter: recurring work is scripts + Actions; agents only where a script can't do it; **not everything gates every PR** — pick the cheapest surface that catches the mistake.

## Current state (facts the plan rests on)

- 4 workflows: `components-check`, `tokens-check`, `docs-check`, `sync-tokens`. No `cancel-in-progress` anywhere; the check workflows trigger on both `push: main` and `pull_request` (double runs). `tokens:build` executes up to 3× per token PR (components-check, tokens-check, base-ref rebuild).
- CI gates today: metadata, typecheck, component build, a11y coverage/test, patterns staleness, token build, contrast, token-diff PR comment, docs staleness, CLAUDE.md budget.
- **Not gated anywhere:** `lint` (Tier-1 jsx-a11y!), `layout:validate`, showcase build/typecheck, staleness of `component-pipeline.json`, `token-usage.json`, `airtable-governance.json`, `handoff/index.json`, `component-signoff.json`.
- Command gaps: `/tokens-author` never runs `tokens:contrast-check` or refreshes `token-usage.json`; `/token-deprecation-pass` edits component CSS with no `typecheck`/`build`/`metadata:validate`/contrast gate; standalone `/component-scaffold` runs no deterministic gate.
- ROADMAP open items: scheduled `airtable-pull` Action (:66), showcase Pages deploy (:143), docs Pages (:172), showcase in root build chain (:142), token changelog on release (:67 — defer, no release cadence).

## Plan

### 1. Workflow hygiene (one PR, ~30 min) — do first
- [ ] Add `concurrency: { group: <wf>-${{ github.ref }}, cancel-in-progress: true }` to `components-check`, `tokens-check`, `docs-check`.
- [ ] Drop the `push: main` trigger from the three check workflows — PRs already gate everything that reaches `main`; halves run count. Keep `sync-tokens` on push (it's the post-merge sync, correctly non-cancelling).
- [ ] `tokens-check` base build: `npm ci` instead of `npm install` for the base ref, reuse the npm cache.
- [ ] Add `lint` to `components-check` (cheap; closes the Tier-1 a11y CI hole).

### 2. Snapshot sync — script automation, not PR gates (one PR)
Principle: derived files that only change as a *consequence* of a merge should be auto-regenerated and committed by the post-merge Action, not policed on every PR.
- [ ] Extend `sync-tokens.yml` (rename → `sync.yml`): after `sense.js`, also run `tokens:usage`, then auto-commit `component-pipeline.json`, `STATUS_QUO.md`, `token-usage.json` back to `main` if changed (`[skip ci]`). Kills the "stale committed pipeline JSON breaks showcase build" failure mode with zero PR cost.
- [ ] New `airtable-pull.yml`: weekly cron + `workflow_dispatch`, runs `airtable-pull.js`, auto-commits `airtable-governance.json` + `component-signoff.json` if changed (ROADMAP :66).
- [ ] Do **not** add PR staleness gates for these — `patterns:generate` staleness (already gated) is the only one where a stale file corrupts agent output on a PR. `figma-variables.json` stays interactive-only (Enterprise-gated API). `handoff:tidy` stays manual; add it as a step in `/extract-learnings` close-out instead of CI.

### 3. Command ↔ script coverage (one PR, command-file edits only)
- [ ] `/tokens-author`: after `tokens:build`, add `tokens:contrast-check`; after adding/renaming tokens, add `tokens:usage && sense`.
- [ ] `/token-deprecation-pass`: add `tokens:contrast-check && metadata:validate && typecheck && npm run build -w @upskill/components` before opening the migration PR.
- [ ] `/component-scaffold`: add the standard deterministic gate (`metadata:validate && typecheck && build && a11y:coverage && a11y:test`) to its success criteria for standalone runs.
- [ ] `/figma-variable-audit`: note to run `tokens:contrast-check` when accepted drift touches color.

### 4. Showcase CI + Pages deploy (one PR, pairs with ROADMAP Phase 11)
- [ ] New `showcase-check.yml` on `pull_request` paths `apps/showcase/**` + `packages/**`: `npm ci`, `tokens:build`, showcase `build` (its `prebuild` copies pipeline data — catches the stale-input error). Include `layout:validate` over `apps/showcase/src/pages/**` here (layouts live in showcase; no separate workflow).
- [ ] `deploy-showcase.yml` off `main`: Vite base path + 404.html SPA fallback → GitHub Pages (ROADMAP :143, memory decision already made).

### 5. Script tidy (small PR, optional)
- [ ] Remove or comment-mark orphans: `component:check`, `component:refresh`, `tokens:diff` (npm form), `storybook:build`; keep `harness:*` + `airtable:setup` with a "one-time" note. Update `docs/07-npm-scripts-reference.md`.
- [ ] `docs-check.yml`: call `npm run docs:check` / `claudemd:check` instead of bare `node scripts/...` so the npm script is the single entry point.

## Deliberately not doing
- Composite/reusable action for checkout+setup-node — 4 workflows, solo maintainer; duplication is cheaper than indirection.
- PR-blocking staleness gates for every frozen snapshot — post-merge auto-commit (item 2) is the economic fix.
- Token changelog on release, component version sync — no release cadence yet (ROADMAP defers both).
- Removing the `package.json`/lock trigger from `components-check` — a dep bump *should* rerun the full gate.

## Order & effort
1 → 3 are independent quick wins (each < 1 session). 2 needs a PAT-or-`GITHUB_TOKEN`-push decision for auto-commits to `main`. 4 is the largest (deploy config + base path). Suggested order: 1, 3, 2, 4, 5.

## Model per PR (Pro usage-window economics)
| PR | Model | Why |
|---|---|---|
| 1 Workflow hygiene | Sonnet 5 | Mechanical YAML, but concurrency/trigger semantics (`github.ref` vs `head_ref` grouping) warrant more than Haiku |
| 2 Snapshot sync + airtable-pull cron | Fable 5 / Opus 4.8 | Hardest: `GITHUB_TOKEN` vs PAT, `[skip ci]` loop prevention, commit-only-if-changed — wrong choices fail silently or loop |
| 3 Command-file edits | Sonnet 5 | Prose edits with placement judgment; handoff is the spec |
| 4 Showcase CI + Pages deploy | Fable 5 / Opus 4.8 | Iterative deploy debugging (base path, SPA fallback, Pages permissions) — weaker models burn more retrying |
| 5 Script tidy | Haiku 4.5 | Pure mechanical cleanup |

Batching tip: 1 + 3 + 5 together in one Sonnet session likely costs less than PR 2 alone; save the Fable/Opus window for 2 and 4.
