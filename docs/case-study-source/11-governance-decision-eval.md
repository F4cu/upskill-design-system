# Pressure-testing the decision before the build

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar. The numbers here come from one committed results file (`scripts/pattern-accuracy-harness/results-decision.md`, 90 runs, 2026-10-08). If `08-measured-impact.md` gets a section for this eval, that section becomes the home for the numbers and this page should cite it.*

## The decision nobody was measuring

Every other eval in this repo grades output. The pattern-schema harness and the harness ablation hand the model a task that has already been decided ("build an Accordion", "add a token") and score what comes back. None of them asks the question that comes first: when a new requirement arrives, should anything be built at all?

That question is the core of a small design system's governance. The options are a closed list: **reuse** an existing component, **compose** several, **extend** one with a prop or variant, add **parts** to it, keep the thing as an **internal** element of its only parent, create a **new** component, or **escalate** because the request falls outside the fixed set. Getting it wrong is how a 27-component library becomes a 60-component library nobody can maintain.

Before this eval, the rules for that decision existed only as prose: ADR-009's three questions, ADR-006, 023, 024, 025 and 026, and the closed component list in the agent instructions. No command ran the decision. `/component-scaffold` and `/add-component` assume it has already been made, and `layout:validate` only rejects components outside the set. In practice, "a requirement arrives against an existing component" was settled ad hoc in chat, with no record kept.

So the eval asked two things. Does the model make the right call? And is the knowledge already in the repo enough to make it, or are the semantics too thin?

## Built to be hard to game

**Thirteen tasks, balanced across answers.** The labels are spread so a one-sided policy fails: extend-prop 3, compose 2, reuse 2, escalate 2, and one each for new, internal, parts and extend-variant. A model that always says "extend" or always says "escalate" can't score well.

**Real history as the answer key.** Nine tasks are historical cases the system already decided, each with an ADR as the reference answer. The ghost button became a Button `transparent` variant (ADR-024). The favorite/progress card became parts on CardVertical (ADR-023). The carousel became a composition plus a hook, with no new component (ADR-006). The other four, including the two escalations, are the maintainer's own calls, locked before any run.

**Leakage handled with git, not hand-editing.** A historical task is only a test if the model can't read the answer. Each task's ADR is redacted so the rule stays and the worked example that states the answer goes. Component metadata is read from git *at the commit before the decision* (Button at `e2843b8`, CardVertical at `cad846c`, the pre-ButtonArrow state at `041dc82`), and components that didn't exist yet are removed from the scope list. Before the first run, a leak scan checked that no answer string survived in any arm's prompt. That scan caught three leaks, all fixed before any run. For example, today's Button metadata already names the Favorite part, so every candidate in that task had to be pinned to the old commit.

**Three context arms**, each adding one layer:

| Arm | What the model sees |
|---|---|
| A | The brief, the component-scope rules, the ADR text (redacted) |
| B | A + the candidate components' metadata |
| C | B + their `*.spec.json` (only where a spec existed for an unpinned candidate: 4 tasks) |

**A deterministic scorer, no LLM judge.** The model returns a JSON decision record with a label, a target, the candidates it considered and the sources it cited. The headline is a plain match against the locked reference. A task passes in an arm when most of its 3 runs are correct.

**Pre-registered.** Before the first run, the maintainer wrote down a prediction and how it would be read: Arm A passes 6/13, Arm B 10/13, the two escalation tasks (`select-search`, `otp-input`) fail in both arms, and Arm C beats B. The usual honest-outcome rule applied: no tuning of briefs, references or the scorer after seeing results.

## What came back

All 90 runs completed: 13 tasks × arms A and B × 3 runs, plus Arm C on 4 tasks × 3 runs (measured).

| | Arm A | Arm B | Arm C (4 tasks) |
|---|---|---|---|
| Tasks passed, raw | 10/13 | 11/13 | 3/4 |
| Correct runs, raw | 30/39 | 31/39 | 9/12 |
| Tasks passed, excluding two defective tasks | 9/11 | 10/11 | 3/3 |

Scored by the pre-registered rule:

| Prediction | Result |
|---|---|
| A passes 6/13 | **Wrong.** A passes 10/13. The ADRs alone decide most cases. |
| B passes 10/13 | **Close.** B passes 11/13. |
| The two escalation tasks fail in both arms | **Wrong.** Both pass 3/3 in both arms. Every run escalates and names the closed scope list and the change of interaction model. |
| C beats B | **Right, narrowly.** 9 correct runs vs 8, and the whole difference is one task (`carousel`). |

The prediction was pessimistic, and the model did better than the maintainer expected. The predicted failure was on the escalations, where the model had to say no to something plausible, like a Select with a search box. It never failed there. Prose rules plus a closed list were enough to refuse every time.

## The two tasks that were wrong, not the model

Transcript review found two construction errors in the locked task files. Under the honest-outcome rule the files stayed as they were, and the result is reported both ways.

- **`arrow-vs-disclosure` contradicted itself.** The brief said "we are building the Accordion", but the task excluded Accordion from scope, so no parent existed to hold an internal element. Button also wasn't pinned to its old commit, so every arm saw today's Button, which can already render a borderless round icon button. All 9 runs answered "reuse/compose Button", and each one rejected ButtonArrow for the right ADR-009 reason. Given the context the model received, that answer holds up. The task is invalid.
- **`button-ghost` leaked through case sensitivity.** The redaction pattern `transparent|ghost` had no case-insensitive flag, so two capitalized lines in ADR-024 survived. One run cited them directly. The leak pushed toward both the right and the wrong answer, so the task is contaminated.

Both have v2 fixes written down as *new* task ids, never edits to the locked ones, plus a guard for any future task: run the leak scan case-insensitively, and check that nothing the brief says exists has been excluded from scope.

## Where metadata helped, and where it hurt

The A-vs-B comparison was the point of the eval: it shows whether the metadata layer adds anything beyond the rules.

- **Thin semantics (fails in both A and B):** only `arrow-vs-disclosure`, which is invalid. **There is no valid evidence that the semantics are too thin.**
- **Metadata helps:** `carousel` (A 1/3, B 2/3, C 3/3). With less context, the runs spread their answers across labels, and the metadata and spec steadied them. `course-tag-filter` (A 0/3, B 2/3) looks like a metadata win but isn't. Arm A picked the right component (Chip) every time and labeled it "compose", because a *row* of chips arguably fits the prompt's own definition of compose. That's a fuzzy line between two labels, not missing knowledge.
- **Metadata hurts:** `carousel-arrows` (A 3/3 "new", B 0/3). Arm B saw the pre-decision Button, which already had a bordered variant, a round shape and a disabled state, and argued that the arrows were Button. Arm A, with only the rules, argued ADR-009's role question (navigation is not an action) and said "new". On reflection the reference answer itself is contestable, because ADR-009's own worked example contrasts ButtonArrow with the accordion trigger, not with Button. More concrete facts about the component pulled the model toward the answer that matched on looks. That is the failure ADR-009 exists to prevent: "visual similarity alone never justifies" the call.

## What the result decided

The eval was set up so each outcome triggered a specific action. Thin semantics would add a field to the JSON contract (only after a measured failure, per ADR-013's rule). Right facts with a wrong decision would add an explicit decision step to `/component-scaffold` and `/add-component`, plus a committed decision record. Everything passing would mean recording the result and adding nothing.

The result landed on the last branch. **No new JSON field, no decision step, no ADR amendment.** The rules plus the existing metadata decide 10 of 11 valid tasks, and the two weak spots are a fuzzy label boundary and a debatable reference, not a missing field. The planner → evaluator → human governance pipeline the handoff warned against building up front stays unbuilt, because the measurement didn't show a need for it. The eval also confirmed the harness ablation's inputs: no metadata fields were added, so its Arm 1 context didn't change.

The eval also turned up one real defect in the system's own contract, by accident. While writing `select-search`, the maintainer found that `Select.metadata.json` describes "a native `<select>`" while the code is a custom combobox with a listbox. It's filed as #122 (still open), and the fix was held back until the runs finished so the prompt stayed identical across all of them.

## What it doesn't prove

- **Small numbers.** N = 3 per arm, 11 valid tasks. A one-task gap between arms is within noise, so "B beats A" and "C beats B" are directional at best.
- **ADR-shaped tasks.** Every historical task is a case some ADR already ruled on, so Arm A's ceiling is high by construction. A harder v2 would need requirements no ADR anticipates. That is the version that would actually stress the decision.
- **Two scorer defects** on secondary metrics, with the headline unaffected. The hallucinated-names check counted descriptive names for rejected alternatives (`Carousel (new)`), so it's unusable as built. One task's pattern check looked for a prop name in a field the correct answer leaves empty.
- **Now historical.** The ADR-027 spec rollout (2026-10-12) moved states, tokens and accessibility out of metadata into the spec. The eval is frozen at `044d28f`, and `scripts/frozen-eval.js` refuses to run it on the current HEAD (ADR-029 amendment). Any question about governance on the spec-based architecture needs its own pre-registered eval.

## Why this belongs in the case study

The interesting result isn't the pass rate. A governance layer written as prose, a closed list and a handful of ADRs was tested against its own history with the answers hidden. The test was designed so a pass and a fail each had a pre-agreed consequence. When the model beat the maintainer's prediction, the system recorded that and built nothing. When the instrument was wrong, the errors were documented, the locked files stayed locked, and the numbers were reported both ways. The one place the extra context made the decision worse is the same lesson as the pattern-schema harness (ADR-013): more context isn't free, and only measurement shows where it helps and where it hurts.

## Sources for this section

- `.claude/handoff/archive/2026-10-08-governance-decision-eval.handoff.md` — scope, task table, pre-registration, run log, defects, result and decision
- `scripts/pattern-accuracy-harness/results-decision.md` — per-task × arm table (90 runs)
- `scripts/pattern-accuracy-harness/decision.js`, `run.js`, `report.js`, `tasks/decision/decision-*.json` — task kind, scorer, locked task files
- `docs/decisions/009-extend-vs-new-vs-internal.md`, `006-carousel-hook-not-component.md`, `023-subcomponents-compound-components.md`, `024-button-variants-by-weight.md`, `025-component-state-model.md`, `026-component-prop-vocabulary.md` — the decision rules under test
- `docs/decisions/029-tiered-context-architecture.md` (2026-10-12 amendment) — the eval freeze; `scripts/frozen-eval.js`
- `docs/decisions/013-cross-component-pattern-schema.md` — the "measured improvement or it doesn't ship" rule this eval applied
- `docs/07-cli-reference.md` — `harness:run --decisions`
- Issue #122 — the stale Select description surfaced while building the tasks
- `docs/case-study-source/07-self-improving-loops.md` §"The honest-outcome harness", `08-measured-impact.md` §"The harness ablation" — the sibling evals
