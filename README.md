# UpSkill Design System
A **lite-agentic** design system for a SaaS product. Fixed component set, code-first tokens, and a small number of developer-triggered AI moments — no always-on agents, no orchestration layer. One person can maintain the whole system.

## Packages

| Package | Description |
|---|---|
| `@upskill/tokens` | Design tokens in W3C DTCG format, built with Style Dictionary |
| `@upskill/components` | Component library with Storybook documentation |

## Token architecture

Three layers resolve in order; the committed JSON is the source of truth — Figma is a downstream mirror.

| Layer | Files | Purpose |
|---|---|---|
| Primitives | `primitives.json` | Raw, context-free values. Hand-edited via PR. |
| Theme | `theme/light.json`, `theme/dark.json` | Semantic color aliases |
| Device | `device/desktop.json`, `device/tablet.json`, `device/mobile.json` | Responsive spacing and typography per breakpoint |

`npm run build:tokens` transforms DTCG source into CSS custom properties (desktop in `:root`, tablet/mobile in `@media` blocks) and JS/TS constants.

## Automation

| Tool | What it does |
|---|---|
| **GitHub Actions** | Token build check on every PR; Airtable sync on merge to `main` |
| **Airtable** | Token governance — `status` / `owner` / `successor` / `notes` per token, pulled to `governance.json` |
| **`npm run sense`** | Aggregates governance + token usage + Figma drift into `.claude/STATUS_QUO.md` — the frozen baseline agents read |

Everything recurring runs as a plain script or GitHub Action. No MCP in CI.

## Agentic moments

Six developer-triggered commands where Claude reads structured repo context and produces something a script can't:

| Command | What it does |
|---|---|
| `/figma-variable-audit` | Drift check: Figma variables vs. committed tokens; produces a cleanup PR |
| `/figma-variable-push` | Writes clean-missing variables into Figma (code → Figma) |
| `/token-deprecation-pass` | Migrates deprecated token usages to their successors |
| `/component-scaffold` | Scaffolds a new component from the fixed set |
| `/layout-generation` | Generates a React component tree from a one-paragraph brief |
| `/add-component` | Full verified loop: sense → scaffold → gate → adversarial review → PR |

## Getting started

```bash
npm install
npm run build:tokens
npm run storybook --workspace=@upskill/components
```

## Repository structure

```
upskill-design-system/
├── packages/
│   ├── tokens/              # Design tokens (W3C DTCG JSON + Style Dictionary config)
│   └── components/          # Coded components + Storybook
├── scripts/                 # Airtable sync, governance pull, token usage, sense
├── .claude/commands/        # Agentic moment prompts
└── docs/decisions/          # ADRs
```
