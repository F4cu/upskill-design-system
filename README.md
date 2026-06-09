# UpSkill Design System

A monorepo design system with a full token pipeline — from Figma variables through Style Dictionary to coded components and Storybook documentation.

## Packages

| Package | Description |
|---|---|
| `@upskill/tokens` | Design tokens in W3C DTCG format, built with Style Dictionary |
| `@upskill/components` | Component library with Storybook documentation |

## Token architecture

Tokens are layered so a single set of primitive values drives every theme and breakpoint:

| Layer | Files | Purpose |
|---|---|---|
| Primitives | `primitives.json` | Raw values, synced from Figma |
| Theme | `theme/light.json`, `theme/dark.json` | Semantic color aliases |
| Device | `device/desktop.json`, `device/tablet.json`, `device/mobile.json` | Responsive spacing and typography |

Style Dictionary transforms these into CSS custom properties, JS/TS constants, and a Tailwind theme extension.

## Integrations

| Tool | Role |
|---|---|
| **Figma** | Source of truth for primitive tokens, exported via the Variables API |
| **Style Dictionary** | Builds DTCG tokens into CSS, JS, and Tailwind outputs |
| **Storybook** | Component documentation, token showcase, and visual testing |
| **Airtable** | Token inventory and governance — ownership, status, usage guidelines, and audit trail per token |
| **GitHub Actions** | Token validation on PR, automated sync to Airtable on merge |

## Getting started

```bash
# Install dependencies
npm install

# Build tokens
npm run build:tokens

# Run Storybook
npm run storybook --workspace=@upskill/components
```

## Repository structure

```
upskill-design-system/
├── packages/
│   ├── tokens/              # Design tokens (W3C DTCG JSON)
│   │   ├── src/
│   │   │   ├── primitives.json
│   │   │   ├── theme/
│   │   │   └── device/
│   │   └── package.json
│   │
│   └── components/          # Coded components + Storybook
│       ├── src/
│       ├── .storybook/
│       └── package.json
│
├── package.json             # Workspace root
└── README.md
```
