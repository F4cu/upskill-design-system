---
status: done
created: 2026-07-14
completed: 2026-07-14
---

# Issue #71 — screenshot-baseline visual regression check

Plan approved-in-spirit on 2026-07-14 (planned on branch `F4cu/issue71`); implementation deferred to a fresh session. Exploration and all naming decisions are settled — do not re-litigate them.

## Context

Visual regression is the one testing tier below industry practice: a CSS Module change to a shared primitive (`Box`) or a device-token change can silently shift many components with nothing in CI noticing. Issue #71 asks for a deterministic script (no agent, no MCP) that snapshots one canonical story per component (light + dark) into committed baselines, diffs fresh screenshots against them, and offers a one-command approval path.

## Naming decisions (settled with the developer)

- **`screenshot:check` / `screenshot:approve`, not `visual:*`.** `visualReview` is a human-led judgment record (JSON contract in `.claude/component-review-state.json`, written by `/add-component` and `/layout-generation`, rendered as checklist item 2 by `sense.js`); a machine-led `visual:check` beside it would blur human vs machine. Also rejected: `baseline:*` (collides with the repo's pervasive "frozen-memory baseline" meaning) and `regression:*` (vaguer). `screenshot:*` is unused and names the mechanism.
- **`driver.mjs` keeps its name.** It is not screenshot-only: subcommands `list`, `shot`, `errors`, `route`; ADR-015 deliberately merged the old `qa-driver.mjs` into it as the single "drive the running app" tool. The new script is a consumer of the same pattern, not a rename.
- **No new lifecycle checklist item.** The four-item `in review` checklist (`reviewChecklist()` in `scripts/sense.js:256`) stores no state beyond `reviewPath`/`learningsBackfilled`/`visualReview`; the screenshot check folds under item 1 ("Automated gate"). Leave item 1's label unchanged while the CI step is advisory (editing sense.js cascades docs-check staleness into `docs/02` and `docs/08`); revisit when promoted to blocking.

## Decided parameters

- Baselines: `packages/components/screenshots/` (committed; 27 components × light+dark = 54 PNGs). Diff images: gitignored `packages/components/screenshots/.diff/`.
- CI: advisory step (`continue-on-error: true`) in `components-check.yml` — ubuntu font rendering differs from local macOS. Escalation path (goes in the ADR): CI-generated baselines, then blocking.
- Deps: `pixelmatch` + `pngjs` as root devDependencies. **Playwright stays no-save/on-demand** (harness-only invariant per run-storybook SKILL.md): the script dynamic-imports it and prints install commands if absent; CI installs it explicitly.

## Implementation steps

1. **`scripts/screenshot.js`** (new, root ESM) — subcommand pattern like `scripts/airtable-sync.js`: `node scripts/screenshot.js check|approve [--component <Name>]`.
   - Enumerate story ids from `${STORYBOOK_URL:-http://localhost:6006}/index.json`: `type === 'story' && id.startsWith('components-') && id.endsWith('--default')` (showcase/layout stories are `layout-examples-*`, excluded naturally). Guard: fail if count ≠ dir count in `packages/components/src/components/` — catches a missing `Default` story.
   - Capture core replicated from `.claude/skills/run-storybook/driver.mjs` (~20 lines, with a cross-reference comment): iframe URL `iframe.html?viewMode=story&id=<id>&globals=theme:dark`, viewport 1440×900, `networkidle` + `#storybook-root > *` + 300 ms settle, full-page shot. **One browser instance for all 54 shots** — do not shell out to driver.mjs (54 `chromium.launch()` calls is too slow). Collect console/page errors; retry a failing shot once.
   - `check`: pixelmatch `threshold: 0.1`, allowed diff-pixel ratio 1 % (`SCREENSHOT_DIFF_RATIO` env override); dimension mismatch = FAIL printing both sizes; per-shot table `story-id | theme | PASS/FAIL/NEW/MISSING | ratio`; diff PNGs to `.diff/`; exit 1 on any FAIL, missing/orphaned baseline, or console error.
   - `approve`: regenerate all (or one component's pair with `--component`), prune orphaned baselines.
   - Assumes a running server (helpful error naming dev-server and static-build options), like driver.mjs.
2. **`package.json`** — `pixelmatch`/`pngjs` devDeps; scripts `"screenshot:check"` / `"screenshot:approve"`.
3. **Generate baselines locally** — Storybook dev server up, `npm run screenshot:approve`, commit the 54 PNGs.
4. **`.gitignore`** — add `packages/components/screenshots/.diff/`.
5. **`.github/workflows/components-check.yml`** — add `scripts/screenshot.js` to `paths:`; append advisory step: install playwright + `npx playwright install chromium --with-deps`, `npm run build:storybook -w @upskill/components`, serve `storybook-static` via `npx http-server -p 6006`, poll `/index.json`, `npm run screenshot:check`, `continue-on-error: true`.
6. **ADR-019** `docs/decisions/019-screenshot-baseline-visual-regression.md` (verified next free number; from `000-template.md`). Context: regressions pass every existing gate invisibly; human `visualReview` covers only in-review moments. Decision: committed baselines of the canonical `--default` story, perceptual diff, pure script, advisory CI, playwright stays on-demand, deliberately not Chromatic. Consequences: PNGs in git history; cross-OS drift keeps it advisory; no new checklist item.
7. **Docs coupling** (docs-check requires same-PR touches): `docs/07-npm-scripts-reference.md` (new scripts); `docs/00-start-here.md` ADR index (ADR-019); `.claude/rules/components.md` ~line 26 — replace "Pending: … visual regression baseline" with the shipped convention; that rules edit makes `docs/08-glossary.md` stale — add a "screenshot baseline" entry disambiguating from both `visualReview` (human-led) and the frozen-memory "baseline" sense.
8. **Incidental fix** — `.claude/skills/run-storybook/SKILL.md`: stale directory name `run-upskill-design-system` → `run-storybook` (line 10 and the Run block ~71–90).

## Verification

1. Clean tree + dev server → `npm run screenshot:check` → 54 PASS, exit 0.
2. Tweak a padding value in `Button.module.css` → check FAILs `components-button--default` light+dark with diff PNGs written, exit 1; revert → passes.
3. `npm run screenshot:approve -- --component Button` touches exactly 2 PNGs (`git status`); check then passes.
4. Delete/rename one baseline → missing + orphan reported, exit 1.
5. On the PR, read the advisory step's diff ratios to calibrate whether 1 % absorbs ubuntu antialiasing.
6. `npm run docs:check` passes with the step-7 doc touches.

## Risks

- Ubuntu antialiasing may exceed 1 % on text-heavy components → advisory step noisy; tune ratio or move to CI-generated baselines (escalation in ADR).
- Nondeterministic renders (Image, VideoFrame, ProgressBar) despite networkidle + settle → one retry; if persistent, `page.emulateMedia({ reducedMotion: 'reduce' })`.
- Full-page screenshots make any content-height change a dimension FAIL — intended but surprising; both sizes printed.
- ~2–4 min added CI time (playwright download + storybook build); browser caching is a follow-up.
