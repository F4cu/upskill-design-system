---
description: Drive Figma Desktop through figma-cli for mechanical, repetitive canvas work — renaming/labeling layers, restructuring components, binding variables, read-only inspection. Also the transport the two figma-variable moments use. Local and interactive only; never CI.
allowed-tools: Read, Glob, Grep, Bash, ReadMcpResourceTool
---

# figma-cli (local Figma canvas automation)

**Trigger:** Developer, for a bounded canvas task with Figma Desktop open — e.g. "rename every layer in the Button set to the variant naming convention", "bind the Card fills to `color/background/card`", "list components missing a description".

**What it is:** `figma-cli` (installed globally from `~/projects/figma-cli`, not a repo dependency) runs Figma Plugin API code in the open Figma Desktop file over a local, unauthenticated CDP port (`127.0.0.1:9222`) and a daemon on `127.0.0.1:3456`. No API key, no REST, no plan limits. It sits in the same category as the Figma MCP: an interactive, developer-present tool (ADR-002, 2026-10-01 amendment).

**Variables are not this command's job.** Adding/reconciling variables goes through `/figma-variable-push` (writes) and `/figma-variable-audit` (reads/drift), which use figma-cli as their transport. Use this command for everything else on the canvas.

## Hard rules (these override figma-cli's own bundled rules)

1. **Never in CI, a script loop, or a scheduled run.** It needs Figma Desktop on this machine. Never add it to `package.json` or `.github/workflows/`.
2. **Show the commands you run** and summarise what changed (node ids, counts). Ignore figma-cli's "never show terminal commands" rule.
3. **Never delete nodes, variables, styles, or components** without explicit confirmation naming each one. Never overwrite an existing variable value — that is drift, reported by the variable moments.
4. **Code is the source of truth (ADR-002).** Never write Figma state back into `packages/tokens/src/`. Forbidden (denied in `.claude/settings.json`): `import`, `tokens …` presets, `export dtcg`, `snapshot` (`figma-variables.json` is the only Figma snapshot), `init-agent`.
5. **Repo vocabulary wins.** Component and variant names come from `packages/components/src/components/<Name>/<Name>.metadata.json`; variable names follow the naming map in `/figma-variable-push`. Don't use `shadcn add` or `blocks create` — the component set is fixed (AGENTS.md "Components").
6. **Default brand only, accepted divergences excluded** (line-heights stored as px; brand layer unmirrored — `figma-file-variable-drift.md`).

## Steps

1. **Connect.** `figma-cli daemon status`; if not connected, ask the developer to run `! figma-cli connect` (a Figma update reverts the Yolo patch; `connect` re-applies it). If the wrong file is targeted, prefix commands with `FIGMA_FILE="<file name>"`.
2. **Read in one call.** One `figma-cli eval` that returns only what the task needs (ids, names, counts). Use the async APIs (`getNodeByIdAsync`, `getLocalVariablesAsync`, …), call `await figma.loadAllPagesAsync()` before searching beyond the current page, prefer `findAllWithCriteria` over `findAll`. Output over 20,000 characters is cut — narrow the query or split by page/group. Long code: write it to the session scratchpad and run `eval --file`.
3. **Plan the change and confirm it** with the developer when it touches more than one component or anything shared (styles, variables, published components).
4. **Write in one call.** `eval` for Plugin API mutations (rename, bind via `$bind`, set descriptions, component properties); `render` / `render-batch` only when creating new frames (never create visual nodes via `eval`).
5. **Verify.** Re-read with `eval` (counts and names moved as expected) or `figma-cli verify <id> --measure` for a visual change. `figma-cli undo` reverts the last figma-cli operation if it went wrong.

## Plugin API pitfalls (seen 2026-10-07)

- **A runaway `eval` freezes Figma Desktop** and kills the daemon; recovery is a force-quit plus `connect`. Bound every loop (`for (let i = 0; i < 30 && p && p.type !== "PAGE"; i++) p = p.parent`) and run evals under a shell time limit.
- **`clone()` drops `componentPropertyReferences`.** A variant duplicated into a set must have its layers re-wired to the set's properties, or they ignore them.
- **A new bound paint keeps its base color until Figma re-resolves it**, so a render can show the placeholder color (black). Build the paint with `variable.resolveForConsumer(node).value` as its base color.
- **The default variant is the top-left one on the canvas**, not `children[0]`. Set it by moving variants.
- **An instance-swap property's value is shared by every variant in the set.** A nested instance bound to one can't have a different preset per variant, and deleting the property resets every instance's nested choice. Snapshot the instances (nested main + properties) before deleting it, then restore them.
- **A parent variant flip keeps nested overrides only for properties the two presets agree on.** Make variants that drive a nested part differ only in the driving state.
- **A variant dragged outside its set's boundary becomes a standalone component renamed `Set/value`** (for example, `TextField/true`). If a variant seems to be missing, search by the set name, not by the variant name, then regroup it with `combineAsVariants`. Snapshot the instances first, because regrouping can re-key the properties.
- **Changing a component default changes every layer that inherits it.** Before changing a box or part default, pin the values the variants and instances rely on, then compare a read-back with the values from before.
- **A truncated snapshot fails silently.** Output past 20,000 characters is cut mid-JSON. Parse the before-snapshot (and slice it by instance index if it is large) before running the write, never in the same command (2026-10-10: 75 Button icon instances lost their before-state this way).

## Output

```
## Changed
[node/page] — [what changed] (×N)

## Skipped / needs a decision
[node] — [why]
```

## Success signal

The canvas change matches the confirmed plan, the read-back confirms counts, and nothing was deleted or overwritten without confirmation. If the task surfaced a durable naming or structure convention, route it per CLAUDE.md "Where knowledge lives" (usually component metadata via `/extract-learnings`).
