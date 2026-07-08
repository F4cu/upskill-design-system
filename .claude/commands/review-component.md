---
description: Review a component's implementation for correctness, accessibility contract (ARIA, keyboard, focus), and coverage gaps — applies findings, opens a PR, and writes .review.json + .run.json for /extract-learnings.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, Agent
---

# Review component

**Trigger:**
- Called by `/add-component` after Stage 2b (visual checkpoint passes) — continues the verified scaffold loop.
- Standalone, after code changes to an existing component that deserve a fresh-context review.

**Invocation:** `/review-component <Name>` (e.g. `/review-component Accordion`)

---

## What this does

Spawns one adversarial reviewer subagent against the component diff, applies every `high`/`medium` finding in the main session, re-runs the deterministic gate, then opens a PR. Produces `.claude/handoff/runs/<Name>.review.json` — the structured findings file that `/extract-learnings` reads to back-fill metadata.

## Binding rules

- **One subagent, no more.** The reviewer gets fresh context — it has never seen the scaffold or any earlier session reasoning. No parallel agents.
- **Gate must pass before PR.** Apply fixes → re-run gate → only then open PR.
- **Reviewer reports only.** The subagent returns findings and its verdict; it cannot edit or write files — its agent definition (`.claude/agents/adversarial-reviewer.md`) grants only Read/Grep/Glob/Bash. The main session persists the findings to `.review.json`.
- **Frozen handoff.** Pass the snapshot path to the subagent; no live API calls inside the review stage.

---

## Stages

### Stage 1 · Adversarial review (exactly one fresh subagent)

Spawn **one** `adversarial-reviewer` subagent (defined in `.claude/agents/adversarial-reviewer.md`; read-only tool set — Read/Grep/Glob/Bash, no Edit/Write) with fresh context. Pass it only:
- The path to the component folder and the diff (`git diff` of the modified files)
- The snapshot path (`.claude/handoff/runs/<Name>.snapshot.json`)
- The instruction to run and report findings from:
  1. `/code-review` on the diff (correctness + reuse/simplification)
  2. `npm run lint -- packages/components/src/components/<Name>` (ESLint + jsx-a11y Tier-1 static rules)
  3. An a11y read of the component against its metadata `accessibility` block (role, aria, keyboard)
  4. **For interactive components only** (`component.type ∈ {interactive, input}`, an interactive ARIA `role`, or a keyboard contract beyond plain Tab / native browser behaviour) — judge whether `<Name>.a11y.test.tsx` covers the contract: does it assert every `keyboardInteraction` declared in the metadata, the state attribute(s) that toggle (e.g. `aria-expanded`, `aria-pressed`, `aria-selected`), focus movement, and the WAI-ARIA APG pattern's semantics? The gate proves the test passes; the reviewer judges whether it tests the *right things*. Thin or contract-incomplete tests are a `changes-required` a11y finding. Skip entirely for display/landmark components (e.g. `Badge`, `Divider`).

The subagent returns its findings as JSON in its final message; the main session writes that JSON verbatim to `.claude/handoff/runs/<Name>.review.json`:
```json
{
  "component": "<Name>",
  "reviewedAt": "<iso>",
  "lint": { "errors": 0, "warnings": 0, "findings": [] },
  "codeReview": [ { "severity": "high|medium|low", "file": "", "issue": "", "fix": "" } ],
  "a11y": [ { "severity": "", "issue": "", "fix": "" } ],
  "verdict": "clean | changes-required"
}
```
The subagent's final message back to the main session is the findings JSON plus a short summary and the verdict. It **cannot** edit or write files — the main session persists the JSON before moving to Stage 2.

### Stage 2 · Fix + PR (main session)

Read `.claude/handoff/runs/<Name>.review.json`. Apply every `high`/`medium` finding and any lint error; for `low` findings, apply or record why not. Re-run the gate:
```
npm run metadata:validate && npm run typecheck && npm run build && npm run a11y:coverage && npm run a11y:test && npm run patterns:generate
```
If the gate fails after applying fixes, fix the failure and re-run before opening the PR.

`patterns:generate` refreshes `.claude/component-patterns.json` (ADR-013); commit it with the component changes if it changed — `components-check.yml` fails the PR on a stale copy.

**Branch behavior:**
- **From `/add-component`** (new component): create branch `component/<kebab-name>` (e.g. `component/accordion`) off the current base, then commit all component files and open the PR.
- **Standalone** (existing component changes): commit to the current branch. If currently on `main`, warn and offer to create a `component/<kebab-name>-review` branch before committing.

Open a PR against `main` with `gh`. Body summarising: what was reviewed, the gate result, the review verdict, and which findings were applied or recorded as low-priority.

Do **not** commit directly to `main`. Component changes must go through a PR.

### Stage 3 · Per-run log

Append a record to `.claude/handoff/runs/<Name>.run.json`:
```json
{
  "component": "<Name>",
  "ranAt": "<iso>",
  "gate": { "passes": 0, "failures": 0, "failureReasons": [] },
  "contextIsolationHeld": true,
  "reviewerCaughtBeyondGate": ["<finding the script gate could not have caught>"],
  "manualRescues": ["<any stage that needed hand-holding>"],
  "notes": ""
}
```
- `contextIsolationHeld` — did the frozen snapshot suffice, or did a stage need data outside it?
- `reviewerCaughtBeyondGate` — did the adversarial subagent find anything the deterministic gate missed? (If never, the review stage is not earning its cost.)
- `manualRescues` — any stage that needed manual correction.

---

## Success signal

Gate passes, review verdict is `clean` or all findings applied, PR is open, and `.review.json` + `.run.json` are written. The PR contains only gate-cleared, reviewed code.

Running `/extract-learnings <Name>` after the PR merges back-fills the findings into the component's metadata — the learning loop that prevents the same mistakes in future scaffolds.

---

> **After you merge the PR above**, run `/extract-learnings <Name>` to back-fill these findings into the component's metadata. Skipping this leaves the system with no memory of what went wrong — the same mistakes can reappear in future scaffolds.
