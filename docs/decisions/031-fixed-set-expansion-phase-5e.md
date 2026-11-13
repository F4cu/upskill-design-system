---
title: "ADR-031 — Fixed-set expansion: Phase 5e batch (Dialog, Table, Alert, Pagination)"
---
# ADR-031 — Fixed-set expansion: Phase 5e batch (Dialog, Table, Alert, Pagination)

**Date:** 2026-11-12
**Status:** `accepted`

## Context

`ROADMAP.md` freezes the library at 27 components and 2 hooks ("growth by composition only"), and `AGENTS.md` makes the fixed set canonical: `/add-component` and `/component-scaffold` refuse anything outside it. The set was sized by three pages (User Settings, Homepage, Course Overview). `DropdownMenu`, `Image` and `TextLink` were later added one at a time with no recorded reason, so the system has no rule for admitting a component after the freeze.

Coverage is now thin for the pages that exist. A gap inventory on 2026-11-12 read the showcase pages, the dashboard's pipeline components, the docs app, open issues, Figma components with no code counterpart, and theme tokens with no consumer. Four gaps are places where a page already works around a missing component:

| Gap | Evidence |
|---|---|
| **Dialog** | `apps/showcase/src/pipeline/PipelineDetailPanel.tsx` builds Escape-to-close, focus on open and a Close button by hand. It focuses by querying the DOM because no component forwards a ref (#114). It never returns focus to the button that opened it, and there is no modal option. No existing component traps focus or makes the background inert. |
| **Table** | `apps/showcase/src/pages/Dashboard.tsx` renders a raw, unstyled `<table>` with `<Text>` in each cell. |
| **Alert** | The theme defines 12 `color.{background,text,border,icon}.feedback.{error,success,warning}` tokens. Only the error text and border have consumers (the TextField and Select error messages). Success and warning tokens, and every feedback background and icon token, have none. The settings page's Save button has no success feedback. |
| **Pagination** | The Figma file has "Pagination buttons" and "Carrousel + paginator" components with no code counterpart (#108). The Homepage chapter stepper ("Chapter N of 3") is built by hand from `ButtonArrow` and `Text`. |

The same inventory found gaps that pass ADR-009 question 1 (same role, so a prop on an existing component) and need no new component. Button has no `pressed` prop, so `UserSettings.tsx` and `PipelineDag.tsx` pass a raw `aria-pressed`, against ADR-025. The Course Overview "show more" on Accordion uses inline `style`, which the layout grammar bans. Badge has no `icon`, so the "Certified" badge is page CSS. Tabs, Tooltip, Toast, RadioGroup and a settings Switch had no evidence in any page or in Figma.

Options considered:

1. **One ADR per component.** Each would repeat the same admission argument, and none sets a contract other code depends on. Rejected.
2. **Lift the freeze: add components as needed.** This wears away the fixed-set invariant that keeps the system small enough for one maintainer and keeps agents from inventing components. Rejected.
3. **Admit a named batch under a written entry rule, then freeze again.** Chosen.

## Decision

**Entry rule.** A component joins the fixed set only when all three hold, and the evidence is written down where it is admitted:

1. **ADR-009 says new component.** Its semantic role differs from every component in the set, and it is not a prop or variant (question 1) or a parent-internal element (question 3).
2. **It has a real consumer.** A showcase page, or a named product page that is planned. A component wanted "just in case" does not qualify.
3. **Composition can't produce it.** The behaviour or the tokens it needs are not available from existing components, or composing it forces consumers into what the layout grammar bans (inline styles, raw elements, hand-written ARIA).

**Phase 5e batch.** Four components are admitted:

| Component | Role it fills | First consumer | Risk tier |
|---|---|---|---|
| `Dialog` | A titled surface over the page that takes focus and returns it on close: modal (focus trap, inert background) and non-modal | Pipeline detail panel (`/dashboard`, `/pipeline`) | interactive |
| `Table` | Tabular data with column headers | Dashboard component lifecycle table | display, unless sorting or selection is in its first scope |
| `Alert` | An inline status message in a feedback tone (error, success, warning), using the unused feedback tokens | User Settings save confirmation | display (`role="status"`/`"alert"` are live regions, not interactive roles) |
| `Pagination` | Moving between numbered pages or steps, with the current position named | Homepage chapter stepper; the Figma pagination components | interactive |

The props, anatomy and Figma mapping of each are decided at its own `/component-scaffold` API proposal checkpoint, not here. The tier column is a forecast: `npm run component:risk` decides the path.

**Delivery.** Each component goes through `/add-component` on its own, one at a time, under the existing loop guardrails (ADR-007). Interactive ones get the adversarial reviewer and a Tier-2 a11y test (ADR-008). The showcase page that motivated a component is migrated to use it in the same PR or the one right after, so the workaround doesn't outlive the reason for the component.

**Freeze again.** When the batch ships, the library is frozen at 31 components and 2 hooks. A later admission is a dated amendment to this ADR that shows evidence for each entry rule. It is not a new ADR and not an untracked addition.

**Out of scope here, filed as issues instead.** The prop-level gaps are ordinary component work under ADR-009 question 1: Button `pressed` (also an ADR-025 fix), Accordion show-more, and Badge `icon`. Tabs, Tooltip, Toast, RadioGroup and Switch are not admitted. Any of them can come in by amendment once a page needs it.

## Consequences

- `AGENTS.md` gets a "Phase 5e" line in the fixed set, and `ROADMAP.md` gets a Phase 5e batch row with the freeze count changed to 31. Both land when this ADR is accepted, before the first `/add-component` run, because the commands refuse a component that isn't in the set.
- No validator changes: `validate-layout.js` derives its fixed set from the package's public exports, so a component joins the layout grammar when it is exported.
- `DropdownMenu`, `Image` and `TextLink` stay in the set. Their admission predates the rule and isn't revisited.
- The feedback tokens gain consumers, so `token-usage.json` and the contrast `PAIRS` grow when `Alert` ships.
- Cost: four more components to review, document, mirror in Figma and keep in sync, for one maintainer. The entry rule is the counterweight. It makes each later addition argue for itself in writing.
- The Dialog work will hit #114 (no component forwards a ref). Dialog has to return focus to the element that opened it, so either #114 is fixed first or Dialog takes the trigger element through its own API.
