---
description: Migrate usages of deprecated tokens to their successors — read airtable-governance.json + token usage report + component metadata and produce a migration PR replacing each usage with its successor token. Use after tokens are marked deprecated in Airtable.
model: sonnet
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Token deprecation pass

**Trigger:** Developer, after marking one or more tokens as `deprecated` in Airtable and running `npm run airtable:pull:governance`.

**When to use:** `packages/tokens/airtable-governance.json` contains tokens with `"status": "deprecated"` and you want a migration PR that eliminates all usages.

## Inputs (read all before starting)

- Token source `$deprecated` markers — `packages/tokens/src/primitives.json`, `packages/tokens/src/theme/{light,dark}.json`. This is the durable in-source record (ADR-002 amendment, 2026-07-13); `airtable-governance.json` remains the governance mirror and the two must agree — `npm run tokens:deprecations:check` verifies that. A token's successor is discoverable straight from its `$deprecated` message (`"Replaced by {path}."`) without an Airtable pull.
- Governance state — `packages/tokens/airtable-governance.json`
- Token usage map — `packages/tokens/token-usage.json` (run `npm run tokens:usage` first if stale)
- Theme alias files — `packages/tokens/src/theme/light.json`, `packages/tokens/src/theme/dark.json`
- Device token files — `packages/tokens/src/device/desktop.json`, `packages/tokens/src/device/tablet.json`, `packages/tokens/src/device/mobile.json`
- Component source — `packages/components/src/` (for CSS Module edits)

## Steps

0. Run `npm run tokens:deprecations:check`. If it reports out of sync, run `npm run tokens:deprecations` first so source `$deprecated` markers match governance before collecting anything.
1. Collect all deprecated tokens from `airtable-governance.json` (both `primitives` and `semantic` sections).
2. For each deprecated token:
   a. Look up its `successor` (dot-path). If `successor` is null, flag it — no automated migration is possible; note it for manual review.
   b. From `token-usage.json`:
      - **alias usages:** find every theme/device file that references `{deprecated.token.path}` and replace with `{successor.token.path}`
      - **CSS usages:** find every component file that uses `var(--ds-<css-name>)` and replace with `var(--ds-<successor-css-name>)`. Convert dot-path to CSS name by replacing `.` with `-` and prepending `--ds-`.
3. After all replacements, run `npm run tokens:build` and confirm no alias errors.
4. Run `npm run tokens:usage` and confirm the deprecated token paths no longer appear in either map.
5. This pass edits component CSS, so run the full deterministic gate before opening the migration PR:
   `npm run tokens:contrast-check && npm run metadata:validate && npm run typecheck && npm run build -w @upskill/components`.

## Output

A summary of every file changed:

```
## Migrations applied
[deprecated token] → [successor]
  - [file]: {old.ref} → {new.ref}

## Tokens with no successor (manual review required)
[token path] — used in [files] — no successor defined in airtable-governance.json

## Next step
After PR merges: remove deprecated token entries from primitives.json (or theme JSON),
rebuild, and re-run airtable:pull:governance to confirm clean state.
```

## Success signal

`npm run tokens:usage` shows zero references to any deprecated token path. The step-5 gate (contrast, metadata, typecheck, component build) passes. PR is ready to merge.
