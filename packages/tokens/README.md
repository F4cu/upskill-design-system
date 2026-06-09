# @upskill/tokens

Design tokens for the UpSkill Design System, stored in [W3C Design Token Community Group (DTCG)](https://tr.designtokens.org/format/) format.

## Token structure

```
tokens/
├── $metadata.json          # Token set resolution order
├── primitives.json         # Raw values — synced from Figma variables
├── theme/
│   ├── light.json          # Semantic color aliases for light mode
│   └── dark.json           # Semantic color aliases for dark mode
└── device/
    ├── desktop.json        # Spacing, grid, typography for ≥1440px
    ├── tablet.json         # Spacing, grid, typography for ≥768px
    └── mobile.json         # Spacing, grid, typography for <768px
```

## Token layers

### Primitives

Raw, context-free values. These map 1:1 to Figma variable collections and are the single source of truth for every concrete value in the system.

Includes: color scales (terracotta, cyan, gold, teal, sage, neutral, white, black), spacing scale, font sizes, font weights, font families, border radii, and unitless line-height multipliers.

**Line-height tokens** use unitless ratios (1, 1.25, 1.4, 1.5, 1.75) rather than fixed px values. This means `line-height: 1.4` adapts automatically to any font size — no per-size matrix needed.

### Theme (light / dark)

Semantic color tokens that reference primitives. Swap `light.json` for `dark.json` to switch themes. Both files use the same token names, pointed at different primitive values.

### Device (desktop / tablet / mobile)

Responsive tokens for spacing, grid, typography sizing, and layout. Each file uses the same token names pointed at different primitive values where breakpoints require different sizing.

## Resolution order

Tokens resolve in this order (later sets override earlier ones):

1. `primitives` — base values
2. `theme/light` or `theme/dark` — color mode
3. `device/desktop`, `device/tablet`, or `device/mobile` — responsive sizing

## Figma sync

Tokens are exported from Figma variables and cleaned to W3C DTCG format. The cleanup process:

- Strips `$extensions` (Figma variable IDs, scopes, alias metadata)
- Converts Figma sRGB component arrays to hex strings
- Preserves alias references as `{path.to.token}` format

To re-export from Figma: use the Variables REST API or a plugin export, then run the cleanup script.

## Build (planned)

A Style Dictionary config will transform these tokens into platform outputs:

- CSS custom properties (with rem conversion for dimensions)
- JS/TS constants
- Tailwind theme extension
