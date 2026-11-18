---
status: active
created: 2026-11-18
completed:
---

# Docs page IA: four tabs, a Decisions tab grouped by topic, and a /document-component command

Follow-up to Phase A3 of `2026-11-05-spec-renderers.handoff.md` ("Remaining sections … then sign-off"). The Dialog page (batch 2 showcase core) came out much longer than the reference pages, Button and CardVertical. This plan settles the page template before the rest of batch 2 is published. Facts checked on `main` (`1099c7d`) on 2026-11-18.

## Why

The template (`apps/docs/src/pages/components/[name]/[...tab].astro`) switches to its lean layout only when a component has three things. Dialog has none of them:

| Lean when the component has | Button | CardVertical | Dialog |
|---|---|---|---|
| `usage.variants` axes (opening section named by axis: Variants, Sizing, Shape) | yes | yes | no → "Example" |
| `apps/docs/src/placement/<Name>.tsx` (Do / Don't boxes replace Patterns, Not for, Composition rules, Prop rules, Related) | yes | yes | no |
| `apps/docs/src/accessibility/<Name>.tsx` (Use cases, Reading order, Keyboard replace Role, Key table, Focus, Testing) | yes | yes | no ("Focus: None recorded") |

Approximate word counts from the built pages (`apps/docs/dist`, Nov 16 build):

| Tab | Button | CardVertical | Dialog |
|---|---|---|---|
| Usage | 190 | 215 | 460 |
| Spec | 550 | 1,370 | 1,770 |
| Accessibility | 160 | 250 | 295 (tables, no figures) |

The Spec tab is long on CardVertical too: "Why it's built this way" lists every `decisions[]` entry word for word, and many `reason` texts are internal working notes ("visual review 2026-11-16", "Caught in the first screenshot baseline").

Polaris, MUI, Carbon and Material 3 don't publish per-component decisions; GOV.UK's "Research on this component" is the nearest precedent (recalled, not re-checked). A structured decision log is a deliberate showcase feature of this site.

## Decisions

Closed (developer, 2026-11-18):
- **D1. Four tabs: Usage · Spec · Accessibility · Decisions.** Tokens becomes a section of Spec (as Material 3 does), not a move to Airtable: Airtable is private governance and the token table is generated at no cost.
  - Usage, for designers and PMs: opening section, When to use it (families only), Do / Don't.
  - Spec, for engineers and designers drawing it: Anatomy, Props, States, Tokens.
  - Accessibility, for everyone: Use cases, Reading order, Keyboard and focus.
  - Decisions, for reviewers and maintainers: decisions filtered by topic, Ruled out, Design–code parity.
- **D2. Group decisions by topic, not by reader.** A new field `topic` on each `decisions[]` entry: `visual` (spacing, layout, structure, look), `behaviour` (focus, keyboard, events, state sync), `platform` (native elements, browser support, implementation workarounds). One right label per decision; "who reads it" was ambiguous, because spacing decisions matter to both designers and engineers. Dialog splits about 7 / 5 / 3.

- **D3. Internal notes move to a `notes` field** (2026-11-18). `/review-component` reads `decisions[]`, and some reason text is written for it ("Reviewers should not flag the missing wrap"), so trimming in place would lose agent context. `decision` and `reason` become short and reader-facing; an optional `notes` field (not rendered) holds provenance and reviewer guidance, as `ruledOut[]` already has `source`. Rejected: trimming in place (loses context), a page-only `summary` (two texts that drift).
- **D6. The page shows featured decisions only** (2026-11-18): at most 8 per component, marked `featured: true`; every entry stays in `spec.json` for agents, and the tab links to the spec on GitHub (and to `usage.json` where needed) for the rest. Rejected: merging or deleting entries (loses agent context), a collapsed "All decisions" list. Supersedes "every decision shows" in R6. Not featured: entries that restate a system-wide rule (ADR, `AGENTS.md`) or repeat `usage.json` without adding why.
- **D4. Dialog opens with a "Content" section** (2026-11-18): title only, with description, with actions, each with a Use when line. "Modal vs non-modal" is out: docs pages stage Dialog non-modal (`STAGED`), so both pictures would look the same. Whether "Content" becomes the general rule for components with no variant axis but optional slots is settled in step 5.1.

Open, close before the step that needs it:
- **D5. Where the decision-writing rule lives** (before step 5.1). Recommended split: the rule applies where decisions are born, so the rule goes into the schema `description` of `decisions[]` (agents read it) and `/extract-learnings` (which routes findings into `spec.json`), and is enforced by `spec:validate` (step 1.3). `/document-component` runs the one-off edit pass on entries written before the rule, and checks pages; it isn't the long-term home of the rule.

## Page rules (input for `/document-component`)

- **R1. Opening section** is named by the variant axis (`AXIS_TITLES`). With no axis but optional slots, "Content" (D4); the general rule is settled in 5.1.
- **R2. Placement file on every published page.** Each Do is a pattern story, at most 4. Each Do pairs with a Don't that is *visible*, chosen in this order: `notFor` (wrong component), `limits`, then a `donts` entry that can be drawn. Behavioural don'ts (Dialog's React `autoFocus`, DropdownMenu Escape) never become boxes: they go into Accessibility keyboard advice or stay agent-facing.
- **R3. Captions** are 120 characters at most (the page already throws). A Do starts with a verb; a Don't names the mistake, then the consequence.
- **R4. Prop rules enforced by `type` are not rendered** (the compiler tells the consumer).
- **R5. Accessibility file on every published page:** at most 4 use cases; labeling and keyboard advice of one or two sentences each. ARIA attributes, the key table and the test tier stay in `spec.json`.
- **R6. Decisions tab:** featured decisions only (D6), filtered by `topic`, then a link to the full list in `spec.json`; text is short and reader-facing (D3). Other tabs may link a one-line "Why?" to a filtered view rather than repeat the reason.
- **R7. No "None recorded" on reader pages:** a section with no data is left out.
- **R8. Overlays render staged** (non-modal, inert, no backdrop): no figure may depend on modality.

## Progress

Tick an item when it is done and verified; add the date and commit or PR. Order is build order: contract first, then template, then data, then the command that captures it.

**1. Contract** (blocks everything after it)
- [x] 1.1 Close D3: `notes` field (2026-11-18)
- [x] 1.2 (2026-11-18) Spec schema: `topic` (enum `visual | behaviour | platform`, required on every `decisions[]` entry) and optional `notes` (D3); update the `decisions[]` description with the writing rule (D5)
- [x] 1.3 (2026-11-18) `scripts/validate-spec.js`: flag a `reason` over a length cap, and dated or internal markers in `reason` ("visual review", ISO dates, "screenshot baseline"). Cap 200 (Button's longest is 183); markers: ISO date, "visual review", "screenshot baseline", "reviewer(s) should/must", "caught in/by". **Reported as backlog, not an error,** so `main` stays green before step 2; 32 entries flagged today
- [x] 1.4 (2026-11-18) Tag `topic` on the existing decisions: 45 entries in 8 specs, three more than listed here (CardHorizontal 4, AppHeader 1, VideoFrame 1). Dialog split 5/5/5, not the estimated 7/5/3. Labels are a first pass; step 2 may move some
- [x] 1.5 (2026-11-18) ADR-027 amendment (schema: `topic`, `notes`) and ADR-030 amendment (four-tab IA, Decisions tab, R1–R8)

**2. Decision text edit pass** (needs 1)
- [x] 2.1 (2026-11-18) Edit Button's decisions (6) to the rule; internal notes move per D3. Tone approved by the developer: plain words over internal jargon (no "bleed", "consumer", "glyph", "Root"), code names in backticks, one idea per sentence, "you" for the person using the component, mechanics and enforcement go to `notes`
- [ ] 2.2 CardVertical (15; 8 featured) done 2026-11-18, then Dialog (15; 8 featured) done 2026-11-18, Accordion (2), DropdownMenu (1). Each pass also picks the featured set (D6): a spec with no featured entry shows an empty tab once 3.2 lands
- [ ] 2.2b CardHorizontal (4), AppHeader (1), VideoFrame (1)
- [ ] 2.3 Same pass on `ruledOut[]` reasons and `figma.divergences` (Button 6/1, CardVertical 10/5, Dialog 8/6)
- [ ] 2.4 Once the backlog list is empty, make the 1.3 check an error in `validate-spec.js` (and update the ADR-027 amendment and doc 10)

**3. Template** (needs 1; can run alongside 2)
- [ ] 3.1 `TABS` in `apps/docs/components.mjs`: drop Tokens, add Decisions; the Tokens table moves into Spec as a section; old `/tokens/` URLs redirect or 404 (check what links them)
- [ ] 3.2 Decisions tab: featured entries only (D6) plus a `REPO_BLOB` link to `<Name>.spec.json`; topic filter (All / Visual / Behaviour / Platform), Ruled out, Design–code parity; ADR links kept; filter works without JS (all shown) and in light and dark; render `backtick` spans in decision and reason text as `<code>` (Button and CardVertical use them; the current Spec page prints them literally)
- [ ] 3.3 R4: skip constraints whose `enforcedBy` is only `type`
- [ ] 3.4 R7: omit empty sections instead of "None recorded"
- [ ] 3.5 Placement check: each Don't's `source` index resolves in `usage.json` (today nothing reads it, so a reorder silently mislabels a box); throws at build like the caption cap
- [ ] 3.6 Rebuild Button and CardVertical; confirm nothing on their Usage and Accessibility tabs changed apart from the intended moves

**4. Dialog page** (needs 2.2 for Dialog, 3)
- [ ] 4.1 Build the "Content" opening section (D4)
- [ ] 4.2 `apps/docs/src/placement/Dialog.tsx`: Do `confirm-action` / Don't two accent Buttons in actions (`donts[5]`); Do `edit-form` / Don't a dialog that only reports "Saved" (`notFor[0]`)
- [ ] 4.3 `apps/docs/src/accessibility/Dialog.tsx`: use cases; reading order (Title → Description → Body → Actions, Close's label); keyboard advice covering Escape, return focus and `data-autofocus`. **Unverified:** whether the reading-order and focus-ring figures work on the staged `inert` picture (inert removes it from the accessibility tree); check first, and if not, render the figure unstaged
- [ ] 4.4 Mark `Backdrop` in the anatomy (open in the spec-renderers handoff), or record why not
- [ ] 4.5 Developer review of the Dialog page against Button and CardVertical; light/dark check

**5. `/document-component` command** (needs 4: written from what worked, not before)
- [ ] 5.1 Close D5; `.claude/commands/document-component.md` (prompt-only, so a command, not a skill). Its description must say it builds the component's docs-site page from the committed `usage.json` and `spec.json`, and does not author them (that's `npm run spec:generate` and the review loop), apart from the decision edit pass. Then: invariant, inputs, R1–R8, the decision edit pass, success signal (`spec:validate`, `docs:build`, page review)
- [ ] 5.2 `/extract-learnings`: route a decision with its `topic` and in the short form (D5)
- [ ] 5.3 Prove it on one page not touched by hand: Accordion

**6. Close-out**
- [ ] 6.1 Spec-renderers handoff: tick A3 "Remaining sections" with a pointer here; its A4 list (Select, DropdownMenu, TextField) now runs through `/document-component`
- [ ] 6.2 Same-PR doc touch where `docs-check` asks for one (see the docs-check coupling note)
- [ ] 6.3 Mark this handoff `done`, run `npm run handoff:tidy`

## Risks

- **The edit pass is the slow part,** about 40 entries across five components, plus their ruled-out and parity lists; plan it as review time, not generation time. Doing Button first (2.1) sets the tone before the long lists.
- **Hand-written placement and accessibility files are a second copy of `usage.json`.** 3.5 covers placement indices; accessibility captions can still drift from the spec's contract with no check.
- **Dropping the Tokens URL** breaks any link to `/components/<name>/tokens/`; check the case-study pages and `docs/` before 3.1.
