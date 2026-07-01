---
description: Sync design tokens to Airtable or pull governance state back into the repo. Use when pushing primitives/semantic/device tokens to Airtable, or refreshing governance.json (status/owner/successor) before token deprecation work. Uses the committed scripts, never the Airtable MCP.
---

Both directions are deterministic scripts with direct REST calls — never the
Airtable MCP, never inside a loop over many records. They require the Airtable
API key in env. For local runs, copy `.env.example` to `.env` and set
`AIRTABLE_API_KEY` (scripts auto-load repo-root `.env`; it's gitignored, and an
explicit `export` or CI secret overrides it). The PAT needs scopes
`data.records:read` + `data.records:write` and the base on its access list.

## Push tokens to Airtable (code → Airtable)

`scripts/airtable-sync.js` upserts primitives/semantic/device tokens to three
tables via REST. One-directional; runs in CI on merge to main. npm scripts wrap it:

```bash
npm run airtable:push:primitives    # primitives
npm run airtable:push:semantic      # semantic (theme)
npm run airtable:push:device        # device
npm run airtable:push:components    # component metadata (raw upsert of current snapshot)
npm run airtable:sync:components    # sense-refresh, then push components
npm run airtable:sync:all           # all four layers in order (components sense-first)
```

`push:*` upserts the current snapshot as-is; `sync:*` runs `sense` to refresh the
snapshot first, then pushes.

## Pull governance state (Airtable → code)

`scripts/airtable-pull.js` updates `packages/tokens/governance.json` — the source
of truth for token `status`, `owner`, and `successor` that agents and CI read.
Run it **before any deprecation work**:

```bash
npm run airtable:pull:governance
```

The `successor` field is a dot-path to the replacement token (e.g.
`color.terracotta.9`); it is nullable when a deprecated token has no direct
replacement. Always read governance from the committed `governance.json`, never
via the Airtable MCP. After pulling, `/token-deprecation-pass` migrates usages.
