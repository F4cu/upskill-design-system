---
description: Mirror committed tokens into Figma (code → Figma) — diff the committed source against the Figma variable inventory and write only the clean-missing variables via the Figma plugin. Use when code tokens have moved ahead of Figma. Never deletes or overwrites Figma variables without confirmation.
---

# Figma variable sync (code → Figma)

**Trigger:** Developer, when the committed tokens have moved ahead of the Figma file and Figma needs to mirror them.

**When to use:** Tokens were added or changed in `packages/tokens/src/` and you want the Figma variable collections to match. This is the inverse of the Figma token audit (which pulls Figma → code). Code is the source of truth (ADR-002 amendment); Figma is the downstream mirror, so this only ever writes to Figma, never the reverse.

This is a one-off, developer-present task — never schedule it, loop it, or put it in CI. The only write path is the Figma Plugin API via `use_figma`; there is no scriptable alternative (the REST Variables API is Enterprise-gated).

## Inputs (read all before starting)

- Committed token source — `packages/tokens/src/primitives.json`, `theme/light.json`, `theme/dark.json`, `device/{desktop,tablet,mobile}.json`. Read **source**, not built output — the source preserves the `{alias}` graph that maps to Figma variable aliases.
- Figma variable inventory — read via `use_figma` (read-only script), one dump per collection: variable name + per-mode value (hex for color, raw for number/string, `-> target/name` for aliases).
- The drift/naming memory note (`figma-file-variable-drift.md`) — the established naming-convention map and the list of accepted divergences. Update it at the end.

**Before any `use_figma` call, load the `figma-use` skill** (or read `skill://figma/figma-use/SKILL.md`). Skipping it causes hard-to-debug failures.

## Naming-convention map (code dot-path → Figma variable name)

Figma names use `/` separators (`group/sub/name`) and these project-specific rules:
- Color sub-scales are suffixed: `color.terracotta.dark.9` → `color/terracotta/dark-9`; `color.terracotta.alpha.1` → `color/terracotta/alpha-1`.
- Theme semantic scale steps are **hue-prefixed**: `color.brand.9` → `color/brand/brand-9`, `color.accent.9` → `color/accent/accent-9`, `color.neutral.9` → `color/neutral/neutral-9`. The `default` step stays `color/brand/default`.
- Other semantic paths map straight through: `color.background.button.ghost` → `color/background/button/ghost`.
- Collections & modes: **Primitives** (single mode `Value`), **Theme** (`Light`/`Dark` from the two theme files), **Device** (`Desktop`/`Tablet`/`Mobile` from the three device files). A token defined only in `desktop.json` is constant across all three device modes.

## Steps

1. Dump each Figma collection's variables (read-only `use_figma`).
2. Flatten the source token files into `figma-name → per-mode value/alias` maps using the convention map above.
3. Diff into three buckets:
   - **Clean missing** — in code, not in Figma. These are the adds.
   - **Drift** — exists in both but value/structure differs. Report; do not auto-change (may be intentional).
   - **Figma extras** — in Figma, not in code. Report; **never delete** without explicit confirmation (variables may be bound to styles/components).
4. Cross-check accepted divergences from the memory note (e.g. px line-heights) and exclude them from "drift to fix."
5. Add the clean-missing variables via `use_figma`, **dependency-ordered** (create primitive targets before the aliases that reference them):
   - `createVariable(name, collection, type)` — `'FLOAT'` for number, `'COLOR'` for color, `'STRING'` for string.
   - Concrete value → `setValueForMode(modeId, value)` (numbers raw; colors `{r,g,b[,a]}` in 0–1).
   - Alias → `setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id: targetId })`, once per mode. Cross-collection aliases (device → primitive) are valid.
   - Set `scopes` explicitly — copy from a sibling variable in the same group to match convention.
6. Verify by read-back: re-dump, confirm counts moved as expected and every new variable resolves with no broken alias.

## Output

```
## Clean missing — added to Figma
[collection] [figma/name] = [value or -> alias]  (×N)

## Drift — value/structure differs (no change made)
[figma/name]: code=[…] figma=[…]

## Figma extras — not in code (awaiting your decision; not deleted)
[figma/name]

## Accepted divergences (excluded)
[summary]
```

## Success signal

Every added variable resolves (no broken alias), collection counts increased by exactly the clean-missing count, and nothing was deleted or overwritten without confirmation. Update the drift memory note with what was reconciled.
