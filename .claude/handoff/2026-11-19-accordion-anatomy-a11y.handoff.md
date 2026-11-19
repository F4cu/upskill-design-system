---
status: active
created: 2026-11-19
completed:
---

# Accordion: anatomy names, screen-reader naming, find-in-page (#179), Figma rebuild

The Accordion's docs page (`/components/accordion/accessibility/`) labels parts that don't exist in Figma (`Chevron` vs `icon expand`, `Subtitle` vs an unnamed metadata text layer), the Figma component is structured differently from the code, and a screen reader hears "The Anthropologist 4 hours, 30min" three times per item. Code is the source of truth (ADR-002): fix the code contract first, rebuild Figma to match it, then republish the docs page. Folds in #179.

**Settled decisions (developer, 2026-11-19), do not relitigate:**
- **Part names** (role-based): `Root`, `Item`, `Heading`, `Trigger`, `Title`, `Meta` (was `Subtitle`; matches CardVertical/CardHorizontal `Meta`, styled the same: `size="metadata"`, `color="subtle"`), `Indicator` (was `Chevron`), `Panel`. The **prop stays `subtitle`**: renaming it is a breaking API change for no reader benefit. Only the part (`data-part`, spec `anatomy[]`, Figma layer) is renamed.
- **Panel role: `group`**, not `region` (React Aria's `DisclosurePanel` default). Removes the landmark-proliferation limit (usage.json's "about six open items" don't).
- **Accessible names:** the trigger is named by the **title only**; the meta text becomes its description (`aria-describedby`). The panel is labelled by the title only.
- **Direction:** Figma is rebuilt to match code. Figma's current layout (panel text inside the same `Content` frame as the title, icon beside both) can't exist in code: the panel can't live inside the heading button (APG: "The button element is the only element inside the heading element").

## Progress

Tick an item when its "Done when" is met, and add the date and PR number. Order is build order.

- [ ] Phase 1: #179 spike decides the hide mechanism
- [ ] Phase 2: naming + `group` role + #179 implemented, a11y tests updated, VoiceOver checked
- [ ] Phase 3: part renames across code, spec, docs marks, anatomy test; ADR-023 amendment
- [ ] Phase 4: spec `figma` section corrected
- [ ] Phase 5: Figma component rebuilt; pattern frame updated; `capture-pattern-frames` re-run
- [ ] Phase 6: `/document-component Accordion` republished
- [ ] Close #179; handoff `status: done`, `npm run handoff:tidy`

Phases 1–4 are code and go through `/review-component Accordion` (interactive component → `full` path, branch `component/accordion`, PR). Phase 6 is its own `document/accordion` PR (ADR-030).

## Verified facts (2026-11-19)

**Code** (`packages/components/src/components/Accordion/index.tsx`):
- DOM: `div[Root] > div[Item] > hN[Heading] > button[Trigger] > div[TitleGroup] > (span[Title], span[Subtitle]?) + svg[Chevron]`; then `div[PanelOuter] > div[PanelInner] > div[Panel role=region aria-labelledby=trigger]`.
- `data-part` is **not** failing: `Icon` and `Text` spread `...rest`, so every part attribute reaches the DOM. The mismatch is naming, not mechanism.
- Collapsed panel: `inert` + `aria-hidden` set via a ref in a `useLayoutEffect` (which also moves focus to the trigger if focus was inside). Height animates via `grid-template-rows: 0fr → 1fr`.
- Spec (`Accordion.spec.json`) decision rejects the `hidden` attribute because it breaks the height transition. That decision is what #179 has to revisit.

**Why the triple announcement** (reasoned from the markup, *not yet confirmed with a screen reader*): heading name = its content = button text = title + subtitle; button name = title + subtitle; region name = `aria-labelledby` → the trigger = title + subtitle. Three roles, one string.

**Figma** (file `t4F3b1p03loOX9IpNXRaYR`, set `29:1153`, read via figma-cli):
- Set `Accordion`, props `Open: true|false`, `State: Default|Hover|Active`. **No text properties.**
- Variants: `Open=true,State=Default`, `Open=false,State=Default|Hover|Active`. **Missing:** `Open=true` Hover/Active (code applies hover/active in both states).
- Tree (each variant, horizontal auto layout): `Content` (vertical) > `Title` (vertical) > (`Title` text, `4 hours, 30min` text) + `Description` > body text; sibling `icon expand` (wrapper component) > `chevron-up|chevron-down` instance.
- No `Root`/`Item` split: the set is a single item. Pattern frame `course-module-list` is node `2963:7814` (`figma-pattern-frames.json`).
- The spec claims `Item.title` and `Item.subtitle` have Figma property `Title`/`Subtitle` (`surface: both`). False today.

**Other systems (checked):**
- WAI-ARIA APG: heading wraps a button that is its only child; "Avoid using the region role in circumstances that create landmark region proliferation, e.g., in an accordion that contains more than approximately 6 panels that can be expanded at the same time."
- React Aria `Disclosure`: parts `Disclosure`, `DisclosureHeader` (wraps `Heading`), `Button slot="trigger"`, `DisclosurePanel`; panel `role` is `group | region`, default `group`.
- GOV.UK Frontend (`accordion.mjs`, main): calls the metadata line a **summary**; no role on the content; collapsed content gets `hidden="until-found"`, and a document-level `beforematch` listener (guarded by `'onbeforematch' in document`) expands the matched section. Button name is an explicit `aria-label` of heading, summary and "Show/Hide this section".

## Phase 1: #179 spike (decides the hide mechanism)

Do this first: it decides whether `inert` + `aria-hidden` survive, which Phase 2 builds on.

Try `hidden="until-found"` on the collapsed panel (set through the existing ref; `@types/react` 18 types neither it nor `onbeforematch`) plus a `beforematch` listener on the panel that opens the item (controlled → `onOpenChange(true)`, uncontrolled → internal state). Check in Chrome:
1. Cmd+F finds text in a collapsed panel and opens it.
2. The height transition still runs on open and close. `hidden=until-found` applies `content-visibility: hidden`; the risk is that the grid row collapses instantly. Candidate: put `hidden` on `Panel` (inside `PanelInner`'s `overflow: hidden`), and on close set it only after `transitionend` on `PanelOuter`.
3. Tab skips collapsed content and the screen reader doesn't read it (`hidden=until-found` content is not rendered, so `inert`/`aria-hidden` may become redundant; keep them where the attribute isn't supported).
4. Unsupported browsers (`!('onbeforematch' in document)`) fall back to today's `inert` + `aria-hidden`.

**Done when:** a recorded result for 1–4. If 2 can't be kept, stop and ask the developer to choose between find-in-page and the animation; don't pick.

## Phase 2: names, role, #179

- Trigger: `aria-labelledby={titleId}`, `aria-describedby={metaId}` when `subtitle` is set.
- Panel: `role="group"`, `aria-labelledby={titleId}`.
- Apply the Phase 1 mechanism.
- *Unverified, check in VoiceOver (Safari) and in the accessibility tree:* whether the heading's name now drops the meta text. AccName honours a descendant's `aria-labelledby` during name-from-content, but VoiceOver may still read the heading's text content. If it still reads the meta text on the heading, that's acceptable (once, not three times); record what you heard.
- Update `Accordion.a11y.test.tsx`: tests that query `getByRole('region')` move to `group`; add a test that the button's name is exactly the title and its description is the meta text; add a `beforematch` test (dispatch the event) for controlled and uncontrolled items.
- Spec: rewrite `accessibility.notes` and `ariaAttributes`, the "collapsed panel stays in the page" decision, and drop the known-limitation sentence. Usage: remove the "more than about six items" `donts` entry (its reason was the region landmark); rewrite the "subtitle longer than a few words" entry (the subtitle is now a description, read after a pause, still on every item).

**Done when:** `npm run a11y:test` passes, the VoiceOver reading of one item is written into this file, and the #179 acceptance list is ticked except the spec item (that's here too, so tick it).

## Phase 3: part renames

| Old | New | Notes |
|---|---|---|
| `Subtitle` | `Meta` | Prop stays `subtitle`. Aligns with the cards' `Meta`; there it is an `Inline` container of `Duration`/`Certified`, here a single `Text`. Say so in the spec part `notes`. |
| `Chevron` | `Indicator` | Still the `Icon` component; spec `builtOn: Icon`. |
| `TitleGroup`, `PanelOuter`, `PanelInner` | keep | Layout wrappers with no Figma counterpart. Check whether the spec schema can mark a part code-only / internal; if not, note it as a divergence in Phase 4 rather than adding schema fields here (that would be a contract change needing its own decision). |

Touch: `index.tsx` (`data-part`), `Accordion.module.css` (rename `.chevron` if you like, not required), `Accordion.spec.json` (`anatomy[]`, `anatomyExamples`, `styles` keys), `apps/docs/src/accessibility/Accordion.tsx` (`marks`: replace `Subtitle` with `Meta`), anything `npm run anatomy:test` checks. `grep -rn "Chevron\|Subtitle" apps/docs packages/components/src/components/Accordion` before and after.

Record the naming rule as an **ADR-023 amendment** (reading ADR-023's existing amendments first, especially 2026-10-12 `Has <x>` booleans and 2026-11-12 reading order): a part is named by its role, not its glyph or by Figma's layer name (`Indicator`, not `Chevron`/`icon expand`; `Meta`, not `Subtitle`/the text value), and a part that plays the same role as an existing part in another component reuses that part's name (`Meta`, as in the cards).

**Done when:** all gates in `AGENTS.md` pass (`usage:validate`, `typecheck`, `build`, `spec:validate`, `a11y:coverage`, `a11y:test`, `anatomy:test`, `lint`).

## Phase 4: spec `figma` section

Decide with the developer before Phase 5: either Figma gains text properties `Title` and `Meta` (plus a `Has meta` boolean, per ADR-023 2026-10-12), which makes the current `surface: both` true, or the spec marks them `code-only`. Recommended: add them in Figma; fill `figma.divergences` with whatever remains (the three layout wrappers; the `icon expand` wrapper if it stays).

## Phase 5: Figma rebuild (`/figma-cli`, interactive)

Target structure per variant: `Heading`/`Trigger` row (auto layout horizontal) > `Title` group (`Title`, `Meta`) + `Indicator` (the Icon component instance, or keep `icon expand` and list it as a divergence); below it, `Panel` (shown only when `Open=true`). Add `Open=true` × `Hover|Active`. Layer names = part names. Wire the text properties from Phase 4.

Before writing: snapshot every instance of the set (pitfalls in `/figma-cli`: variant restructures and property changes can reset instance overrides), then confirm the plan with the developer since it touches a published component. After: update the `course-module-list` frame (`2963:7814`) and run `node scripts/capture-pattern-frames.js`.

figma-cli note (2026-11-19): `figma-cli connect` run from inside a Claude session left the daemon dead afterwards (cause unknown). Starting it with `DAEMON_PORT=3456 DAEMON_MODE=auto node ~/projects/figma-cli/src/daemon.js` (backgrounded, log to a file) stayed up. Installed 2.2.5; 2.4.0 is available.

**Done when:** the read-back tree matches the target structure and every pre-existing instance shows the same text as before.

## Phase 6: docs page

`/document-component Accordion`: regenerate the Usage/Spec/Accessibility pages from the new spec; check the labeling marks (`Heading`, `Trigger`, `Meta`, `Panel`) and that the Accessibility tab's advice no longer says the subtitle names the button or that panels are regions.

## Out of scope

- Renaming the `subtitle` prop.
- Splitting `Accordion`/`AccordionItem` into `Accordion.Item` compound parts (ADR-023 style). Worth a separate decision; not needed to fix the mismatch.
- The Figma parity plugin (`2026-11-19-figma-parity-plugin.handoff.md`) would catch this class of layer-name drift automatically; this handoff is a useful known-answer case for its Phase B2.
