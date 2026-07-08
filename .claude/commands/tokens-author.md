---
description: Author or change design tokens locally — add or edit a primitive token, add a semantic theme/device alias, or modify the Style Dictionary build/transforms, then rebuild and verify outputs. Use when editing primitives.json, theme/*.json, device/*.json, or style-dictionary.config.js.
model: sonnet
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

Tokens are authored as code (ADR-002 amendment): the committed DTCG JSON in
`packages/tokens/src/` is the source of truth, Figma is a downstream mirror.
Components only ever consume the built output (`packages/tokens/dist/`), never
the source JSON — so every change here ends with a rebuild and an output check.

## Add a new primitive token

Edit `packages/tokens/src/primitives.json`. Follow the existing structure for the
category (`color`, `space`, `font`, etc.). Every token needs `$type` and
`$value`. Concrete value: `{ "$type": "color", "$value": "#D15D50" }`.

Then rebuild and verify both outputs:

```bash
npm run tokens:build   # → packages/tokens/dist/{css,js}
```

## Add a semantic alias

Edit the appropriate `theme/light.json` / `theme/dark.json` or
`device/{desktop,tablet,mobile}.json` file. Use curly-brace alias syntax
referencing the **deepest** primitive path: `{color.terracotta.9}`, not
`{color.terracotta}`. Never put raw values in theme/device files — they only
alias primitives. Rebuild as above and confirm no alias references broke.

## Change a primitive token

Edit `packages/tokens/src/primitives.json` directly via PR. Figma is a downstream
mirror, not the upstream source — a value invented in Figma is a proposal until it
lands here. If Figma has diverged and you want to pull intended changes in, run
`/figma-variable-audit` first (drift check) rather than overwriting blindly.

## Modify the Style Dictionary build

Edit `packages/tokens/style-dictionary.config.js`. Custom transforms live
alongside it (px→rem, font-weight string→numeric, `$root` rename, media-query
combiner). After any change, rebuild and **diff the CSS output** — transform
changes can silently rename custom properties that components depend on.

Adding, removing, or changing the behaviour of a transform is an architectural
change — record or amend an ADR (see CLAUDE.md → "Architectural decisions").

## Conventions

- Keys use `kebab-case` for multi-word names (`border-radius`, `font-size`).
- Numeric scale steps are plain numbers as string keys (`"1"`–`"12"`, `"100"`–`"800"`).
- No trailing commas (strict JSON). No `$extensions` in source.
- Line-heights are unitless ratios (`1`, `1.25`, `1.4`, `1.5`, `1.75`) — never px.
- Don't mix color sub-scales on one token: `1–12` (light), `dark-1…dark-12`, `alpha-1…alpha-12`.

## After authoring — downstream sync

Token changes propagate to two downstream systems. Always close out with:

| What changed | Action |
|---|---|
| Any semantic token added or renamed (`theme/*.json`) | Run `/figma-variable-push` to add the new Figma variables. Old names become Figma extras — report them; never delete without confirmation. |
| Any primitive added (`primitives.json`) | Run `/figma-variable-push` if the primitive is an alias target for a new semantic token; otherwise Airtable sync is enough. |
| Airtable (all token changes) | `npm run airtable:push:semantic` (theme) or `npm run airtable:push:primitives` (primitives) — already part of CI on merge, but run manually if you need it immediately. |

Figma sync is interactive and developer-present — it cannot be scripted or automated.
