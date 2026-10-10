---
title: "ADR-025 — Component state model"
---
# ADR-025 — Component state model

**Date:** 2026-10-06
**Amended:** 2026-10-10
**Status:** `accepted`

## Context

"State" was used loosely for three different things: interaction (hover, focus), lifecycle (a course in progress or completed) and content (a card with no image). Putting them all in one `state` prop, or a set of booleans, gives an API with impossible combinations (`isStarted={false} isCompleted`) and Figma properties that clash with code. The need came up when `CardVertical` needed a "Completed" look.

## Decision

Each kind of state has its own home (rule table in `packages/components/AGENTS.md` → "State model"):

- **Interaction** is CSS pseudo-classes only, never a prop. It shows up in Figma as a `State` variant used for previews. The exception is interaction state the app owns (`pressed`, `selected`, `open`), which is a controlled prop with `default*`/`on*Change`.
- **Lifecycle** is derived from a data prop when possible. When it can't be derived, it is one `status` enum, never a set of booleans. In Figma it is named for its axis (`Status`), never `State`.
- **Content** is the fallback when a prop is omitted. There are no `showX`/`empty` flags.

First application: `CardVertical` derives "completed" from `progress >= 100` and adds a `CardVertical.Completed` marker (check icon + "Completed", styled like Certified) to its meta row. There is no `completed` or `status` prop. Rejected alternative: a `status: 'notStarted' | 'inProgress' | 'completed'` prop. It would duplicate `progress` and could disagree with it. It stays the fallback if product ever needs lifecycle and percentage to differ.

## Consequences

- Scaffolds and reviews have one rule for naming state props. Figma and code names line up because `State` is reserved for interaction.
- A derived state can't be forced. A consumer who needs "completed" at 90% must use the parts API.

## Amendment (2026-10-10) — `active` (momentary press) vs `pressed` (toggle)

"Pressed" means opposite things across sources: in WAI-ARIA (`aria-pressed`) and in `Chip` it is a persistent toggle the app owns; in Material and Atlassian it is the momentary press while the pointer is down. Aligning Button to Figma needed the momentary state, so the two meanings had to be split before both landed in one system.

- **`active`** is the momentary press: an interaction state, CSS `:active:not(:disabled)` only, never a prop, a `State` variant value (`Active`) in Figma. Tokens are named `*.active` (`color.background.button.<variant>.active`, `color.background.overlay.active`).
- **`pressed`** stays reserved for the ARIA toggle: app data, a controlled prop backed by `aria-pressed`, a Boolean property in Figma.
- The axes are orthogonal: every interactive component gets `active`, including toggles. `Chip` shows `active` whether `pressed` is true or false (as Material does for filter chips).

First application: `Button` (all four variants) and `Chip`. A 10% overlay drops brand and subtle text just below AA in the light theme, so `active` also darkens text one step (`text.default`, `text.interactive.hover`) instead of taking a contrast waiver. `danger` has no red step past `red.12` (its hover), so `danger.active` aliases `red.dark.4`; theme files already cross into dark sub-scales (`container.inverted`, `text.accent.inverted`). Rejected alternative: naming the momentary state `pressed` to match Material/Atlassian tokens. That would give `pressed` two meanings in one system and clash with Chip's prop.
