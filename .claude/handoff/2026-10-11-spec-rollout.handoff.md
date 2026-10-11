---
status: active
created: 2026-10-11
completed:
---

# ADR-027 spec rollout: from two pilot specs to every component

**Contract:** ADR-027 (component spec file, accepted 2026-10-08 after the harness arm) on top of the finished ADR-025/026 contract migration (Tiers 1-4, archived in `archive/2026-10-10-component-contract-migration.handoff.md`).

**Why now:** the code, metadata and Figma already follow the ADR-025 state groups and the ADR-026 vocabulary, so there is no coded-component migration left. The open work is the "On acceptance" backlog in ADR-027. Today only `Button.spec.json` and `CardVertical.spec.json` exist (27 components). `/component-scaffold` and `/add-component` do not write specs, so a new component gets no spec, and its approved ADR-026 API proposal lives only in chat.

**Cost of waiting:** until `tokens`, `states` and `accessibility` leave metadata, a builder moment that reads both files carries +31% to +55% more prompt for the two piloted components (ADR-027 amendments).

**PR shape:** one PR per step, in the order below. Each step that changes a contract records a dated ADR amendment. Gate per PR: `npm run metadata:validate && npm run spec:validate && npm run typecheck && npm run build && npm run a11y:coverage && npm run a11y:test`, plus `npm run claudemd:check` when `AGENTS.md`/`CLAUDE.md` change.

## Steps

| # | What | Branch | State |
|---|---|---|---|
| 1 | ADR-001 amendment; move `tokens`, `states`, `accessibility` from metadata into the spec. Migrate `a11y-coverage.js`, `validate-metadata.js` token resolution, `sense-component.js`, Airtable sync. Reverse the ADR-001 `anatomy` exclusion for the spec file. | `refactor/spec-owns-builder-sections` | todo |
| 2 | `/component-scaffold` step 3 writes `<Name>.spec.json` from the approved API proposal before any code; `/add-component` and `/review-component` read it. | `feat/scaffold-writes-spec` | todo |
| 3 | Generator script for `props` and `styles` from the props types and CSS Modules; the agent writes only anatomy roles and constraints. | `feat/spec-generator` | todo |
| 4 | Backfill the other 25 components with the generator; then make the spec required (drop the "optional" carve-out in `scripts/validate-spec.js`). | `chore/spec-backfill` | todo |
| 5 | Correct the ADR-026 known-gaps line about Button `shape` (icon-only is a separate Figma set, `Button icon`, `54:1192`). Decide the pilot findings below. | `docs/adr-026-button-shape` | todo |

Steps 1 and 3 are independent. Step 4 needs step 3. Step 2 is small once step 1 lands, because it only changes where the proposal is written.

## Open pilot findings (reported by ADR-027, none fixed)

- Button has no focus style and no focus token; the browser default ring applies (ADR-028 may already cover this: check first).
- The `1px` border width is a literal in 15 CSS Modules; no border-width token exists.
- Button's icon-only rule (`shape` requires `icon` and `aria-label`) is not type-enforced; it sits in the validator backlog.
- `metadata.tokens` omits tokens the CSS reads (`font.line-height.none`, `border-radius.full`) and lists some it never reads (CardVertical, six tokens). Part of #117; step 1 removes the section from metadata, so resolve it there.
- CardVertical `Root` has raw `min-width: 220px` / `160px`; needs a size primitive plus a device alias (`/tokens-author`).
- No opacity or z-index token scale exists; the spec records the literals with reasons.

## Decisions to make before starting

- **Where a new component's spec skeleton comes from (step 2).** Not decided in the repo. Proposal: `component.spec.schema.json` plus Button or CardVertical as the template, with the Figma design context feeding anatomy and props, then the step-3 generator pre-filling `props` and `styles` from code after the first build. Confirm or change.
- **Do `states` in the spec replace the metadata `states` outright?** `/layout-generation` reads all metadata on every run, so check whether it uses `states` before removing them; ADR-027 says it reads only `usage`, `variants` and `composition`.
- **Keep the harness Arm C in the loop?** Re-run the pattern-accuracy harness after step 1 to confirm scaffolding does not regress with the smaller metadata (the original accept bar: Arm C median not worse than Arm A on each task).

## Pitfalls

- Never inject `component-patterns.json` into scaffolds (ADR-013); the spec is a separate reader path and `/layout-generation` must never read it.
- `spec:validate` needs built tokens, so run `npm run tokens:build` first (CI does).
- The harness-ablation eval's `prepare.js` keeps and strips specs like metadata and redacts the target's own spec; update it if the spec's shape changes in step 1.
- Run `npm run handoff:tidy` after marking this handoff `done` so the index and ledger regenerate.
