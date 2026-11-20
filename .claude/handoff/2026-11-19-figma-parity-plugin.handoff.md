---
status: active
created: 2026-11-19
completed:
---

# Figma parity plugin (split out of the spec-renderers handoff)

Was Part B of `2026-11-05-spec-renderers.handoff.md`, moved here on 2026-11-19 when the developer closed that handoff on Part A alone. **Optional:** the developer isn't sure it will be built. Nothing below has started. The decisions it relies on are closed in ADR-030 (5, 6, 7, 8, 11 are Part B's); Part B gets its own ADR-030 amendment when it starts.

It reads the same spec bundle Part A built (`npm run spec:bundle`, `dist/specs.bundle.json`; shape in the archived spec-renderers handoff, "Shared input"). Facts below were checked on 2026-11-05/10 and need rechecking before B0.

## Progress

Tick an item when its "Done when" is met, and add the date and PR number. Order is build order.

- [ ] Phase B0 spike: dev plugin loads in Figma desktop (manual); Plugin API access confirmed on the current plan; Button/CardVertical layer names checked against `anatomy[]`
- [ ] Phase B1: three rules on Button, findings panel, `figma-parity.json` export, deterministic across two runs
- [ ] Phase B2: predictions for the known-answer items written down *before* the run
- [ ] Phase B2: all 27 components; first `.claude/figma-parity.json` committed; `sense.js` reads it; staleness warning in `npm run status`; `CLAUDE.md` frozen-snapshot table updated
- [ ] ADR-030 amendment for Part B as built
- [ ] Phase B3: spec sheets on the Specs page, Button then CardVertical then all 27, regenerating in place
- [ ] Phase B4: `stale-sheet` rule
- [ ] Results: the Phase B2 known-answer result recorded in `docs/case-study-source/08-measured-impact.md`
- [ ] Handoff `status: done`, `npm run handoff:tidy`

## Why

- **Why a plugin after that:** the public repo has no standalone Figma tooling yet. All Figma work goes through `/figma-cli` (third-party) or MCP snapshots. A parity check in Figma catches design–code drift where designers work, which neither Code Connect nor the Figma → spec tools do (positioning table in Part B). Reference point: [Spectacular](https://spectacular.systems/) goes Figma → spec, extracting anatomy, props, layout, styling and modes into schema-valid YAML/Markdown deterministically. This plugin is the reverse and much smaller: repo contract → Figma, checked. That matches ADR-002's code-first direction, and it's the only direction plan limits leave open: the Variables REST API and Code Connect are Enterprise/Org-only. The Plugin API isn't plan-gated the same way. *Verify this in Phase B0*, especially `figma.variables` read access on the current plan.
- **Consistent with the system's rules:** no AI calls (both are deterministic renderers), no live API calls (specs are bundled at build time, see "frozen-file handoffs" in `CLAUDE.md`), no new always-on automation.

## Part B: Figma parity plugin

**What it is:** a design–code parity checker that runs in Figma on a Pro plan. It checks each component set in the main file against the code contract (the bundle) and lists every mismatch. Spec sheets on the canvas come second, as the readable output of the same data.

**Positioning (researched 2026-11-10):**

| Tool | Direction | Answers |
|---|---|---|
| Code Connect | Figma → code | "What code do I write for this?" Links the two sides in Dev Mode; never checks that they agree. Org/Enterprise only. |
| EightShapes Specs, Spectacular | Figma → spec | "What is this made of?" Anatomy, props and spacing drawn or extracted from Figma. |
| This plugin | code → Figma, checked | "Does this Figma component still match the code contract?" |

It complements Code Connect rather than competing with it: Code Connect tells a designer what code to write; this tells the team whether the Figma component still matches the code. On its own, drawing sheets would read as a copy of EightShapes Specs, so sheets come after the check. Portfolio value: Plugin API depth (variables, `boundVariables`, component properties), governance as checks rather than more docs, and a measured known-answer result.

**How it fits the system:**

- The bundle is compiled into the plugin at build time (esbuild JSON import), so the plugin makes no network calls.
- Results leave Figma as a downloaded `figma-parity.json` that Facundo commits. It becomes a frozen snapshot that `sense.js` reads, so Figma drift shows up in `npm run status` and agent context without CI ever calling Figma (decision 11).
- Recorded `figma.divergences[]` and the representational divergences in the `figma-file-variable-drift.md` memory note are skipped, not flagged. Each skip is listed in the output, so they stay visible.

**Not in scope:** Figma → spec extraction (Spectacular's direction), publishing to Figma Community, any LLM call, Code Connect, multi-brand checks (Figma stays single-brand, ADR-012), writing to Figma in v1 (decision 7).

### Rules

Each rule reads only the bundle and the open Figma file. Every finding carries the rule, the component, the node id and name, what the contract expects and what Figma has.

| Rule | Checks | Source in the bundle |
|---|---|---|
| `token-binding` | For each `styles` entry that maps to a Figma property (padding, gap, height, width, radius, fill, stroke), the node's bound variable equals the spec token's Figma variable. Flags a different variable, or no binding at all. | `styles`, Figma variable names |
| `prop-coverage` | Spec props with a `figma.property` exist on the component set with the same options; props and variants in Figma that aren't in the spec are flagged too. | `props[].figma` |
| `part-names` | Each `anatomy[].name` exists as a layer name in the default variant (ADR-023). Turns B0's one-off check into a permanent rule. | `anatomy` |
| `stale-sheet` | A generated sheet's stored hash equals the bundle's hash for that component. | per-component hash |

### Phase B0: spike (no plugin code merged)

- Set up a development plugin (manifest + TypeScript + esbuild) and load it in Figma desktop via *Plugins → Development → Import plugin from manifest*. **This is a manual step for Facundo;** an agent can't do it.
- Confirm on the current plan: reading local variables, `boundVariables` on nodes, and `componentPropertyDefinitions` on component sets from the Plugin API; `setPluginData` on created frames; downloading a file from the plugin UI.
- Check by hand that layer names match `anatomy[].name` for Button (`57:1265`, `54:1192`) and CardVertical. Record any mismatches; they're findings, not things to fix silently. They become the expected output of `part-names`.

### Phase B1: parity check on Button, findings panel

- `token-binding`, `prop-coverage` and `part-names` on Button.
- **Findings panel:** one row per finding (rule, node, expected, actual). Clicking a row selects and zooms to the node.
- **Export:** a "Download `figma-parity.json`" button. Output is sorted and stable, so two runs on an unchanged file give an identical file apart from `capturedAt`.
- **Done when:** two runs on unchanged Figma give the same findings, every finding traces to a bundle field and a node id, and recorded divergences show as skipped, not flagged.

### Phase B2: all 27 components and the known-answer test

- Run the three rules across every component set in one pass.
- **Known-answer test:** the open items in `2026-10-13-figma-fidelity-follow-ups.handoff.md` are already-traced differences. Without being told about them, the plugin should flag:
  - ButtonArrow's glyph stroke (`color/icon/*` in Figma vs `color.text.*` in the spec)
  - Checkbox's `_Checkbox/Box` 18×18 with no size binding (spec: `size.icon.sm`)
  - Accordion (`AccordionItem` `29:1153`), from the 2026-11-19 rebuild, whose read-back checked structure and text but not bindings:
    - `TitleGroup` gap was a raw 4 (spec: `space.stack.xs`). Bound on 2026-11-20 in all 6 variants, so this is now a **should-pass** case: flagging it is a false positive. Unbinding it on a scratch copy turns it back into a should-flag case.
    - `Panel` padding-right was a raw 48 for a `calc` sum no Figma variable could hold. On 2026-11-20 the code dropped the sum (spec `ruledOut`) and Figma bound it to `space/inset/md`, so this is now a should-pass case as well. `token-binding` still needs a defined behaviour for `template` values whose parts are single tokens (`0 {space.inset.md} {space.inset.md}`): compare each side's binding to its token.
  - Write down which of these it flags *before* running it, in line with the repo's honest-outcome rule. A miss is a result, not something to tune away quietly. New findings go to the fidelity handoff's decision path, not into a silent fix.
- Commit the first `figma-parity.json` and teach `sense.js` to read it (counts per rule and component in `STATUS_QUO.md`).

### Phase B3: spec sheets with anatomy markers

The readable output, drawn after the check exists. One auto-layout frame per component, placed next to its component set (`figma.sets[].nodeId`) or on a Specs page (decision 6). Styled with the UpSkill library's own text styles and variables, so the docs are built with the system they document. Part A's pages are the reference for wording.

1. **Anatomy.** An instance of the default variant with numbered markers on each layer matching an anatomy part, plus the legend. A part with no matching layer shows as "not found in Figma" (the same result as `part-names`), never skipped.
2. **Props.** Prop, type, options, default, Figma surface and property. `code-only` props are shown and labelled, not hidden, because that's what designers usually lack. The Figma columns belong here, not on the web.
3. **Styles and tokens.** Per part and condition: CSS property → token path → resolved value, with redlines on the instance (padding, gap, height, radius) labelled with the token. Literals show their `reason`. Rows with a `token-binding` finding are marked.
4. **States and accessibility.** States with their ADR-025 `kind` and trigger, role, ARIA attributes, keyboard interactions table, focus note (ADR-028).
5. **Constraints and divergences.** `constraints[]` with `reason` and `enforcedBy`, and `figma.divergences[]` with the decision on each.

- **Idempotent:** the frame carries `setPluginData('specSheet', { component, specHash, generatedAt })`. Regenerating replaces the frame and never duplicates it.
- **Done when:** running it twice on Button gives one sheet, and every row matches the Button pages from Part A. Then CardVertical, then all 27.

### Phase B4: staleness

- `stale-sheet`: each sheet's stored `specHash` compared with the bundle; stale sheets are marked on the canvas and listed in the findings panel and in `figma-parity.json`.


## Decisions it relies on (ADR-030, closed 2026-11-10)

5. **Plugin workspace:** `apps/figma-parity`.
6. **Sheets:** a dedicated Specs page in the Figma file, linking back to each set.
7. **Mismatch policy:** flag-only in v1; a per-finding "bind to spec token" action is a v2 candidate.
8. **Name:** "Figma parity" (working name).
11. **`figma-parity.json`:** `.claude/figma-parity.json`, added to the frozen-snapshot table in `CLAUDE.md` when it lands; `npm run status` warns when the capture is older than the last spec change.

## Measurement

- Phase B2 known-answer result: how many of the traced fidelity items the plugin flags, and how many new ones. Predictions written before the run.
- Until measured, the portfolio and CV say "built", never a number.

## Portfolio follow-up (outside this repo)

- **After Phase B2:** a short screen recording of the parity check on the full file (findings panel, click-to-node, the known-answer items flagged or missed). **After Phase B3:** screenshots of a generated Button and CardVertical sheet. After each, and update `index.md` again (E3, and the "Custom design-system tooling" gap in §5).
- Only claim what has shipped.

## Done when

- the plugin lives in its workspace with a README on loading it in Figma desktop; the parity check runs across all 27 components, its committed `figma-parity.json` is read by `sense.js`, and sheets generate from the bundle, regenerate in place, and mark stale sheets.
- The Phase B2 known-answer result is recorded in `docs/case-study-source/08-measured-impact.md`.
