---
status: active
created: 2026-10-08
completed:
---

# Governance decision eval — scope

**Question:** given a new requirement, does Claude make the right governance decision? The options are reuse, compose, extend with a prop or variant, add parts, use an internal element, create a new component, or escalate. And is the knowledge in this repo enough to decide well, or are its semantics too thin? The two other evals ([spec harness arm](archive/2026-10-07-spec-harness-arm.handoff.md), [harness ablation](2026-10-07-harness-ablation-eval.handoff.md)) measure **output quality**: whether the built component is correct. Their tasks decide "build X" in advance. Nothing measures the decision that comes before the build.

**Why this matters here:** the rules exist only as prose (ADR-006, 009, 023, 024, 025, 026, plus the closed list in CLAUDE.md "Component scope"). No command runs the decision. `/component-scaffold` and `/add-component` assume it has already been made, and `layout:validate` only rejects components outside the set. "A requirement arrives against an existing component" is handled ad hoc in chat, and no record of the decision is kept.

**Why single-shot, in `scripts/pattern-accuracy-harness/`:** this measures *context* ("is the knowledge thin?"), not a loop. It reuses `run.js` (arms, `--runs`, `--dry-run`, `promptChars`) and `report.js` (medians, min–max). It's a new task kind, `decision`, whose scorer grades a JSON record instead of component files.

**Non-goal:** don't build a planner → evaluator → human governance pipeline up front. The lite rule, the ≤2-agent guardrail and the closed component set (real decisions are rare) all argue against it. Add a step only after a measured failure (see "What the result decides").

## Tasks

About 13, balanced across answer labels so a one-sided policy ("always extend", "always escalate") fails. Historical cases have a known reference solution: the ADR that decided them. **Leakage:** for a historical task, its ADR's worked example is redacted from the arm's context (keep the rule, strip the example that states the answer).

| Task | Requirement (brief gist) | Reference answer | Deciding source |
|---|---|---|---|
| `button-trailing-icon` | "Show more" text action with a trailing chevron | `extend-prop` (Button) | ADR-009 q1 |
| `arrow-vs-disclosure` | Circular icon button that expands/collapses a section, next to the existing prev/next arrows | `internal` (not ButtonArrow) | ADR-009 q2/q3 |
| `carousel-arrows` | Bordered prev/next controls with a disabled state at the ends (ButtonArrow removed from context; the brief says the scope covers carousel controls) | `new` (not a Button variant, not the disclosure trigger) | ADR-009 q2 |
| `button-ghost` | Low-weight inline action, e.g. Close in a panel | `extend-variant` (Button `transparent`) | ADR-024 + amendment |
| `card-favorite-progress` | Card needs a favorite toggle, progress and a completed state, without invalid prop combinations | `parts` (CardVertical) | ADR-023 |
| `carousel` | Horizontal paginated row of cards with prev/next | `compose` + hook (no component) | ADR-006 |
| `card-actions-row` | Card footer with a lead action and a secondary action | `compose` (Button `card-actions` pattern) | Button metadata `usage.patterns` |
| `course-tag-static` | Non-interactive "Beginner" label on a course card | `reuse` (Badge) | Badge metadata `usage.when` |
| `course-tag-filter` | Same pill look, but toggles a filter | `reuse` (Chip, not Badge) | Chip/Badge metadata (role decides) |
| `button-loading` | Button shows a busy state while a submit is pending | `extend-prop` (Button) | ADR-025 interaction state, ADR-026 vocabulary |
| `textfield-helper` | Persistent helper text under a TextField (TextField has only `error` today) | `extend-prop` (TextField) | ADR-009 q1 (same role, same `aria-describedby` grammar) |
| `otp-input` | Six-box one-time-code entry with paste and auto-advance | `escalate` (outside the fixed set; new interaction model) | CLAUDE.md "Component scope" |
| `select-search` | Select with a type-to-filter search box | `escalate` (rewires Select's native interaction model; it would be a combobox) | ADR-009 q2 + scope |

Lock briefs and reference answers **before the first run**. A brief states the requirement in product language and never names the decision or the ADR.

## Decision record (model output)

```json
{
  "decision": "reuse | compose | extend-prop | extend-variant | parts | internal | new | escalate",
  "target": "Button",
  "candidates": [{ "name": "ButtonArrow", "verdict": "reject", "reason": "..." }],
  "proposedApi": "optional: prop/variant/part names when extending",
  "citations": ["ADR-009", "Button.metadata.json#usage.patterns"]
}
```

## Scoring (deterministic, no LLM judge in v1)

- **Headline:** the decision label matches the reference. `target` must match too for `reuse`, `extend-*`, `parts` and `internal`. A task passes in an arm when most of its runs are correct.
- **Secondary:**
  - Every required candidate per task is listed in `candidates`. For example, `course-tag-filter` must consider both Badge and Chip.
  - The deciding ADR or metadata path is cited.
  - No component outside the set is proposed unless `decision = escalate`.
  - No hallucinated component, prop or variant names, checked against the package exports and the TypeScript props.
  - `proposedApi` names follow ADR-026, using the `namingDrift` checks from `generate-pattern-schema.js`, shared with the ablation eval's `prop-vocabulary` check.
- Add a rubric-graded model judge only if label matching proves too coarse, e.g. a right label for the wrong reasons shows up in transcripts.

## Arms

| Arm | Prompt |
|---|---|
| A | brief + CLAUDE.md "Component scope" + ADR-006/009/023/024/025/026 text (redacted per task) |
| B | A + metadata of the task's candidate components |
| C | B + their `*.spec.json` (ADR-027 accepted 2026-10-08). A component pinned by `metadataAsOf` never gets its spec, which postdates the decision, so a task where no unpinned candidate has a spec has no Arm C. |

## What the result decides

- **B fails a case that A also fails:** the semantics are thin. The failing cases show *which* field is missing (candidates: interaction model / ARIA role as a comparable field, an extension count or prop budget per component).
- **Add JSON only after a measured failure**, routed by reader per ADR-027. If `/layout-generation` also needs the field, it goes in metadata (schema + ADR-001). If it's builder-only, it goes in the spec. Same rule as ADR-013: measured improvement or it doesn't ship.
- **A failure the context can't fix** (e.g. right facts, wrong decision): add an explicit decision step to `/component-scaffold` and `/add-component`, plus a committed decision record. That needs an ADR-009 amendment.
- **Everything passes:** record the result and don't add a layer. That is a valid outcome.

## Pre-registration (write before the first full run)

- **Prediction:** 
   - Pass counts: Arm A passes 6 out of 13, Arm B passes 10 out of 13
   - select search, and otp-input fail on both arms
   - Arm C is better than B
   - **How it's read** (agreed 2026-10-08, before any run):
     - **Pass** = most of a task's 3 runs are correct, as the report computes it.
     - **"Fail on both arms"** = the task doesn't pass in A or in B.
     - **"C better than B"** = on the 4 Arm C tasks (arrow-vs-disclosure, button-loading, card-actions-row, carousel), Arm C has more correct runs out of 12 than Arm B.
- **References locked 2026-10-08** (developer): the four developer-call answers stay as written. button-loading → extend-prop Button; textfield-helper → extend-prop TextField; otp-input → escalate; select-search → escalate. No task file changes after the first run.
- **Honest-outcome rule:** don't tune briefs, reference answers or the scorer after seeing results.
- **N = 3** runs per task × arm; N = 1 is a pilot.
- **Budget:** 13 tasks × 2 arms (A, B) × 3 = 78 single-shot runs, plus Arm C on 4 tasks × 3 = 12: **90 in total**, sequential. Prompts are 53–106K chars and the output is a short JSON block.

## Order and dependencies

1. After the spec harness arm, whose ADR-027 outcome decides whether Arm C exists.
2. Before the harness ablation eval: if this eval adds metadata fields, the ablation's Arm 1 context changes.

## Changes needed

1. Task files. **Done 2026-10-08:** `tasks/decision/decision-*.json` (13 files). They're in a subfolder so `run.js --all` (which reads only `tasks/*.json`) doesn't pick them up before the `decision` kind exists. Fields:
   - `brief`: product language; never names the decision or the ADR
   - `referenceDecision`, `referenceTarget` (`null` for compose/new/escalate)
   - `requiredCandidates`, `acceptedCitations` (any one counts)
   - `contextAdrs`: ADR numbers for every arm. ADR-006 is dropped from the `carousel` task because it is the case ruling.
   - `contextMetadata`: Arm B's candidate metadata
   - `metadataAsOf` (`{Component: commit}`): historical tasks read the decided component's metadata **from before the decision**, from git (Button `e2843b8`, CardVertical `cad846c`, pre-ButtonArrow `041dc82`). This uses real history instead of a hand-redacted copy.
   - `excludeComponents`: components that didn't exist yet. `run.js` strips them from the scope list and from metadata.
   - `redact.adr`: regexes; matching ADR lines are dropped
   - `redact.scope`: regexes; matching substrings are cut from the CLAUDE.md scope section
   - `recordPatterns`: secondary checks on the record, e.g. the carousel `proposedApi` names a `use*` hook
   - `source`, `notes`

   Label balance: extend-prop 3, compose 2, reuse 2, escalate 2, and 1 each for new, internal, parts and extend-variant. A check script confirmed every commit and path resolves, every redaction pattern matches, and no answer string survives redaction (ADR text + scope after exclusions).
   - **Locked before the first run.** The two "not historical" references (`button-loading`, `textfield-helper`) and the two `escalate` cases are the developer's calls. Review them now, because they can't change after a run.
   - **Found while writing `select-search`:** `Select.metadata.json` `component.description` says it "wraps a native `<select>`", but `index.tsx` is a custom select-only combobox (`role="combobox"` + listbox). The arm B context for that task carries the stale description. Tracked as #122. Fix it only after this eval's runs finish, so the prompt stays the same across runs.
2. `run.js`: a `decision` task kind that assembles arm context from ADR text + metadata (+ spec) and asks for the JSON record.
   **Done 2026-10-08** (`decision.js`, routed from `run.js`; `--decisions` selects all 13). Component-task prompts are byte-identical to before, checked against the spec-arm run. The prompt gives every arm the same one-line definition of each label, so a miss is about the decision, not the vocabulary.
   - **Dry run:** 13 tasks, 30 prompts (Arm C on 4 tasks: arrow-vs-disclosure, button-loading, card-actions-row, carousel), 53–106K chars.
   - **Leak scan:** clean in every arm, after three fixes:
     - `card-favorite-progress` pins **every** candidate to `cad846c` (today's Button and DropdownMenu metadata name the Favorite/Menu parts).
     - `carousel-arrows` pins Icon to `041dc82` (its `containedBy` listed ButtonArrow).
     - `carousel` drops ScrollArea, which was created in the decision's own commit and describes itself as a carousel alternative.
3. `score.js`: a decision scorer as above.
   **Done 2026-10-08** in `decision.js` (`scoreDecision`). `loadTask` also reads `tasks/decision/`.
   - **Calibration:** a synthetic reference record for each task scores correct, with no secondary misses.
   - **Negatives:** a wrong label, a wrong target and unparseable output score wrong. A hallucinated candidate is flagged in the secondary checks.
   - **Deferred:** the ADR-026 `namingDrift` check on `proposedApi`. It belongs with the ablation eval's `prop-vocabulary` export; `recordPatterns` covers the per-task names for now.
4. `report.js`: per-task label accuracy per arm, A-vs-B delta, prompt chars.
   **Done 2026-10-08** as `writeDecisionReport()` → `results-decision.md`, separate from `results.md`. It covers:
   - per task × arm: correct/runs, the decisions given, citations, missed candidates, hallucinations, pattern misses
   - the pass rate per arm
   - the A-vs-B readout (thin semantics / metadata earns it / metadata hurts)
   - an incompleteness notice until every task has ≥ 3 runs in A and B
5. Docs: check the `sources:` of `docs/07-cli-reference.md` and `docs/11-self-improving-loops.md` (docs-check coupling).
   **Done 2026-10-08:** 07 documents `--decisions`; 11 has a clock reset.

**Ready to run once the pre-registration is written:** lock the four developer-call references and the prediction, then `npm run harness:run -- --decisions --runs 3`. That's 90 single-shot runs, sequential (30 cells × 3).
