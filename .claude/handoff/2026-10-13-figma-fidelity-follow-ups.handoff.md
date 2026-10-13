---
status: active
created: 2026-10-13
completed:
---

# Figma fidelity follow-ups: three gaps the measurements found

These are open items from the Figma fidelity measurements (`archive/2026-10-12-figma-fidelity-measurements.handoff.md`; numbers in `docs/case-study-source/08-measured-impact.md`, "Figma fidelity"). Each one is a real code ↔ Figma difference that was found and traced but deliberately not fixed during the measurement, so the numbers stayed honest. For each: decide which side is wrong, fix it through the normal path (`/figma-cli` for Figma, `/code-review` or `/review-component` for code), and record the decision. Facts were checked on `main` and the main Figma file (`t4F3b1p03loOX9IpNXRaYR`) on 2026-10-13.

Checker gaps (`builtOn`, glyph paints, nested parts, the Accordion false positive, exposed nested properties) aren't repeated here. They're in the #103 comment (issuecomment-6141939806).

## Items

### 1. ButtonArrow glyph colour: `icon/*` in Figma, `text/*` in code

- **Found by:** C pairs 09 and 10 (rated "minor").
- **Figma:** `ButtonArrow` (`61:1228`). The chevron *stroke* is bound to `color/icon/default` (neutral-11) and, on `Disabled=true`, to `color/icon/disabled` (neutral-7).
- **Code:** `ButtonArrow.module.css` sets `color: var(--ds-color-text-default)` (neutral-12) on `.button` and `var(--ds-color-text-disabled)` (neutral-8) on `:disabled`. The glyph uses `currentColor`. So Figma is one ramp step lighter in both states.
- **Leaning: fix the code.** It's the outlier. Other glyph colours in code use the icon tokens: Accordion `.chevron` uses `icon-default`, and Select uses `icon-default` / `icon-disabled`.
  - Change `ButtonArrow.module.css` to `icon-default` / `icon-disabled`.
  - Update `ButtonArrow.spec.json` `styles` (`spec:validate` will flag it otherwise) and the metadata `tokens`.
  - Check that `icon-disabled` against `overlay/subtlest` / transparent isn't held to a contrast requirement it now fails. Disabled controls are exempt from WCAG 1.4.11, but check the curated `PAIRS` list.
  - Re-run the visual baseline (ADR-019), since the screenshots will change.
- **If Figma is the side to fix instead:** rebind the two glyph strokes in all 8 variants with `/figma-cli`, then read back.
- **Done when:** both sides use the same token in both states; gates are green; the baseline is updated.

### 2. Checkbox box size: 18px unbound in Figma, `size/icon/sm` (16px) in code

- **Found by:** C pairs 15 and 16 ("box bigger, border heavier in Figma"). The border is the same token and 1.5px inside on both sides; it only looks heavier because the box is bigger.
- **Figma:** the `_Checkbox/Box` main is 18×18 with no width or height binding. Separately, the `Checkbox` set root has `space/inset/xs` top and bottom padding (68 vs 48 px tall at 2×) that the code root (`.root`, no padding) doesn't have.
- **Code:** `.checkbox` is `width`/`height: var(--ds-size-icon-sm)` (1rem), and the spec agrees.
- **Leaning: fix Figma.** Bind the `_Checkbox/Box` width and height to `size/icon/sm` and check that the checkmark still centres.
  - **Padding:** either remove it to match code, or record why it exists (e.g. a target-size affordance). If it stays, it becomes a recorded divergence in `Checkbox.spec.json` `figma.divergences`.
  - Snapshot the placed instances before and after (as Tier 3 did), because a size change reflows every form that uses it.
- **Done when:** box and root dimensions match code or are recorded divergences, and the instance diff is clean.

### 3. Spec claims of Figma properties the file doesn't have

- **Found by:** A's "after" structure checks. These are the bulk of the remaining structure gap (78.6% overall). Each prop below is `both` in its spec, but the Figma set has no such property:

| Component | A structure | Missing Figma property (spec prop → expected name) |
|---|---|---|
| AppHeader | 1/9 | `logoSrc`, `logoSrcDark`, `logoAlt`, `navItems`, `searchValue`, `userAvatarSrc`, `userName`, `userMenuItems` |
| DropdownMenu | 3/9 | `items` → Items, `open` → Open (boolean), `listRole` → List role (variant, with its values and default) |
| Image | 0/5 | `src` → Src, `alt` → Alt, `aspectRatio` → Aspect ratio (variant, with its values and default) |
| Accordion | 3/6 | `Item.title` → Title, `Item.subtitle` → Subtitle, `children` → Children |
| Select | 8/12 | `hideLabel` → Hide label (boolean), `options` → Options, `placeholder` → Placeholder |
| TextField | 14/17 | `hideLabel` → Hide label (boolean), `placeholder` → Placeholder |
| Avatar | 3/5 | `src` → Src, `alt` → Alt |
| Badge, Chip | 3/4, 7/8 | `children` → Children |
| Breadcrumb | 1/2 | `items` → Items |
| ProgressBar | 1/2 | `label` → Label |

(CardVertical `Progress.value → Value` is not on this list. It's a checker gap: the exposed nested ProgressBar property.)

- **Triage each prop into one of three outcomes:**
  1. **Spec over-claim:** the prop can't sensibly be a Figma property (`src`, `alt`, `logoSrcDark`, `searchValue`, `userMenuItems`, array props like `items`/`options`/`navItems`). Set it to `code-only`, or express it as a part (slot or instance swap) where ADR-023 says so.
  2. **Missing Figma property:** a designer should be able to set it (likely `Hide label`, `Placeholder`, Badge/Chip `Children` as a TEXT property, `Aspect ratio` if Image's ratios are a closed set, DropdownMenu `Open`). Add it in Figma with `/figma-cli` and read it back.
  3. **A new recorded mapping or divergence:** only if it fits ADR-026's rules. Don't widen the list of 7 mappings without an amendment.
- **Before deciding,** check ADR-026's `figma.surface` rules and ADR-023 (text content as a slot vs a TEXT property). An array prop drawn as repeated child instances is probably the general answer. If so, it's one ADR-026 amendment rather than 12 per-component decisions.
- **Done when:** every row is resolved, `spec:validate` passes, and a re-run of the checker (`.claude/handoff/runs/figma-fidelity/checker/`, `node score.mjs a-after` after a fresh read) shows the structure failures gone. The checker is local and gitignored. If #103 lands first, use its script instead.
