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
- [x] 1.3 (2026-11-18) `scripts/validate-spec.js`: flag a `reason` over a length cap, and dated or internal markers in `reason` ("visual review", ISO dates, "screenshot baseline"). Cap 200 (Button's longest is 183); markers: ISO date, "visual review", "screenshot baseline", "reviewer(s) should/must", "caught in/by". Reported as backlog while step 2 ran (32 entries flagged); an error since 2.4
- [x] 1.4 (2026-11-18) Tag `topic` on the existing decisions: 45 entries in 8 specs, three more than listed here (CardHorizontal 4, AppHeader 1, VideoFrame 1). Dialog split 5/5/5, not the estimated 7/5/3. Labels are a first pass; step 2 may move some
- [x] 1.5 (2026-11-18) ADR-027 amendment (schema: `topic`, `notes`) and ADR-030 amendment (four-tab IA, Decisions tab, R1–R8)

**2. Decision text edit pass** (needs 1)
- [x] 2.1 (2026-11-18) Edit Button's decisions (6) to the rule; internal notes move per D3. Tone approved by the developer: plain words over internal jargon (no "bleed", "consumer", "glyph", "Root"), code names in backticks, one idea per sentence, "you" for the person using the component, mechanics and enforcement go to `notes`
- [x] 2.2 (2026-11-18) CardVertical (15; 8 featured), Dialog (15; 8 featured), Accordion (2; 1 featured), DropdownMenu (1; 1 featured). Each pass also picks the featured set (D6): a spec with no featured entry shows an empty tab once 3.2 lands
- [x] 2.2b (2026-11-18) CardHorizontal (4; 3 featured, wording matched to CardVertical), AppHeader (1; 1), VideoFrame (1; 1)
- [x] 2.3 (2026-11-18) Same pass on `ruledOut[]` reasons and `figma.divergences` (Button 6/1, CardVertical 10/5, Dialog 8/6), plus Avatar, CardHorizontal, ScrollArea and TextLink, which the check flagged. Not featured (lists are short). Both gain `notes`; `spec:validate` applies the reason check to both, allowing an `ADR-NNN amendment YYYY-MM-DD` citation
- [x] 2.4 (2026-11-18) Once the backlog list is empty, make the 1.3 check an error in `validate-spec.js` (and update the ADR-027 amendment and doc 10)

**3. Template** (needs 1; can run alongside 2)
- [x] 3.1 (2026-11-18) `TABS` in `apps/docs/components.mjs`: Tokens dropped, Decisions added; the Tokens table is the last section of Spec (`#tokens`), byte-identical to the old tab for Button, CardVertical and Dialog. Nothing in the repo linked `/tokens/`; the old URLs still build as meta-refresh redirects to `spec/#tokens` (noindex), since the site is public
- [x] 3.2 (2026-11-18) Decisions tab: featured entries only, an intro line linking `<Name>.spec.json` when some are unfeatured, topic filter, Ruled out, Design–code parity, ADR links. The filter is radios plus CSS `:has()`, no script: all shown by default and wherever `:has()` is missing; the filter only appears with two or more topics. Backtick spans render as `<code>` in decisions, ruled-out rows and divergences. Checked in Playwright: Dialog 8 shown, Behaviour 3, Platform 2, with JS off and on; light and dark; no horizontal scroll at 375px. With JS off Starlight always shows dark (its theme script sets light), so light was checked with JS on
- [x] 3.3 (2026-11-18) R4: a constraint whose `enforcedBy` is only `type` is skipped (Dialog's Prop rules section is gone)
- [x] 3.4 (2026-11-18) R7: every "None recorded" removed, from the page and the table of contents; an empty use-when cell shows "—". Extended to tabs: a component with no featured decision, ruled-out option or divergence gets no Decisions tab (`tabsFor`), so Select and TextField show three tabs
- [x] 3.5 (2026-11-18) Placement check in the page frontmatter: each box's `source` (pattern name or index) must exist in `usage.json`, else the build throws. Verified by pointing a Button Don't at `limits[9]`. It catches a removed entry or an index past the end, not a reorder within range
- [x] 3.6 (2026-11-18) Rebuilt and diffed `<main>` against a pre-change build: Button and CardVertical Usage and Accessibility differ only in the tab bar

**4. Dialog page** (needs 2.2 for Dialog, 3)
- [x] 4.1 (2026-11-18) "Content" section: Title only / With description / With actions, each the Default story with changed args, stacked one per row (a staged dialog keeps its own width), then a Content / Use when table. Options and use-when lines live in `CONTENT_OPTIONS` (`apps/docs/components.mjs`), restating `usage.json` `useWhen` and patterns; whether they move into `usage.json` is for 5.1
- [x] 4.2 (2026-11-18) `apps/docs/src/placement/Dialog.tsx` as planned. A hand-built Don't sample is now wrapped in `Staged` by `Placement` when the component is in `STAGED` (the sample passes `nonModal` itself), and a staged dialog in a Placement box fills the box's width
- [x] 4.3 (2026-11-18) `apps/docs/src/accessibility/Dialog.tsx`, both figures from the staged `ConfirmAction` story. Resolved: the figures work on the inert picture, because names and Tab stops are read from the DOM with `dom-accessibility-api`, which ignores `inert`. Table: Dialog, Title, Close, Description; Tab stops Close, Cancel, Remove with the ring on Cancel. Two renderer fixes it needed: the Tab-stop list skips elements not on screen (the hidden trigger), and the sample element is memoised, since `StoryRender` makes new component types on every render and a measure remounted the sample (dropping the forced ring). Nothing takes focus or scrolls on page load
- [x] 4.4 (2026-11-18) Not marked, recorded on the page: the Spec anatomy lists every `notRendered` part under the diagram with the spec's reason ("Not marked: `Backdrop` (when nonModal is false). A pseudo-element …"). Staged pages have no backdrop to point at (R8)
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
