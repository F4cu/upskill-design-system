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
| 1 | ADR-001 amendment; `accessibility` joins the spec; `states`/`tokens`/`accessibility` leave metadata for components that have a spec (Button, CardVertical), readers go through `readComponentMetadata` in `scripts/lib.js`. **Transitional:** the other 25 keep the sections in metadata until step 4. Done on `claude/component-migration-spec-y7yebe`; see the ADR-001 and ADR-027 amendments of 2026-10-11. | `claude/component-migration-spec-y7yebe` | done 2026-10-11, not yet merged |
| 2 | `/component-scaffold` writes `<Name>.spec.json` right after the approved API proposal, before any code; metadata omits the three builder sections; `spec:validate` joins the scaffold, add-component and review-component gates; `/review-component` reads the spec. Done on `claude/component-migration-spec-y7yebe`; not exercised on a real new component yet. | `claude/component-migration-spec-y7yebe` | done 2026-10-11, not yet merged |
| 3 | `npm run spec:generate -- <Name>` drafts `props`, anatomy, states, `styles` and `accessibility` from the code; TODOs for what code cannot say; `spec:validate` fails on any TODO; shared TypeScript reader in `scripts/spec-props.js`. Measured against the pilots in the ADR-027 amendment of 2026-10-11. | `claude/component-migration-spec-y7yebe` | done 2026-10-11, not yet merged |
| 4 | All 27 components have a spec; `spec:validate` requires it; metadata schema drops `states`/`tokens`/`accessibility`; `metadata:derive-tokens` deleted; `spec:validate` accepts TSX template token reads. Done on `claude/component-migration-spec-y7yebe`. ADR-001 and ADR-027 amendments of 2026-10-11 record the details. | `claude/component-migration-spec-y7yebe` | done 2026-10-11, not yet merged |
| 5 | Correct the ADR-026 known-gaps line about Button `shape` (icon-only is a separate Figma set, `Button icon`, `54:1192`). Decide the pilot findings below. | `docs/adr-026-button-shape` | todo |

Step 1 could not remove the sections from all 27 metadata files, because that needs 27 specs (step 4). So it was made transitional: a spec owns the sections when it exists, metadata otherwise, and `validate-metadata.js` enforces whichever applies. Step 4 must also drop the required-until-spec rule and take the three sections out of `component.schema.json`. Steps 1 and 3 were independent. Step 4 needs step 3. Step 2 is small once step 1 lands, because it only changes where the proposal is written.

## Open items from step 4

- **Constraints are empty for 25 components** (only Button and CardVertical have any). The rules are still prose in `usage.antiPatterns`; promoting them to `constraints` with an `enforcedBy` is its own pass.
- **Six raw values to migrate to tokens:** `font-weight: 600` (AppHeader NavLabel, Breadcrumb Label, DropdownMenu Item), `4px` (ProgressBar), `3rem` (VideoFrame PlayIcon, width and height). Pure CSS Module edits; each spec literal's `reason` then goes.
- **Other findings:** AppHeader hamburger has no click handler; Checkbox border is 1.5px (others 1px); no shadow, z-index, opacity, border-width or aspect-ratio token scales exist.
- **`figma` is empty for 25 specs** and Figma property names follow the ADR-026 casing rule rather than a read-back. A figma-cli read-back pass would fill `figma.sets` and verify the property names.
- **Harness tooling.** `scripts/pattern-accuracy-harness` scores a model's emitted metadata against the *current* `component.schema.json` and still checks `data.tokens` (`score.js`); a task that tells the model to emit `tokens` or `states` now fails the schema, so its old results are no longer comparable with a new run. `scripts/harness-ablation` calls the repo's own npm scripts and is not affected by the schema change, but its Arm 2 now writes a spec, and `prepare.js` redacts the target's spec, so the target has none for `spec:validate`'s new required-spec check; the scorer only runs `metadata:validate`, so nothing fails today. Decide before the next run whether to freeze the old schema copy for those tasks or rewrite the tasks.
- **docs:check is still red** (see steps 1-2 items) and now also lists `docs/07-cli-reference.md`, which names the deleted `metadata:derive-tokens`. `/docs-sync` is the fix.

## Open items from step 3

- **Step 4 plan:** run `spec:generate` per component, fill the TODOs, move on. Start with single-element components (Badge, Divider, Avatar, ProgressBar, Chip, TextLink); the compound ones (Accordion, AppHeader, CardHorizontal, Select, TextField, Checkbox, DropdownMenu, Breadcrumb) will need hand placement of the selectors it flags.
- Writing the real spec file strips `states`/`tokens`/`accessibility` from metadata for you. The draft's state `kind` is a name-based guess; check every `notes` that starts with TODO.
- Not derivable, so budget human time for it: part roles, Figma properties and sets, constraints, why a literal is raw, `native` props the contract depends on.
- `postcss` is now a declared root devDependency (it was only transitive via Vite); the lockfile root entry was edited by hand to match.

## Open items from steps 1-2

- **`npm run docs:check` is red** (9 pages: 00, 02, 03, 05, 06, 08, 09, 10, 11), because the step 1 commit changed their sources. Run `/docs-sync` for a rewrite PR; do not reset the clocks with empty edits. Page 10 (machine-readable metadata) and 02 (lifecycle) describe `states`/`tokens`/`accessibility` in metadata and need real rewrites.
- **First real use of the spec-first scaffold is the test.** The first `/add-component` run after merge will show whether writing `styles` before the CSS exists is workable or whether the generator (step 3) has to pre-fill them. Note what you had to amend in the spec after building.
- **Ablation tooling:** `scripts/harness-ablation` Arm 2 now writes a spec for the target; its `prepare.js`/`score.js` redact and score metadata only, so check before the next ablation run.

## Open pilot findings (reported by ADR-027, none fixed)

- Button has no focus style and no focus token; the browser default ring applies (ADR-028 may already cover this: check first).
- The `1px` border width is a literal in 15 CSS Modules; no border-width token exists.
- Button's icon-only rule (`shape` requires `icon` and `aria-label`) is not type-enforced; it sits in the validator backlog.
- `metadata.tokens` omitted tokens the CSS reads and listed some it never read (#117). Resolved for Button and CardVertical in step 1 (their list is derived from the spec); the other 25 are covered by `validate-metadata.js` until step 4.
- CardVertical `Root` has raw `min-width: 220px` / `160px`; needs a size primitive plus a device alias (`/tokens-author`).
- No opacity or z-index token scale exists; the spec records the literals with reasons.

## Decisions to make before starting

- **Where a new component's spec skeleton comes from (step 2).** Not decided in the repo. Proposal: `component.spec.schema.json` plus Button or CardVertical as the template, with the Figma design context feeding anatomy and props, then the step-3 generator pre-filling `props` and `styles` from code after the first build. Confirm or change.
- ~~Do spec `states` replace metadata `states`?~~ Settled in step 1: yes, for components with a spec. Nothing in `/layout-generation` or the pattern schema reads `states`.
- **Keep the harness Arm C in the loop?** Re-run the pattern-accuracy harness after step 1 to confirm scaffolding does not regress with the smaller metadata (the original accept bar: Arm C median not worse than Arm A on each task).

## Pitfalls

- Never inject `component-patterns.json` into scaffolds (ADR-013); the spec is a separate reader path and `/layout-generation` must never read it.
- `spec:validate` needs built tokens, so run `npm run tokens:build` first (CI does).
- The harness-ablation eval's `prepare.js` keeps and strips specs like metadata and redacts the target's own spec; update it if the spec's shape changes in step 1.
- Run `npm run handoff:tidy` after marking this handoff `done` so the index and ledger regenerate.
