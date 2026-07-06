# Handoff: Internal Meta-Schema Aggregation + Accuracy Harness

**For:** a Claude agent picking up this build in `F4cu/upskill-design-system`.
**Status:** research + build handoff. Not yet started. This file is scratch — not committed convention; move findings into an ADR if a durable decision is made.
**Scope discipline:** Idea 1 *streamlined only*. No external enrichment (no scraping Radix/Ark/Base UI). No vector DB / RAG. No standalone service. Everything here is a script + one emitted file + a measurement harness, living inside this repo.

---

## 1. Why this exists (read before designing anything)

The base model already knows generic UI patterns (compound components, disclosure, WAI-ARIA, Gestalt). Encoding *those* buys little. The value is **system-specific** constraints the model can't infer, which this repo already captures per-component in `*.metadata.json` (`usage.antiPatterns`, `composition.accepts`/`containedBy`, variants-as-axes).

What's **missing** is the *cross-component* view: no single artifact says "these components implement the same interaction pattern; here's the canonical shape; here's where two of them drift." That aggregate is the deliverable.

Two hard constraints, both load-bearing:
- **The data is small.** ~25 components in scope. The aggregate fits in context directly — it is read with `Read`, not retrieved. Do **not** introduce embeddings, a store, or an API. If you find yourself reaching for retrieval, stop — the correct pattern in this repo is committed declarative files read in-context (see `.claude/STATUS_QUO.md`, the frozen-snapshot model in CLAUDE.md).
- **Determinism over cleverness.** The aggregation must be a deterministic AST + metadata scan. An LLM pass is allowed only for optional labeling (see §4), never for the structural facts.

The whole point must be provable, not asserted — hence the harness in §5. If the harness shows no accuracy lift, the honest outcome is "don't ship it."

---

## 2. Deliverables

1. `scripts/generate-pattern-schema.(js|ts)` — deterministic scanner.
2. `.claude/component-patterns.json` — the single canonical emitted artifact (one file; every downstream tool reads this, never re-scans). Lives in `.claude/` per the frozen-snapshot convention (`component-pipeline.json`, `STATUS_QUO.md`).
3. Wiring (deferred behind the §6 decision gate): a **staleness check** in `components-check.yml` — regenerate, then `git diff --exit-code` on the emitted file. The repo's CI convention is check-and-fail, not auto-PR; there is no existing "regenerate + open PR" mechanism to mirror, so do not invent one.
4. `scripts/pattern-accuracy-harness/` — the before/after proof (§5). This is the recruiter-facing artifact and the go/no-go signal.

Out of scope (do not build): external-library enrichment, behavioral scraping, token→design-law mapping, user-flow topology extraction (that's a separate deferred idea). If tempted, note it and move on.

---

## 3. The scanner (Priority piece — get this right first)

**Inputs (read-only, already in repo):**
- `packages/components/src/components/*/index.tsx` (real React trees — note the `components/` subdirectory)
- `packages/components/src/components/*/*.metadata.json` (declared contracts)
- `packages/components/src/hooks/*.ts` (hook-based patterns: `useSlider`, `useCarousel`)
- `packages/components/component.schema.json` (validation shape — package root, not `src/`)
- `.claude/component-pipeline.json` (maturity/stage)

Scan the **directory listing**, not a hardcoded component list — the repo contains components beyond CLAUDE.md's fixed-set tables (`DropdownMenu`, `Image`, `TextLink`).

**What to detect via AST.** Verified against the repo (2026-07-06): there are **no compound components** — zero uses of `createContext`, `Context.Provider`, or static sub-component assignment (`Accordion.Item = Item`) anywhere in `src/components/`. Components are flat and props-driven (`AccordionItem` is a plain named export). Do not build a compound-component detector; detect what actually exists:
- **Controlled/uncontrolled prop pairs**: `value`/`defaultValue` or `open`/`defaultOpen` + change callback, with internal `useState` fallback and an `isControlled` branch (Accordion, Select have this today).
- **Composition surface**: which library components appear in each tree (cross-check against declared `composition.accepts`).
- **ARIA wiring shapes, from the JSX itself**: `aria-expanded` + `aria-controls` + `useId` pairing, `role` attributes, `aria-labelledby` links. The AST is the source of the structured contract (see Key requirements below).
- **Hook-based interaction patterns**: `useSlider` and `useCarousel` in `src/hooks/`, plus their consumers (e.g. `apps/showcase/src/pages/CourseOverview.tsx`).
- **Prop-name drift for the same semantic axis**: real examples exist — Accordion uses `open`/`onOpenChange`, DropdownMenu uses `selectedValue`/`onSelect`, Select/Checkbox use `onChange`: three names for "selection changed".

Because no cross-file symbol or static-member resolution is needed, a straightforward per-file AST walk suffices — `ts-morph` vs raw compiler API is a convenience choice, not a research question; justify the pick in one comment line.

**Map detected structure → abstract pattern buckets**, e.g. `disclosure`, `controlled-toggle`, `content-stepper` (hook-based patterns included, not just components).

**Emit** the aggregate. Proposed shape (refine for LLM legibility + token economy — flat, no deep nesting, stable key order):

```json
{
  "generatedFrom": "commit-sha",
  "patterns": {
    "disclosure": {
      "architecturalStyle": "flat-props",
      "state": { "controlled": "optional", "props": ["open","defaultOpen","onOpenChange"] },
      "implementedBy": [
        { "component": "Accordion", "composition": ["Icon","Text"] }
      ],
      "ariaContract": { "trigger": {"aria-expanded":"boolean","aria-controls":"id"}, "content": {"role":"region","aria-labelledby":"id"} },
      "systemSpecificNotes": ["Button ghost variant replaces the old ShowMoreLink pattern"]
    }
  },
  "drift": [
    { "pattern": "controlled-selection", "issue": "prop-name-mismatch", "detail": "Accordion uses `onOpenChange`, DropdownMenu uses `onSelect`, Select uses `onChange` for the same change-callback axis", "components": ["Accordion","DropdownMenu","Select"] }
  ]
}
```

Key requirements:
- **`ariaContract` is derived from the AST**, not the metadata: metadata `accessibility.ariaAttributes` are free-text strings (`"aria-expanded (true|false on the trigger button)"`) and cannot be mechanically structured. The structured contract comes from the ARIA/role attributes actually present in each component's JSX (deterministic and true); metadata `accessibility.notes` / `ariaAttributes` strings are quoted **verbatim** into `systemSpecificNotes`. Never add an ARIA fact that isn't in the JSX or quoted from metadata.
- The `drift` array is a real side benefit — surface inconsistent prop names / compositions for the same pattern. Cheap to compute, high signal.
- One file, canonical. No per-tool re-scanning.

**Research question to resolve while building:**
1. How to bucket a component into a pattern deterministically without hand-maintaining a lookup table (derive from structure, fall back to a metadata hint field if structure is ambiguous).

---

## 4. Optional LLM labeling (strictly bounded)

The *only* place an LLM pass is permitted: assigning a human-readable `patternName`/`description` to a structurally-detected bucket that has no obvious name. Everything factual (composition, ARIA, drift) stays deterministic. Gate: the LLM never invents a pattern that has no structural evidence in the trees.

---

## 5. Before/after accuracy harness (the proof — do NOT skip)

Purpose: measure whether feeding `component-patterns.json` into generation actually improves output. This is both the go/no-go signal and the portfolio piece. A measured delta beats a browsable catalog.

**Design:**
- Fix a small set of generation tasks (5–8): e.g. "build a course-overview section with an Accordion", "compose a settings form with a labeled Select + Checkbox", "add a disclosure to CardVertical". Use briefs that exercise *system-specific* constraints the base model gets wrong.
- **Each task declares its applicable gate set upfront** — `metadata:validate`/`a11y:coverage` only apply to new-component tasks, `layout:validate` only to layout tasks — so both arms are scored by an identical, pre-registered rubric.
- **Arms generate into an isolated scratch dir** (one per task × arm), never into the live component tree, so runs don't contaminate each other or the repo.
- **Arm A (before):** generate with the current context only (metadata per-component, as `/layout-generation` and `/component-scaffold` do today).
- **Arm B (after):** identical prompt + `.claude/component-patterns.json` injected.
- Run both through the repo's **existing deterministic gates** as the scoring function — no subjective grading:
  - `npm run metadata:validate`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint` (Tier 1 a11y)
  - `npm run a11y:coverage && npm run a11y:test` (Tier 2, interactive)
  - `npm run layout:validate <file>` for layout tasks
  - plus a checklist of the known system-specific traps (Icon color on ancestor not `<Icon>`; visible text via `<Text>`/`<Heading>`; section `aria-labelledby`; on-scale spacing; type-enforced anti-patterns via narrowed attribute types). This checklist must be a **deterministic grep/AST script** in the harness, not judgment — same rule as the structural facts.
- **Score:** count of gate/checklist violations per arm, per task. Emit a `results.md` table (task × arm × violations) + a one-line summary delta.

**Honest-outcome rule:** if Arm B does not reduce violations meaningfully, report that plainly and recommend *not* shipping the schema. Do not massage tasks to manufacture a win.

**Keep it cheap:** sequential, at most one extra agent, frozen-file handoffs only — obey the on-demand loop guardrails in CLAUDE.md ("Ad-hoc loops vs continuous loops"). No parallel swarm.

---

## 6. Suggested order

1. Scanner → emit `.claude/component-patterns.json` for the current library. Eyeball it; fix bucketing + drift detection.
2. Build the harness; run Arm A vs Arm B; produce `results.md`.
3. **Decision gate:** only if the delta is real → wire the CI staleness check and (optionally) have `/layout-generation` + `/component-scaffold` read the file. If a durable decision results (schema shape, CI trigger, a new consumer contract), record/amend an ADR per CLAUDE.md's ADR rules — this changes a contract downstream tools depend on.

## 7. Guardrails recap (violating these means you've drifted from the brief)

- No RAG, no vector DB, no embeddings, no service. Committed file, read in-context.
- No external-library scraping/enrichment. System-specific facts only.
- Deterministic scan for all structural facts; LLM only for optional naming (§4).
- One canonical file; downstream tools read it, never re-scan.
- Ship only if the harness proves a delta. Report honestly if not.
