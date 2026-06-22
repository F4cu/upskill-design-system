---
description: Run the verified component loop (sense → scaffold → deterministic gate → one adversarial reviewer → fix → PR) for a single component. Use to generate a new component from the fixed set with built-in verification, instead of the single-shot /component-scaffold. Sequential, at most two agents (ADR-007).
---

# Component loop

**Trigger:** Developer, when starting a new component from the fixed set and wanting it verified before it reaches human review.

**Invocation:** `/component-loop <Name>` (e.g. `/component-loop Badge`).

This is the ad-hoc agentic loop of ADR-007 / ROADMAP Phase 9. It wraps the `/component-scaffold` moment in a deterministic gate and one adversarial review pass. It is **sequential and uses at most two agents**: the main session orchestrates every stage; exactly one fresh subagent runs the adversarial review (stage 3), because independent context is the whole point of that stage. **Never** spawn parallel workers — on Claude Pro the scarce resource is the rolling usage window, and a fan-out drains it N× and trips rate limits.

## Binding rules (from ADR-007 — do not violate)

- **Sequential, ≤2 agents.** Main session + one reviewer subagent. No parallel agents, ever.
- **Frozen-file handoffs only.** Each stage reads a committed/cached snapshot — `.claude/STATUS_QUO.md`, `.claude/handoff/<Name>.snapshot.json`, `.claude/handoff/<Name>.review.json`. No stage makes its own live API call; no streaming raw data between stages.
- **Deterministic work stays a script.** Sensing, validation, typecheck, build, lint are `npm`/CLI commands, not agent steps. The agent only does what a script can't (scaffold, judge, fix).
- **Fail-fast.** If the gate fails, bounce back to the scaffold stage with the exact error — do not push forward.
- **No agent code reaches `main` unreviewed.** Generated code must clear the gate *and* the adversarial review before the human PR opens.
- **Fixed set only.** Scaffold nothing outside the component scope declared in CLAUDE.md. Compose existing components instead.

## Stages

### Stage 0 · Sense (script — no AI)
Run `npm run sense:component <Name>`. This writes `.claude/handoff/<Name>.snapshot.json` from the committed frozen-memory files (`governance.json`, `token-usage.json`, `figma-variables.json`) — the frozen context every later stage reads. No live API call.

If the Figma snapshot is reported absent or stale (`figma.snapshot.stale: true`) and the component has a Figma node, tell the developer and offer to refresh via `/figma-variable-audit` before continuing. Do not silently rely on stale drift state.

### Stage 1 · Scaffold (main session)
Read **only** the snapshot from stage 0 plus the metadata schema (`packages/components/component.schema.json`) and the closest existing component as a structural template. Then follow `/component-scaffold` to produce the four files at `packages/components/src/components/<Name>/`:
- `index.tsx`, `<Name>.module.css`, `<Name>.stories.tsx`, `<Name>.metadata.json`

Match the conventions in CLAUDE.md (CSS Modules referencing only `var(--ds-*)`, noun-first naming, story title rule). Pick active tokens — never one listed under `tokens.deprecatedAvoid` in the snapshot. Add the component to `packages/components/src/index.ts`.

### Stage 2 · Gate (script — fail-fast)
Run, in order:
```
npm run validate:metadata && npm run typecheck && npm run build
```
If any step fails, go back to Stage 1, fix the cause the error names, and re-run the gate. Do not proceed until all three pass.

### Stage 3 · Adversarial review (exactly one fresh subagent)
Spawn **one** subagent (`general-purpose`) with fresh context. It must NOT inherit the scaffold's reasoning — give it only:
- the path to the new component folder and the diff (`git diff` of the new files),
- the snapshot path (`.claude/handoff/<Name>.snapshot.json`),
- the instruction to run, and report findings from:
  1. `/code-review` on the diff (correctness + reuse/simplification),
  2. `npm run lint -- packages/components/src/components/<Name>` (ESLint, includes jsx-a11y a11y rules),
  3. an a11y read of the component against its metadata `accessibility` block (role, aria, keyboard).

The subagent writes its findings to `.claude/handoff/<Name>.review.json` as:
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
The subagent reviews and reports only — it does **not** edit files. Its final message back to the main session is a short summary + the verdict.

### Stage 4 · Fix + PR (main session)
Read `.claude/handoff/<Name>.review.json`. Apply every `high`/`medium` finding and any `lint` error; for `low` findings, apply or record why not. Re-run the **Stage 2 gate** after fixing. Then:
- Commit on the current branch (CLAUDE.md git workflow — no new branch unless asked).
- Open a PR with `gh`, body summarising: what was generated, the gate result, the review verdict, and which findings were applied.

The human only ever reviews code that has cleared the gate and the adversarial pass.

## Per-run log (the learning goal)
After Stage 4, append a record to `.claude/handoff/<Name>.run.json` capturing what Phase 9 is meant to learn:
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
- `contextIsolationHeld` — did Stage 0's frozen snapshot suffice, or did a stage need data outside it?
- `reviewerCaughtBeyondGate` — did the adversarial subagent find anything the deterministic gate missed? (If never, the review stage is not earning its cost.)
- `manualRescues` — any stage that needed manual correction. If a stage needs rescuing every run, the snapshot or this prompt is too thin — fix it before declaring the loop done.

## Success signal
The component ships *through* the loop — meeting its roadmap success signal with no manual restructuring, the human reviewing only clean code. The gate passes, the review verdict is `clean` (or all findings applied), and the run log is written. Update this prompt with anything learned.
