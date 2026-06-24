---
description: Back-fill component metadata with learnings from review sessions — reads .review.json and .run.json handoff files, classifies each finding by the metadata section it belongs to (accessibility, composition, usage), drafts targeted amendments, gates on validate:metadata, and opens a PR. Agentic Moment #7.
---

# Post-review retro

**Trigger:** Developer, after a component PR merges or after any session that fixes issues in an existing component. Run once per component when there are unprocessed handoff files, or as a batch pass.

**Invocation:**
- `/post-review-retro <Name>` — single component (e.g. `/post-review-retro Accordion`)
- `/post-review-retro --all` — all components that have a `.review.json` handoff file

**Purpose:** Fixes land in code but their learnings often don't land in metadata. This moment closes that gap. The adversarial reviewer in `/add-component` Stage 3 catches things the deterministic gate cannot — wrong ARIA contracts, incomplete keyboard coverage, DOM structure constraints, composition mistakes. Those findings belong in the component's metadata so future scaffolds and layout generation don't repeat the same mistakes. This is not just about usage antiPatterns: accessibility contracts, keyboard interactions, focus behavior, and composition constraints are all valid targets.

## Inputs (read all before starting — no live API calls)

For each component being processed:
- `.claude/handoff/<Name>.review.json` — structured findings from the adversarial review (severity, issue, fix per entry)
- `.claude/handoff/<Name>.run.json` — `reviewerCaughtBeyondGate[]` and `manualRescues[]` (what scripts couldn't catch)
- `packages/components/src/components/<Name>/<Name>.metadata.json` — current metadata to amend
- `packages/components/component.schema.json` — schema (to validate amendments and know which fields exist)

## Steps

### 1. Collect findings

For each component:
- Read `.review.json`: collect all `codeReview[]` and `a11y[]` findings.
- Read `.run.json`: collect all `reviewerCaughtBeyondGate[]` and `manualRescues[]` items.
- Read current `<Name>.metadata.json`.

Combine into a working set of findings for this component.

### 2. Classify each finding

For each finding, determine which metadata section it belongs to. Apply this routing — use the **first** section that fits:

| Finding type | Target |
|---|---|
| ARIA attribute wrong, incomplete, or missing a constraint | `accessibility.ariaAttributes` — amend the relevant attribute's description |
| Keyboard interaction undeclared or incomplete | `accessibility.keyboardInteractions` — add the missing entry |
| Focus behavior undeclared | `accessibility.focusManagement` — amend or add |
| DOM structure constraint (e.g. always render, use hidden not conditional render) | `usage.antiPatterns` — scenario written from the implementor's perspective |
| Child type or nesting constraint the metadata missed | `composition.accepts` — correct or extend |
| Parent constraint missing | `composition.containedBy` — correct or extend |
| Layout or structural behavior constraint | `composition.layoutBehavior` — amend |
| Consumer misuse or footgun (wrong prop combination, wrong component for the job) | `usage.antiPatterns` — scenario written from the consumer's perspective |

Skip a finding if:
- It is a one-off code bug with no generalizable lesson (e.g. a typo, an HTML entity error)
- The lesson is already captured in the current metadata (check before drafting — avoid duplicates)

Note skipped findings as "no metadata target" in the PR description with a one-line reason.

### 3. Draft amendments

Write the smallest amendment that captures the lesson. Match the field's existing format exactly — check sibling entries before drafting.

**`usage.antiPatterns` entry:**
```json
{
  "scenario": "<Concrete situation a developer or agent would encounter>",
  "reason": "<Why it breaks — ARIA contract, AT behavior, layout, etc.>",
  "alternative": "<The correct approach with enough specificity to act on>"
}
```

**`accessibility.ariaAttributes` amendment:**
Add or extend the description of the relevant attribute entry to capture the constraint (e.g. "The target element referenced by aria-controls must always be present in the DOM — use the hidden attribute rather than conditional rendering").

**`accessibility.keyboardInteractions` entry:**
Add the missing `{ "key": "...", "action": "..." }` following the format of existing entries.

**`composition.accepts` / `containedBy` / `layoutBehavior`:**
Extend or correct the existing value. If the field is a string, append. If it is an array, add the missing entry.

Do **not** invent fields that don't exist in the schema. If a finding genuinely needs a new schema field, note it in the PR description as a future schema amendment — do not add it here.

### 4. Cross-component escalation (`--all` only)

After classifying findings for all components: scan for the same pattern appearing in 2+ components. If found:
- Flag it in the PR description as a **system-level escalation candidate**
- Draft the proposed addition to CLAUDE.md's "Component implementation rules" section
- Include the proposed text in the PR description but do **not** write it to CLAUDE.md — ask the developer to confirm in a follow-up

### 5. Gate

Run `npm run validate:metadata`. If it fails, fix the amendment that broke validation and re-run. Do not open the PR until the gate passes.

### 6. PR

Create a branch `retro/<kebab-name-or-date>` (e.g. `retro/accordion` or `retro/2026-06-24`) and open a PR against `main` with `gh`. Use this body structure:

```markdown
## Retro: <Name(s)> — <date>

Learnings from review sessions back-filled into component metadata.
Each amendment is traced to a specific finding — no speculative additions.

---

### <ComponentName>

**`<section amended>`**
- Finding: <one-sentence summary of what was wrong or missing>
- Amendment: <what was added or corrected>

**`<next section>`**
- Finding: ...
- Amendment: ...

**No metadata target (skipped)**
- <one-sentence finding> — <reason for skipping>

---

### Cross-component escalation (--all only)
The following pattern appeared in [Component A] and [Component B].
Proposed CLAUDE.md addition to "Component implementation rules" — confirm to apply:

> [Proposed rule text]
```

## What this does NOT do

- Does not change component source code (`index.tsx`, CSS, tests) — metadata JSON only.
- Does not write to CLAUDE.md without explicit developer confirmation.
- Does not add fields absent from the schema.
- Does not re-process findings already captured in the current metadata.

## Success signal

`validate:metadata` passes. Every amendment in the PR traces back to a specific finding from `.review.json` or `.run.json`. Future `/add-component` runs for similar components scaffold with the corrected contracts — the same mistakes do not appear in Stage 3 findings again.
