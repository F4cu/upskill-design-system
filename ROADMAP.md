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

## Phase 1.5 — Component Foundation

> Styling approach: CSS Modules consuming SD-output custom properties.

- [x] Define component metadata schema (JSON/YAML per component: purpose, variants, relationships, anti-patterns) — must land before any component is built
- [ ] Audit semantic token naming — tokens should describe intent (`color.surface-default`) not raw scale positions
- [ ] CSS reset / base styles
- [ ] Grid and layout system
- [ ] Typography scale styles
- [ ] First component: `Button` (establishes token → CSS Module → component → metadata pattern)
- [ ] Core layout components: `Stack`, `Box`
- [ ] Wire `storybook-design-token` to SD CSS output for token swatches in Storybook

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
