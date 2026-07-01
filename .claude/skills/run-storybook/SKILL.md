---
name: run-storybook
description: Build and run Storybook and drive it headlessly. Use when asked to start Storybook, build the tokens or components, screenshot a component/story, check a story renders in light/dark, or verify a component change in the running app.
---

The runnable app is **Storybook** — the documentation/dev environment for the
coded components, served by Vite on port 6006. There is no end-user app; you
"run" the system by building tokens → components, launching the Storybook dev
server, then driving its story iframes headlessly with Playwright via
`.claude/skills/run-upskill-design-system/driver.mjs` (screenshots, console-error
checks). The token build and `metadata:validate`/`typecheck`/`build` are the
non-visual checks every component change must pass.

All paths below are relative to the repo root
(`/Users/facundorosales/projects/upskill-design-system`).

## Prerequisites

- Node 20+ (verified on v24.16.0), npm 10+ (v11.13.0).
- Playwright is **not** a project dependency — it's harness-only for `driver.mjs`.
  Install it on demand without touching `package.json`:

```bash
npm install --no-save playwright
npx playwright install chromium   # only if browsers aren't already cached
```

Node resolves `playwright` from the repo-root `node_modules`, so the driver works
from inside the skill directory without further config.

## Setup

```bash
npm install
```

## Build

Tokens must be built before components/Storybook — components consume the built
CSS/JS, never the source JSON.

```bash
npm run tokens:build   # Style Dictionary → packages/tokens/dist/{css,js}
npm run build          # tokens:build + tsc + vite build of @upskill/components
```

Non-visual checks a component change must pass (all run clean on a healthy tree):

```bash
npm run metadata:validate   # validates *.metadata.json against component.schema.json
npm run typecheck           # tsc --noEmit in @upskill/components
```

## Run (agent path)

Start the Storybook dev server in the background and poll until it serves
(macOS has no `timeout`, so use a plain `until` loop, not `timeout`):

```bash
pkill -f 'storybook dev' 2>/dev/null   # clear any stale server first
npm run storybook -- --ci --quiet > /tmp/storybook.log 2>&1 &
echo $! > /tmp/storybook.pid
until curl -sf http://localhost:6006/iframe.html >/dev/null 2>&1; do sleep 1; done
echo "ready"   # first cold start ~10-20s while Vite optimizes deps
```

Drive it with the committed driver (story ids are the `kebab--variant` ids from
`http://localhost:6006/index.json`):

```bash
cd .claude/skills/run-upskill-design-system
node driver.mjs list button                          # list story ids (optional substring filter)
node driver.mjs shot components-button--default      # screenshot a story (light)
node driver.mjs shot components-button--all-combinations --theme dark
node driver.mjs errors components-appheader--default # report console errors only
```

Screenshots land in `.claude/skills/run-upskill-design-system/shots/`
(gitignored), named `<story-id>[.<theme>].png`, or `--out <file>` to override.
**Actually open the PNG** — `shot` also prints any console errors after saving.

| command | what it does |
|---|---|
| `list [filter]` | list story ids, optionally filtered by substring |
| `shot <id> [--theme dark] [--out f.png]` | full-page screenshot of a story; prints console errors too |
| `errors <id> [--theme dark]` | launch the story, print only its console/page errors |

Override the server URL with `STORYBOOK_URL` (default `http://localhost:6006`).

Stop the server when done:

```bash
kill $(cat /tmp/storybook.pid)   # or: pkill -f 'storybook dev'
```

## Run (human path)

```bash
npm run storybook   # opens http://localhost:6006 in a browser; Ctrl-C to stop
```

Useless headless — it just waits for a browser. Use the agent path above instead.

## Gotchas

- **Dark-mode screenshots still show a white page background.** The theme global
  (`&globals=theme:dark`, set by `--theme dark`) flips `data-theme` on
  `<html>` and recolors *components*, but story `<body>` stays transparent
  (`rgba(0,0,0,0)`). A white backdrop in a dark screenshot is expected — judge
  the component, not the page. Verify the toggle worked by checking
  `document.documentElement.getAttribute('data-theme')`, not the backdrop.
- **No `timeout` on macOS.** Poll readiness with an `until curl` loop; `timeout 30 bash -c …` fails with "command not found."
- **Cold first start is slow.** Vite re-optimizes deps on the first launch after a
  lockfile change ("Storybook ready!" prints, but `/iframe.html` 404s for a few
  more seconds) — poll `/iframe.html`, don't `sleep`.
- **`docs` entries aren't stories.** `/index.json` includes `*--docs` autodocs
  pages; `driver.mjs list` already filters to `type === 'story'`.

## Troubleshooting

- **`Cannot find package 'playwright'`**: run `npm install --no-save playwright`
  (see Prerequisites). It's intentionally not in `package.json`.
- **`index.json 404 — is Storybook running?`** (from the driver): the dev server
  isn't up yet or died — check `/tmp/storybook.log` and re-run the launch block.
- **`EADDRINUSE` / port 6006 busy**: a previous server is still running —
  `pkill -f 'storybook dev'` before relaunching.
- **Screenshot is blank**: the story id is wrong or the component threw — run
  `node driver.mjs errors <id>` and check the printed console errors.
