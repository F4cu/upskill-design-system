# UpSkill Design System — Roadmap

Progress tracker for the three-phase build-out. Check items off as they land on `main`.

---

## Phase 1 — Infrastructure

- [x] Monorepo structure + npm workspaces
- [x] Token JSON files (primitives, theme, device layers)
- [x] GitHub repo
- [x] Airtable connected
- [x] Style Dictionary: CSS custom properties output for web
- [x] Style Dictionary: custom platform config for device tokens — desktop to `:root`, tablet/mobile wrapped in `@media` blocks (single CSS output file)
- [x] React + Vite + TypeScript in `packages/components`
- [x] Storybook: install + configure `addon-themes` (light/dark toggle via `data-theme`)
- [x] Token showcase story (color swatches, spacing scale, type ramp)
- [x] GitHub Actions: token build check on PR

## Phase 1.5 — Foundation Review

> Audit and clean up the token layer before building on top of it. Nothing here changes the design — it removes noise and documents decisions.

- [x] Define component metadata schema (JSON/YAML per component: purpose, variants, relationships, anti-patterns) — must land before any component is built
- [ ] Audit semantic token naming — tokens should describe intent (`color.surface-default`) not raw scale positions
- [ ] Remove Figma-artifact tokens from device layer — `layout.headerLayout`, `layout.min-width.column`, `layout.min-height.slider` have no CSS meaning and were exported by accident
- [x] ADR: layout tokens = values (spacing, grid config), not CSS properties — clarify the rule so future tokens land in the right place
- [x] ADR: `space` vs `size` — `space` is for spacing (gap, padding, margin); `size` is for component dimensions (icon, avatar). Overlapping value ranges need a clear rule.
- [ ] Review `space.inline` duplication across breakpoints — values are identical in all three device files; decide if that is intentional or if inline spacing should only live in the `:root` baseline

---

## Phase 1.6 — Foundation

> Build the structural layer that every component will depend on. No design decisions — just wiring existing tokens to CSS and the two primitives all other components compose from.

- [ ] CSS reset / base styles
- [ ] `grid.css` utility class — consumes `var(--ds-grid-columns)`, `var(--ds-grid-gutter)`, `var(--ds-grid-margin)` to produce a reusable `.container`. No new tokens needed.
- [ ] Typography scale styles — map `font.*` device tokens to base element and utility class styles
- [ ] `Box` component — polymorphic `div` with CSS Module; exposes padding via `space.inset.*` tokens
- [ ] `Stack` component — `display: flex; flex-direction: column` with a `gap` prop that maps to `var(--ds-space-stack-*)`
- [ ] Storybook: grid layout story, `Stack` gap-variants story
- [ ] Wire `storybook-design-token` to SD CSS output for token swatches in Storybook

---

## Phase 1.7 — First Components

> Establish the full pattern — token → CSS Module → component → metadata — so every subsequent component has a template to follow.

- [ ] `Button` (primary pattern: semantic color tokens, interaction states, size variants via `space.inset.*`)
- [ ] Typography components: `Text`, `Heading` (consume font device tokens, line-height tokens)
- [ ] Verify all Phase 1.7 components have complete metadata files

## Phase 2 — Automation

- [ ] GH Action: sync tokens to Airtable on merge to main
- [ ] GH Action: PR comment with token diff summary
- [ ] Airtable webhook integration
- [ ] Changelog generation

## Phase 2.5 — Machine-Readable Layer

- [ ] Verify all built components have complete metadata (purpose, variants, relationships, anti-patterns)
- [ ] Expose component metadata in Storybook (docs panel)
- [ ] Sync component metadata to Airtable records
- [ ] Write one end-to-end agent prompt using metadata as context — validates the schema is sufficient

## Phase 3 — Agentic loops

- [ ] Token drift detection (Figma export vs committed tokens)
- [ ] Auto-documentation generation for Airtable records
- [ ] Component scaffolding triggered by token changes
