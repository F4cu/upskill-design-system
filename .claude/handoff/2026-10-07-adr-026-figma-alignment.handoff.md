---
status: active
created: 2026-10-07
completed:
---

# ADR-026 — Figma alignment pass

ADR-026 (prop vocabulary) and PR #115 (drift migration) changed prop names in code. Figma has to follow, and one mapping in the ADR was never verified against the file. This is interactive work with Figma Desktop open: use `/figma-cli` (Figma MCP as fallback). Never run it in CI. File key `t4F3b1p03loOX9IpNXRaYR`.

**Read first:** `docs/decisions/026-component-prop-vocabulary.md` (the "Figma names" table and the drift table), `.claude/rules/components.md` → "Prop vocabulary".

**Scope:** component properties and layer names only. No variables (that's `/figma-variable-audit` / `/figma-variable-push`). Don't create or delete components.

## 1. Chip: `selected` → `pressed` (node `29:1257`)

Code renamed Chip's `selected` boolean to `pressed` (PR #115).

- [ ] Inspect the Chip component set's properties. The axis is probably `Selected` (boolean or variant). Rename it to `Pressed`, keeping the values and default (`false`).
- [ ] Check that instances on the Homepage frames keep their state after the rename (Figma keeps overrides when the property is renamed in place, but verify).
- [ ] If Chip's Figma set also has an interaction `State` variant, leave it as is: `State` is reserved for interaction (ADR-025).

## 2. Verify the `variant` ↔ `Style` mapping

ADR-026 records `variant` ↔ `Style` as a mapping. That was inferred from ADR-024, which only names **Button's** Figma property. At least one metadata file contradicts it: `CardHorizontal.metadata.json` says *"Figma: Variant=inverted"*.

- [ ] For every component set whose code has a `variant` axis, record the Figma property name: Button `57:1265`, CardHorizontal `130:7289`. Badge and Card have no Figma component set (per their metadata), so skip them.
- [ ] **Decide one name**, either `Style` or `Variant`, and rename the outliers in Figma.
- [ ] If the answer is `Variant`, the mapping row goes away (casing-only match). Update the ADR-026 "Figma names" table and the `components.md` Figma line in the same commit. If the answer is `Style`, fix the CardHorizontal metadata note.

## 3. Property inventory against the vocabulary

One read-only pass over the component sets that have a `figmaNodeId` (`grep figmaNodeId packages/components/src/components/*/*.metadata.json`). For each component set, compare its property names, values and defaults with the code props.

- [ ] A difference in casing only is fine.
- [ ] Any other difference is either fixed in Figma, or added to the ADR-026 "Figma names" table as a recorded mapping with a reason.
- [ ] Booleans use state names that default to `false`. `Has <x>` is the only allowed visibility prefix (ADR-023).
- [ ] Note any Figma property whose code counterpart breaks the vocabulary. That's a code follow-up, not a Figma fix: file an issue, don't fix it in this pass.

## 4. Check for overlap with ADR-024's open Figma follow-ups

ADR-024 → Consequences lists these Figma follow-ups:
- rename Button `Style` values to `Accent` / `Neutral` / `Transparent` / `Danger`;
- move CardVertical's overlay buttons to the halo treatment;
- push the new variables.

- [ ] Check whether each one is done. If not, and it's cheap, batch it into this session, since it's the same file, the same tool, and step 2 touches Button anyway. Variable pushes stay with `/figma-variable-push`.

## Not in scope

- **TextField sizes:** code moved `default|large` → `md|lg`, but TextField has no Figma component set (metadata `figmaNodeId` says so), so there is nothing to rename.
- **DropdownMenu and AppHeader renames** (`value`, `open`/`onOpenChange`, `onSearchValueChange`) are code-only props.

## Done when

- The Chip set exposes `Pressed`, and placed instances keep their state.
- One name is used for the variant axis across the component sets, and ADR-026's mapping table matches the file.
- Every remaining Figma ↔ code difference is either fixed or listed in ADR-026 with a reason.
- The ADR-026 drift table's "Figma `Selected` property still to rename" note is removed.
- This handoff's frontmatter is set to `status: done`, then `npm run handoff:tidy`.
