---
title: "ADR-025 — Component state model"
---
# ADR-025 — Component state model

**Date:** 2026-10-06
**Status:** `accepted`

## Context

"State" was used loosely for three different things: interaction (hover, focus), lifecycle (a course in progress or completed) and content (a card with no image). Putting them all in one `state` prop, or a set of booleans, gives an API with impossible combinations (`isStarted={false} isCompleted`) and Figma properties that clash with code. The need came up when `CardVertical` needed a "Completed" look.

## Decision

Each kind of state has its own home (rule table in `.claude/rules/components.md` → "State model"):

- **Interaction** is CSS pseudo-classes only, never a prop. It shows up in Figma as a `State` variant used for previews. The exception is interaction state the app owns (`pressed`, `selected`, `open`), which is a controlled prop with `default*`/`on*Change`.
- **Lifecycle** is derived from a data prop when possible. When it can't be derived, it is one `status` enum, never a set of booleans. In Figma it is named for its axis (`Status`), never `State`.
- **Content** is the fallback when a prop is omitted. There are no `showX`/`empty` flags.

First application: `CardVertical` derives "completed" from `progress >= 100` and adds a `CardVertical.Completed` marker (check icon + "Completed", styled like Certified) to its meta row. There is no `completed` or `status` prop. Rejected alternative: a `status: 'notStarted' | 'inProgress' | 'completed'` prop. It would duplicate `progress` and could disagree with it. It stays the fallback if product ever needs lifecycle and percentage to differ.

## Consequences

- Scaffolds and reviews have one rule for naming state props. Figma and code names line up because `State` is reserved for interaction.
- A derived state can't be forced. A consumer who needs "completed" at 90% must use the parts API.
