# UpSkill Design System
A **lite-agentic** design system for a SaaS product. Fixed component set, code-first tokens, and a small number of developer-triggered AI moments — no always-on agents, no orchestration layer. One person can maintain the whole system.

## Packages

| Package | Description |
|---|---|
| `@upskill/tokens` | Design tokens in W3C DTCG format, built with Style Dictionary |
| `@upskill/components` | Component library with Storybook documentation |
| `@upskill/showcase` (`apps/showcase`) | Public showcase — real generated pages plus the Pipeline Health Dashboard (`/dashboard`, `/pipeline`), deployed to GitHub Pages |

## Token architecture

Four layers resolve in order (primitives → brand → theme → device); the committed JSON is the source of truth — Figma is a downstream mirror. See [Token pipeline](docs/01-token-pipeline.md).

| Layer | Files | Purpose |
|---|---|---|
| Primitives | `primitives.json` | Raw, context-free values. Hand-edited via PR. |
| Brand | `brands/<brand>.json` | Per-brand color ramp mappings, font family, border radius |
| Theme | `theme/light.json`, `theme/dark.json` | Brand-agnostic semantic color aliases |
| Device | `device/desktop.json`, `device/tablet.json`, `device/mobile.json` | Responsive spacing and typography per breakpoint |

`npm run tokens:build` transforms DTCG source into CSS custom properties (desktop in `:root`, tablet/mobile in `@media` blocks) and JS/TS constants.

## Automation

| Tool | What it does |
|---|---|
| **GitHub Actions** | Token build check on every PR; Airtable sync on merge to `main`; showcase deploy to GitHub Pages |
| **Airtable** | Token + component governance — `status` / `owner` / `successor` / `notes`, pulled to `airtable-governance.json`. Setup and env vars: [Governance](docs/05-governance.md#environment-variables), `.env.example`. |
| **`npm run sense`** | Aggregates governance + token usage + Figma drift into `.claude/STATUS_QUO.md` — the frozen baseline agents read |

Everything recurring runs as a plain script or GitHub Action. No MCP in CI.

## Agentic moments

Agent involvement is limited to **nine developer-triggered moments** — Figma variable audit/push, token deprecation, component scaffold, layout generation, the verified add-component loop, component review, extract-learnings, and docs sync. Full index, invariants, and the loop diagram: [Agentic moments](docs/06-agentic-moments.md) (also indexed in `CLAUDE.md`).

## Observability

`npm run sense` (and `npm run sense:component <Name>`) aggregate the committed frozen-memory files into `.claude/STATUS_QUO.md`; `npm run status` / `status:board` / `status:component -- <Name>` render those snapshots as terminal views; `.claude/handoff/run-ledger.json` is the append-only ledger of per-run review telemetry. The same data also drives the [Pipeline Health Dashboard](apps/showcase) (`/dashboard`, `/pipeline`) in the public showcase. Full command reference: [CLI reference](docs/07-cli-reference.md).

## Getting started

```bash
npm install
npm run tokens:build
npm run storybook --workspace=@upskill/components
```

Airtable-backed scripts (sync, governance pull) need `AIRTABLE_API_KEY` — copy `.env.example` to `.env` and fill it in; see [Governance](docs/05-governance.md#environment-variables).

## Repository structure

```
upskill-design-system/
├── packages/
│   ├── tokens/              # Design tokens (W3C DTCG JSON + Style Dictionary config)
│   └── components/          # Coded components + Storybook
├── apps/showcase/           # Public showcase pages + Pipeline Health Dashboard
├── scripts/                 # Airtable sync, governance pull, token usage, sense
├── .claude/commands/        # Agentic moment prompts
├── docs/                    # Reference site (docs/06-agentic-moments.md, docs/07-cli-reference.md, ...)
└── docs/decisions/          # ADRs
```
