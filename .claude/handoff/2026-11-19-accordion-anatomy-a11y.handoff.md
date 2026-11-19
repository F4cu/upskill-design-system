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

- [x] Phase 1: #179 spike decides the hide mechanism (2026-11-19; developer confirmed real Cmd+F in Chrome opens the item)
- [x] Phase 2: naming + `group` role + #179 implemented, a11y tests updated, VoiceOver checked (2026-11-19; PR pending with Phases 3–4)
- [x] Phase 3: part renames across code, spec, docs marks, anatomy test; ADR-023 amendment (2026-11-19; PR pending with Phase 4)
- [x] Phase 4: spec `figma` section corrected (2026-11-19; PR held until Phase 5 so the spec never claims Figma properties that don't exist yet)
- [x] Phase 5: Figma component rebuilt; pattern frame updated; `capture-pattern-frames` re-run (2026-11-19)
- [x] Phase 6: `/document-component Accordion` republished (2026-11-19; reading-order table reduced to the Trigger row after the VoiceOver check)
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

### Phase 1 result (2026-11-19, branch `component/accordion`, headless Chromium 153 via Playwright against Storybook)

Implemented as planned: `hidden="until-found"` on `Panel` through the ref. On close it is set only after `transitionend` (`grid-template-rows`) on `PanelOuter`. `inert` covers the closing transition and comes off once until-found takes over, because inert content is skipped by find-in-page. A `beforematch` listener opens the item (controlled: `onOpenChange(true)`). On first mount, or when the transition duration is `0s`, the panel is hidden immediately.
1. **Find opens the item:** a text-fragment navigation (`#:~:text=five%20stages`, which goes through the same `beforematch` path) opened the collapsed item. `window.find()` returned `true` but fired no `beforematch`, so it doesn't count. **Real Cmd+F is unchecked: the developer still has to check it in Chrome.**
2. **Height transition kept:** sampled `PanelOuter` height, open `12→27→35→39→40`, close `38→22→9→3→0`, then `hidden=until-found` is set.
3. **Tab skips the collapsed link and the a11y tree omits collapsed content**, in both supported and fallback modes.
4. **Fallback** (`Document.prototype.onbeforematch` deleted): `inert` + `aria-hidden` as before; find doesn't reach collapsed text (matches today).

Side effect for Phase 2: jsdom has `onbeforematch`, so tests run the until-found path; the `panel.inert` test fails and has to assert `hidden="until-found"` (plus a fallback test with support stubbed out).

## Phase 2: names, role, #179

- Trigger: `aria-labelledby={titleId}`, `aria-describedby={metaId}` when `subtitle` is set.
- Panel: `role="group"`, `aria-labelledby={titleId}`.
- Apply the Phase 1 mechanism.
- *Unverified, check in VoiceOver (Safari) and in the accessibility tree:* whether the heading's name now drops the meta text. AccName honours a descendant's `aria-labelledby` during name-from-content, but VoiceOver may still read the heading's text content. If it still reads the meta text on the heading, that's acceptable (once, not three times); record what you heard.
- Update `Accordion.a11y.test.tsx`: tests that query `getByRole('region')` move to `group`; add a test that the button's name is exactly the title and its description is the meta text; add a `beforematch` test (dispatch the event) for controlled and uncontrolled items.
- Spec: rewrite `accessibility.notes` and `ariaAttributes`, the "collapsed panel stays in the page" decision, and drop the known-limitation sentence. Usage: remove the "more than about six items" `donts` entry (its reason was the region landmark); rewrite the "subtitle longer than a few words" entry (the subtitle is now a description, read after a pause, still on every item).

### Phase 2 progress (2026-11-19)

Code, tests, spec and usage done; all `AGENTS.md` gates and `lint` pass (155 a11y tests). Chrome's accessibility tree (CDP `getFullAXTree`, CourseModuleList story): heading `"The Anthropologist"`, button `"The Anthropologist"` desc `"4 hours, 30min"`, open panel group `"The Anthropologist"`; collapsed panels absent. So in Chrome the heading name drops the meta too. Spec: two `ruledOut` entries added (`region` role; naming the trigger by title + subtitle). **VoiceOver (Safari, macOS, developer, 2026-11-19), Tab through CourseModuleList:** "The Anthropologist, 4 hours, 30min, expanded, button, group", then "Design Thinking Foundations, 2 hours, 15min, collapsed, button, group". Title and meta are each read once (the description is read inline, not after a pause). Not checked: the heading reading via VO+Cmd+H (Tab skips it). Unexplained: the trailing "group" on both open and collapsed items; not the collapsed panel (not exposed), cause unknown. **Open research item** (developer, 2026-11-19), not blocking Phase 2. To find out: compare against the `main` build (region panel) to see if it predates this change; dump WebKit's tree (Playwright `webkit` or Safari Web Inspector → Node → Accessibility) and look for an `AXGroup` around the button (WebKit maps plain `div`s such as `Item` or `TitleGroup` to `AXGroup`, unverified); check whether GOV.UK's or React Aria's accordion says the same in VoiceOver. #179 acceptance items 1–3 ticked on GitHub (2026-11-19); the spec item is done in this phase but left unticked until the PR.

**Done when:** `npm run a11y:test` passes, the VoiceOver reading of one item is written into this file, and the #179 acceptance list is ticked except the spec item (that's here too, so tick it).

## Phase 3: part renames

| Old | New | Notes |
|---|---|---|
| `Subtitle` | `Meta` | Prop stays `subtitle`. Aligns with the cards' `Meta`; there it is an `Inline` container of `Duration`/`Certified`, here a single `Text`. Say so in the spec part `notes`. |
| `Chevron` | `Indicator` | Still the `Icon` component; spec `builtOn: Icon`. |
| `TitleGroup`, `PanelOuter`, `PanelInner` | keep | Layout wrappers with no Figma counterpart. Check whether the spec schema can mark a part code-only / internal; if not, note it as a divergence in Phase 4 rather than adding schema fields here (that would be a contract change needing its own decision). |

Touch: `index.tsx` (`data-part`), `Accordion.module.css` (rename `.chevron` if you like, not required), `Accordion.spec.json` (`anatomy[]`, `anatomyExamples`, `styles` keys), `apps/docs/src/accessibility/Accordion.tsx` (`marks`: replace `Subtitle` with `Meta`), anything `npm run anatomy:test` checks. `grep -rn "Chevron\|Subtitle" apps/docs packages/components/src/components/Accordion` before and after.

Record the naming rule as an **ADR-023 amendment** (reading ADR-023's existing amendments first, especially 2026-10-12 `Has <x>` booleans and 2026-11-12 reading order): a part is named by its role, not its glyph or by Figma's layer name (`Indicator`, not `Chevron`/`icon expand`; `Meta`, not `Subtitle`/the text value), and a part that plays the same role as an existing part in another component reuses that part's name (`Meta`, as in the cards). `Indicator` is the exception for now: Select and AppHeader still call the same role `Chevron` (spec only, no `data-part`); #181 renames them after this amendment lands. Name #181 in the amendment.

**Done when:** all gates in `AGENTS.md` pass (`usage:validate`, `typecheck`, `build`, `spec:validate`, `a11y:coverage`, `a11y:test`, `anatomy:test`, `lint`).

## Phase 4: spec `figma` section

Decide with the developer before Phase 5: either Figma gains text properties `Title` and `Subtitle` (plus a `Has subtitle` boolean, per ADR-023 2026-10-12) on the layers `Title` and `Meta`. Property names follow the prop, layer names follow the part: `spec:validate` (`scripts/prop-vocabulary.js`) fails a Figma property that differs from its prop by more than casing, and CardVertical already does this (part `Meta`, properties `Duration`/`Certified`). The developer kept `subtitle` on 2026-11-19 after weighing a rename, which makes the current `surface: both` true, or the spec marks them `code-only`. Recommended: add them in Figma; fill `figma.divergences` with whatever remains (the three layout wrappers; the `icon expand` wrapper if it stays).

### Phase 4 result (2026-11-19)

Developer chose: add the text properties in Figma; `Indicator` is a direct Icon instance (drop the `icon expand` wrapper, no divergence); hold the PR until Phase 5. Spec now maps `Item.title` → `Title`, `Item.subtitle` → `Has subtitle + Subtitle` (on the `Meta` layer), `Item.open` → `Open` (was wrongly `code-only`), root `children` → `code-only` (claimed a `Children` property Figma never had). `figma.sets`: `Accordion` `29:1153`, `course-module-list` example `2963:7814`. Divergences: no Root in Figma; `TitleGroup`/`PanelOuter`/`PanelInner` code-only; Panel holds a sample text layer, not a native slot.

## Phase 5: Figma rebuild (`/figma-cli`, interactive)

Target structure per variant: `Heading`/`Trigger` row (auto layout horizontal) > `Title` group (`Title`, `Meta`) + `Indicator` (the Icon component instance, or keep `icon expand` and list it as a divergence); below it, `Panel` (shown only when `Open=true`). Add `Open=true` × `Hover|Active`. Layer names = part names. Wire the text properties from Phase 4.

Before writing: snapshot every instance of the set (pitfalls in `/figma-cli`: variant restructures and property changes can reset instance overrides), then confirm the plan with the developer since it touches a published component. After: update the `course-module-list` frame (`2963:7814`) and run `node scripts/capture-pattern-frames.js`.

figma-cli note (2026-11-19): `figma-cli connect` run from inside a Claude session left the daemon dead afterwards (cause unknown). Starting it with `DAEMON_PORT=3456 DAEMON_MODE=auto node ~/projects/figma-cli/src/daemon.js` (backgrounded, log to a file) stayed up. Installed 2.2.5; 2.4.0 is available.

**Done when:** the read-back tree matches the target structure and every pre-existing instance shows the same text as before.

### Phase 5 result (2026-11-19, figma-cli 2.2.5, daemon started directly as noted above)

Before-snapshot: 83 instances (Layout Examples 50, Foundation 10, Accordion page 23; 60 are nested in the `Accordion list` set, `Show more` true/false). Changes to set `29:1153`:
- Each variant: the existing `Content` frame became `Trigger` (horizontal, padding/gap bound to `space/inset/md`/`space/inline/sm`, moved off the variant); `Title` frame → `TitleGroup`; text `4 hours, 30min` → `Meta`, body → `Text`; `Description` → `Panel` (below Trigger, padding 0/48/16/16 with left and bottom bound to `space/inset/md`, hugs its content, top-aligned). The variant is a vertical stack, 498 wide fixed.
- `Indicator` = direct instance of `chevron-up` `57:1438` / `chevron-down` `57:1441` (24px). The 4 `icon expand` wrapper instances were deleted (developer-approved); the `icon expand` set `60:1120` is now unused and was kept.
- Hover/Active overlay moved from the variant to `Trigger`. New variants `Open=true, State=Hover` `3095:8756`, `Open=true, State=Active` `3095:8764`; set laid out in two columns (Open=false left, default top-left).
- Properties `Title#3095:7`, `Has subtitle#3095:14` (default false), `Subtitle#3095:21`, wired in all 6 variants; `Has subtitle=true` set on the 23 directly placed instances.
- `course-module-list` frame: first item `Open=true`; panel texts set to the `CourseModuleList` story's.

Read-back: tree matches the target; all 83 instances show the same title/meta/body text and variant as before, except the 3 frame instances edited on purpose; meta visible on all 83. Spacing measured against the code: panel text starts at the trigger's bottom edge in both. `figma-pattern-frames.json` recaptured. Set renamed `Accordion` → `AccordionItem` to match the code export (developer, after review: every item layer read "Accordion"); all 83 instance layers now read `AccordionItem`. Figma still has no Root (`Accordion`): #182. Spec: `TitleGroup` dropped from the code-only divergence (it is a Figma frame now), `Heading` recorded as having no layer; ADR-023 amendment's last paragraph matched to that.

## Phase 6: docs page

`/document-component Accordion`: regenerate the Usage/Spec/Accessibility pages from the new spec; check the labeling marks (`Heading`, `Trigger`, `Meta`, `Panel`) and that the Accessibility tab's advice no longer says the subtitle names the button or that panels are regions.

## Out of scope

- Renaming the `subtitle` prop.
- A Figma Root (`Accordion`) component: #182.
- Splitting `Accordion`/`AccordionItem` into `Accordion.Item` compound parts (ADR-023 style). Worth a separate decision; not needed to fix the mismatch.
- The Figma parity plugin (`2026-11-19-figma-parity-plugin.handoff.md`) would catch this class of layer-name drift automatically; this handoff is a useful known-answer case for its Phase B2.
