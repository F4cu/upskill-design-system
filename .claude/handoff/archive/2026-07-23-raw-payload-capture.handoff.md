---
status: done
created: 2026-07-23
completed: 2026-07-23
---

# One-time raw-payload capture: turn the snapshot-savings estimate into a measured ratio

## Goal

`docs/case-study-source/08-measured-impact.md` currently tags the frozen-snapshot savings multiplier as **estimated** ("plausibly 5–15×") — it is the only assumed figure in the case study's central claim. This run captures the raw payload sizes once, computes the measured ratio, and updates 08 accordingly. One-off measurement, not a harness: no new scripts committed, no CI, nothing recurring.

## Part A — Airtable (primary; do this even if Part B is skipped)

1. Env: `AIRTABLE_API_KEY` via `scripts/load-env.js` (`.env`); base/table identity in `scripts/airtable-ids.js` (base `appBfY2arkReKQNit`; tables `Primitive tokens`, `Semantic tokens`).
2. Fetch **all records, all fields** (no `fields[]` filter) from both tables — same pagination as `airtableListAllPages` in `scripts/lib.js`. Write raw JSON responses to the session scratchpad (never commit them).
   One-liner shape: `node -e` script importing `./scripts/load-env.js` + `./scripts/airtable-ids.js`, fetching each page of `airtableTableUrl(name)` with `Authorization: Bearer`, concatenating `records`, writing to scratch.
3. Record: total raw bytes (both tables combined), record count, and the byte size of the committed `packages/tokens/airtable-governance.json` **re-measured at run time** (was 977 bytes on 2026-07-23).
4. Compute ratio = raw bytes ÷ governance-file bytes. Also note tokens ≈ bytes ÷ 4 for both, to match 08's convention.

## Part B — Figma (secondary; only if a `/figma-variable-audit` is happening anyway)

The Figma side is *not* a raw-vs-snapshot ratio — `packages/tokens/figma-variables.json` is itself a captured MCP read. The measurable facts are:
- Raw MCP response size (the variable read before any cleaning/normalizing) vs the committed file size — record both if the audit's capture step prunes anything.
- Avoided-refetch count: number of commands consuming the frozen file (2 as of 2026-07-23: `add-component`, `figma-variable-audit`) — each subsequent consumption avoids one full re-read.
Do not run a Figma MCP read solely for this measurement; piggyback on the next audit. If skipped, Part A alone completes this handoff — update 08's Figma sentence only if new numbers exist.

## Part C — Update the case study

In `docs/case-study-source/08-measured-impact.md`:
1. "Frozen snapshots" section: replace "plausibly 5–15× (estimated — no raw pull has been captured for comparison; see gaps)" with the measured ratio, dated, tagged measured, with one line of method (all-fields REST pull, both tables, raw bytes ÷ committed bytes).
2. "What is not measured" item 1: mark resolved with the date and the number (keep the item — a resolved gap on the record is the point), renumbering nothing.
3. If the ratio lands outside 5–15×, also fix the same "5–15×" mention in the Airtable row context and anywhere else it appears (grep `5–15`).
4. `docs/case-study-source/04-benefits-by-audience.md` and `02-automation-vs-agents.md` cite 08 without repeating the multiplier — verify with a grep for `5–15` that no other file carries the stale estimate.
5. Run `npm run docs:check` (should be unaffected — case-study-source is not a checked docs page, but verify).

## Acceptance

- Raw payloads captured to scratch only; nothing raw committed.
- 08 carries a dated, measured ratio with method; no remaining `[E]` tag on the snapshot multiplier; no stale `5–15×` anywhere in `docs/case-study-source/`.
- This handoff's frontmatter set to `status: done` + `completed:` date; then `npm run handoff:tidy`.

## Context for the runner

Background: the 2026-07-23 session that produced `08-measured-impact.md` (quantified-impact pass over case-study-source). The estimate being replaced was reasoned from `scripts/airtable-pull.js` keeping only 4 governance fields (`Status/Owner/Successor/Notes`) of records that have a `Status`, vs full records with every column plus Airtable's envelope (`id`, `createdTime`). Expectation: the measured ratio likely exceeds 15× — report whatever it is, including if it's lower.
