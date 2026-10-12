---
status: active
created: 2026-10-12
completed:
---

# Spec rollout follow-ups: think, research, then decide

Open items left by the ADR-027 spec rollout (PR #142, `archive/2026-10-11-spec-rollout.handoff.md`) and the contract migration. Nothing here is decided yet. For each item: research it, decide (and record an ADR amendment if a contract changes), then file an issue or do the work. Facts were checked on `main` on 2026-10-12.

## Items

### 1. AppHeader hamburger does nothing (bug, a11y)

- `AppHeader/index.tsx:136`: `<button type="button" aria-label="Open menu">` has no `onClick`. Screen readers announce a control that does nothing, and on mobile the nav can't be opened.
- **To think about:** is the mobile nav a disclosure (`open` / `defaultOpen` / `onOpenChange`, ADR-025 Configured · controlled) or internal state like `useMenuButton`? Where does the menu render (a drawer, an inline list, a DropdownMenu)? Figma: what does the `Device=Mobile` AppHeader show when open?
- **Research:** APG disclosure navigation pattern; how Primer, Polaris and GOV.UK headers handle the mobile menu.
- **Done when:** the button toggles a nav with `aria-expanded`/`aria-controls`, an a11y test covers it, and the spec states record it.

### 2. Border-width token

- 18 literal border widths in 13 CSS Modules: `1px` × 15 (`border`, `border-top`, `border-bottom`), `2px` × 2 (`border-bottom`, `border-right`), Checkbox `1.5px` × 1. No border-width scale exists.
- **To think about:** a primitive scale (`border-width.thin/thick`?) plus semantic aliases, or primitives only? Should Checkbox's 1.5px move to 1px or 2px, or does it earn a step of its own? Does 2px mean "emphasis" (selected/current), so it wants a semantic name? What does Figma use? Through `/tokens-author`, its own PR.
- **Research:** how Carbon, Primer and Atlassian name border widths; whether to mirror them as Figma variables (`/figma-variable-push`).

### 3. Spec `constraints` backfill

- 25 of 27 specs have empty `constraints` (only Button and CardVertical have any). The hard rules sit in metadata `usage.antiPatterns` as prose.
- **To think about:** which anti-patterns are constraints (enforceable) and which are guidance? What `enforcedBy` values are realistic: TypeScript type, lint rule, `spec:validate`, `layout:validate`, test? `spec:validate` already lists unenforced constraints as backlog, so is that list enough to plan by? Work one family per PR (form inputs, cards, navigation).
- **Research:** ADR-027's constraint section and the Button/CardVertical examples; the ADR-001 "type-enforced anti-pattern" rule.

### 4. Spec `figma.sets` read-back

- 25 of 27 specs have empty `figma.sets`. Their Figma property names follow the ADR-026 casing rule, not a read-back from the file.
- **To think about:** fold it into #103 (system-wide code ↔ Figma naming audit, which already proposes a committed `figma-components.json` snapshot plus a diff script), or do a one-off `/figma-cli` read? If the snapshot route: it is a new frozen snapshot, so it needs an ADR-002 amendment.

### 5. Smaller loose ends

- **#122** (Select metadata still describes a native `<select>`): `usage.when[2]` and `usage.antiPatterns[2].reason` are still wrong. Quick fix; can go with #121 and #107 in one `/code-review` PR.
- **Glossary "API proposal":** the docs-scribe flagged it as a recurring undefined term (docs 00, 06, 08, 10; ADRs 025–027). Add it on the next `/docs-sync`.
- **Case-study HTML refresh** (`docs/*-case-study.html`): deferred until the eval work was done; the evals are now frozen (ADR-029 amendment 2026-10-12), so it can be planned.
- **The first spec-first run** is #136 (Button `loading`): amend `Button.spec.json` first, then the code, then `/review-component Button`. Note what had to change in the spec after building; that answers the open question from #142.
