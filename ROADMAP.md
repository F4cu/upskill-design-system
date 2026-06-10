# UpSkill Design System — Roadmap

Progress tracker for the three-phase build-out. Check items off as they land on `main`.

---

## Phase 1 — Infrastructure

- [x] Monorepo structure + npm workspaces
- [x] Token JSON files (primitives, theme, device layers)
- [x] GitHub repo
- [x] Airtable connected
- [x] Style Dictionary: CSS custom properties output for web
- [x] React + Vite + TypeScript in `packages/components`
- [x] Storybook: install + configure `addon-themes` (light/dark toggle via `data-theme`)
- [x] Token showcase story (color swatches, spacing scale, type ramp)
- [ ] GitHub Actions: token build check on PR

## Phase 1.5 — Component Foundation

> Styling approach: CSS Modules consuming SD-output custom properties.

- [ ] CSS reset / base styles
- [ ] Grid and layout system
- [ ] Typography scale styles
- [ ] First component: `Button` (establishes token → CSS Module → component pattern)
- [ ] Core layout components: `Stack`, `Box`
- [ ] Wire `storybook-design-token` to SD CSS output for token swatches in Storybook

## Phase 2 — Automation

- [ ] GH Action: sync tokens to Airtable on merge to main
- [ ] GH Action: PR comment with token diff summary
- [ ] Airtable webhook integration
- [ ] Changelog generation

## Phase 3 — Agentic loops

- [ ] Token drift detection (Figma export vs committed tokens)
- [ ] Auto-documentation generation for Airtable records
- [ ] Component scaffolding triggered by token changes
