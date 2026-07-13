---
description: Turn review findings into permanent system knowledge — reads .review.json handoff files, routes each finding to its durable home (component metadata sections, the /tokens-author conventions, or the curated contrast-pair list), drafts amendments, gates on metadata:validate, and opens a PR. Run after /review-component, after any session that fixes issues in an existing component, or after a layout session that surfaced a composition or token mistake.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Extract learnings

**Trigger:** Developer, after a component review has been run (via `/review-component` or the `/add-component` loop) and fixes have been applied to the code — or after a `/layout-generation` session that surfaced a composition or token mistake worth keeping. Run once per component, or as a `--all` batch pass.

**Path scope:** this step belongs to the **`full`** review path only. **`standard`**-path reviews (`/code-review` on the diff) write no `.review.json`, and the review checklist renders their learnings item as `n/a` — do not manufacture findings for them.

**Invocation:**
- `/extract-learnings <Name>` — single component (e.g. `/extract-learnings Accordion`)
- `/extract-learnings --all` — all components that have an unprocessed `.review.json` handoff file

---

## What this does and why it exists

When a review catches a mistake — a wrong ARIA contract, a missing keyboard interaction, a DOM structure constraint, a usage footgun — that mistake gets fixed in the component's source code. But the fix lives only in the code. The next time a similar component is scaffolded or a layout is generated, the system has no memory of what went wrong: the same mistake can appear again.

**Component metadata** (the `.metadata.json` file co-located with each component) is the system's permanent, machine-readable spec for that component. It drives three things:
- **Scaffolding** — `/add-component` and `/component-scaffold` read the metadata to generate new components correctly
- **Layout generation** — `/layout-generation` reads `composition.accepts`, `composition.containedBy`, and `usage.patterns` to build valid component trees
- **Future reviews** — `/review-component` reads the `accessibility` block to judge whether the ARIA contract and keyboard interactions are correctly implemented

Back-filling a learning into the metadata means: the next scaffold, the next layout, and the next review all know about it. The fix becomes a guardrail, not just a one-time correction.

**This command is the second step of a two-step loop:**
1. `/review-component <Name>` — finds problems, writes structured findings to `.claude/handoff/runs/<Name>.review.json`
2. `/extract-learnings <Name>` — reads those findings, routes each to the right metadata section, opens a PR

Running only step 1 fixes the code. Running both steps fixes the system.

---

## What "routing to the right target" means

Not every finding is the same kind of lesson. A finding about a wrong ARIA attribute belongs in `accessibility.ariaAttributes` — not in `usage.antiPatterns`. Putting it in the wrong place means the right consumer (scaffolding, layout generation, or a future reviewer) won't see it. The routing table:

| Finding type | Target |
|---|---|
| ARIA attribute wrong, missing, or missing a constraint | `accessibility.ariaAttributes` — amend the attribute's description |
| Keyboard interaction undeclared or incomplete | `accessibility.keyboardInteractions` — add the missing entry |
| Focus behavior undeclared | `accessibility.notes` — append the constraint |
| DOM structure constraint (e.g. always render with hidden, never unmount) | `usage.antiPatterns` — scenario written from the implementor's perspective |
| Child type or nesting constraint the metadata missed | `composition.accepts` — correct or extend |
| Parent container constraint missing | `composition.containedBy` — correct or extend |
| Consumer misuse or wrong prop combination | `usage.antiPatterns` — scenario written from the consumer's perspective |
| Layout/composition mistake tied to one component (wrong prop mapping from Figma, missed sub-element, undesigned wrapper around it) | The composed component's `usage.antiPatterns` (mistake) or `usage.patterns` (correct shape worth naming). **Metadata first** — only genuinely cross-component grammar, true regardless of which component is composed, may go into `/layout-generation`'s "Recurring patterns" section, and only with developer confirmation. |
| Wrong token pick, scale-mixing, or a token convention the code violated | `/tokens-author` → "Conventions" section — append the rule |
| Contrast miss: a foreground/background combination a component actually renders that `tokens:contrast-check` didn't cover | Add the pair to `PAIRS` in `scripts/token-contrast-check.js` (use the `T`/`I`/`B`/`BG` helpers, match neighboring entries), then run `npm run tokens:contrast-check` |

**Scope guard:** this loop is about component, layout, and token *contracts*. Process or tooling mistakes (a wrong npm script, a git workflow slip, a CI quirk) have no target here — skip them with a one-line reason, do not invent a home for them.

---

## Inputs (read all before starting — no live API calls)

For each component being processed:
- `.claude/handoff/runs/<Name>.review.json` — structured findings from the adversarial review (severity, issue, fix per entry); written by `/review-component`
- `.claude/handoff/runs/<Name>.run.json` — `reviewerCaughtBeyondGate[]` and `manualRescues[]` (what scripts couldn't catch); written by `/add-component`
- `packages/components/src/components/<Name>/<Name>.metadata.json` — the current metadata to amend
- `packages/components/component.schema.json` — schema (to validate amendments and know which fields exist)

Read only when a finding routes there:
- `.claude/commands/tokens-author.md` — the "Conventions" section, for token-convention findings
- `scripts/token-contrast-check.js` — the `PAIRS` list, for contrast-miss findings
- `.claude/commands/layout-generation.md` + `.claude/component-patterns.json` — for the `--all` consolidation step only

## Steps

### 1. Collect findings

For each component:
- Read `.review.json`: collect all `codeReview[]` and `a11y[]` findings.
- Read `.run.json` if present: collect `reviewerCaughtBeyondGate[]` and `manualRescues[]`.
- Read current `<Name>.metadata.json`.

### 2. Classify and route

Apply the routing table above. Skip a finding if:
- It is a one-off code bug with no generalizable lesson (e.g. a typo, a missing import)
- The lesson is already captured in the current metadata — check before drafting to avoid duplicates

Note skipped findings as "no metadata target" in the PR description with a one-line reason.

### 3. Draft amendments

Write the smallest amendment that captures the lesson. Match the existing format of sibling entries exactly.

**`usage.antiPatterns` entry:**
```json
{
  "scenario": "<Concrete situation a developer or agent would encounter>",
  "reason": "<Why it breaks — ARIA contract, AT behavior, layout, etc.>",
  "alternative": "<The correct approach, specific enough to act on>"
}
```

**`accessibility.ariaAttributes` entry:** extend the relevant string to capture the constraint (e.g. "— the target element must always be present in the DOM").

**`accessibility.keyboardInteractions` entry:** add `{ "key": "...", "action": "..." }` matching existing entry format.

**`composition` fields:** extend or correct the existing value — string fields append, array fields add the missing entry.

**`/tokens-author` Conventions entry:** one bullet in the existing list style, stating the rule and the mistake it prevents.

**Contrast pair:** one tuple added to `PAIRS` in `scripts/token-contrast-check.js`, using the file's `T`/`I`/`B`/`BG` helpers and placed next to related pairs. Never add a waiver here — if the new pair fails, that's a real finding for the developer, not something this command resolves.

Do not invent fields absent from the schema. If a finding needs a new schema field, note it in the PR description as a future amendment — do not add it here.

### 4. Cross-component escalation (`--all` only)

After classifying all findings: scan for the same pattern in 2+ components. If found:
- Flag it in the PR description as a system-level escalation candidate
- Draft a proposed addition to CLAUDE.md's "Component implementation rules" section
- Include the proposed text in the PR description but do not write it to CLAUDE.md without explicit developer confirmation

### 5. Pattern-section consolidation (`--all` only)

`/layout-generation`'s "Recurring patterns" section accretes learnings by hand and rots if nothing prunes it. In `--all` mode, after routing:
- Read that section and compare each entry against current component metadata (`usage.patterns`/`usage.antiPatterns`) and `.claude/component-patterns.json`.
- Flag entries that are now duplicated there, are app-specific trivia rather than cross-component grammar (e.g. a specific asset path, a one-page workaround), or contradict what metadata now says.
- List each flagged entry in the PR description with a proposed disposition: **prune** (covered elsewhere), **move** (belongs in one component's metadata — draft that amendment), or **keep** (genuinely cross-component).
- Same rule as the CLAUDE.md escalation: do not edit `layout-generation.md` without explicit developer confirmation. The PR carries the proposal; the developer's reply authorizes the edit.

### 6. Gate

Run `npm run metadata:validate`. If it fails, fix the offending amendment and re-run. If `PAIRS` in `scripts/token-contrast-check.js` was touched, `npm run tokens:contrast-check` must also pass. Do not open the PR until the gates pass.

### 7. Done marker

After the gate passes and before opening the PR, write `.claude/handoff/runs/<Name>.learnings.json` for each processed component:
```json
{
  "component": "<Name>",
  "processedAt": "<iso>",
  "amendedSections": ["<section>"],
  "skipped": 0
}
```
This file is the signal that `npm run sense` uses to remove the component from the pending extract-learnings backlog. Write it even if all findings were skipped (no metadata amendments needed) — the absence of the file means unprocessed, not "nothing to do."

### 8. PR

Create a branch `extract-learnings/<kebab-name>` (e.g. `extract-learnings/accordion`) and open a PR against `main` with `gh`. Body structure:

```markdown
## Extract learnings: <Name(s)> — <date>

Back-filling review findings into component metadata.
Each amendment traces to a specific finding — no speculative additions.

---

### <ComponentName>

**`<section amended>`**
- Finding: <one-sentence summary>
- Amendment: <what was added or corrected and where>

**No metadata target (skipped)**
- <finding> — <reason for skipping>

---

### Cross-component escalation (--all only)
Pattern appeared in [A] and [B]. Proposed CLAUDE.md addition — confirm to apply:
> [Proposed rule text]

### Pattern-section consolidation (--all only)
| /layout-generation entry | Now covered by | Proposed disposition |
|---|---|---|
| [entry name] | [metadata field / component-patterns.json key] | prune / move / keep |

Confirm to apply — layout-generation.md is not edited in this PR.
```

## What this does NOT do

- Does not change component source code — targets are metadata JSON, the `/tokens-author` Conventions section, and the `PAIRS` list in `scripts/token-contrast-check.js` only.
- Does not write to CLAUDE.md or edit `/layout-generation`'s pattern section without explicit developer confirmation — both are proposed in the PR description only.
- Does not add contrast waivers — a failing new pair is a finding for the developer.
- Does not add fields absent from the schema.
- Does not re-process findings already captured in the current metadata.
- Does not widen into process or tooling learnings — component, layout, and token contracts only.

## Close-out

Run `npm run handoff:tidy` — it archives `done`/`superseded` handoffs, regenerates `handoff/index.json`, and promotes each `<Name>.run.json` into the committed run ledger. This is the designated home for tidy (deliberately not CI); extraction is the natural moment because the run artifacts it promotes were just consumed here.

## Success signal

`metadata:validate` passes. Every amendment traces to a specific finding. `handoff:tidy` has run. Future `/add-component` runs for similar components scaffold with the corrected contracts — the same mistakes do not appear in Stage 3 findings again.
