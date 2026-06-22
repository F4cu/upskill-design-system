---
description: Audit Figma variables against the committed tokens (drift check) — diff Figma variables against code tokens and usage, report drift/renames/broken aliases/scale-mixing, then PR intended Figma changes into the cleaned committed tokens. Use before pulling Figma variable changes into the repo.
---

# Figma variable audit

**Trigger:** Developer, before replacing `packages/tokens/src/primitives.json` with a fresh Figma export.

**When to use:** A new Figma variable export is ready and you want to understand what will break before committing it.

## Inputs (read all before starting)

- Figma variables — read via Figma MCP (`get_variable_defs` or `get_design_context` on the variables page)
- Current committed primitives — `packages/tokens/src/primitives.json`
- Current theme aliases — `packages/tokens/src/theme/light.json`, `packages/tokens/src/theme/dark.json`
- Token usage map — `packages/tokens/token-usage.json` (run `npm run token-usage` first if stale)
- Accepted divergences — the drift memory note (`figma-file-variable-drift.md`), which lists code↔Figma differences that are structural, not drift (notably unitless line-heights, which Figma can only store as fixed values)

## Steps

1. Flatten the Figma export and the committed primitives into two path→value maps.
2. Diff the maps:
   - **Removed:** paths in committed but not in Figma export → check alias map for usages
   - **Renamed:** value unchanged but path changed → check alias map for usages
   - **Added:** paths in Figma export but not in committed → no action needed
   - **Changed value:** path exists in both but value differs → note, no breakage — but first exclude *representational divergences* (step 2a); never report those as drift
2a. **Exclude representational divergences.** Figma variables cannot store unitless values, so unitless code tokens — line-height ratios (`1`, `1.25`, `1.4`, `1.5`, `1.75`) and any `$type: number` ratio — are entered in Figma as fixed values and will *always* differ. These are expected, not drift: drop them from the changed-value set. Cross-check `figma-file-variable-drift.md` and treat anything the code holds unitless as out of scope for the audit (and tagged or omitted in `figma-snapshot.json`).
3. For each removed or renamed token, list every file from `token-usage.json` `aliases` map that references it.
4. Check the export for:
   - `$extensions` blocks — must be stripped before committing
   - Figma sRGB objects instead of hex strings — must be converted
   - Scale mixing (e.g. a light-mode alias referencing a `dark-*` primitive)
   - Naming violations (keys must be `kebab-case`; numeric steps must be plain string numbers)
5. Produce the cleaned export: strip `$extensions`, convert sRGB → hex, preserve alias syntax.

## Output

A report with four sections:

```
## Removed / renamed tokens with active usages
[token path] — used in [files] — ACTION REQUIRED before merging

## Broken alias chains
[semantic token] → {primitive.path} — primitive no longer exists

## Hygiene issues
[issue type]: [details]

## Accepted divergences (excluded — not drift)
[unitless tokens Figma can't store faithfully, e.g. line-heights]

## Cleaned export
[paste of cleaned primitives.json content, ready to write to disk]
```

## Success signal

No removed or renamed token with active usages merges silently. If the report is clean, write the cleaned export to `packages/tokens/src/primitives.json`, run `npm run build:tokens`, and confirm the build passes.
