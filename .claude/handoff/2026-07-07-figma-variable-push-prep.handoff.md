---
status: active
created: 2026-07-07
completed: null
---

# Figma variable push — prep (2026-07-07)

Last reconciled push: 2026-06-30 (Theme 104 vars; see `figma-file-variable-drift.md`).
Code has moved ahead since then across 5 commits (93d06d0 → f7ae360). This note is
what a fresh session should expect to find when it dumps Figma and diffs — read it
after step 1 of `/figma-variable-push`, before re-deriving from git log.

## Not in scope for this push
Multi-brand refactor (93d06d0, d4ef04f) extracted a brand layer (`brands/upskill.json`,
`brands/horizon.json`). CLAUDE.md: **"The brand layer is not mirrored to Figma"** —
`/figma-variable-push` operates on the single default brand (`upskill`) only. Ignore
horizon-specific changes entirely (e.g. horizon's brand-hue swap to cyan).

## Expected clean-missing (adds)
- **Primitives**: `color/red/1..12` + `color/red/dark-1..12` (24 vars) — new hue added
  in f7ae360, Radix red scale, backs the decoupled `feedback.error.*` theme tokens.
- **Primitives**: `color/cyan/dark-1..12` (12 vars) — cyan dark ramp added in 2e8fa32
  (didn't exist before; only light ramp existed at 06-30 capture).
- **Theme**: `color/background/media/default`, `color/background/media/strong`,
  `color/icon/media`, `color/background/progress` (4 vars, both Light/Dark modes) —
  new semantic aliases from 684ea9c (VideoFrame/Image/ProgressBar dark-mode fix).

## Expected drift (report only, do not auto-fix)
- **Primitives**: `color/cyan/1..12` — light ramp values changed twice (2e8fa32 full
  replace, f7ae360 fixed 10→11 monotonicity dip). Figma still holds the pre-06-30 values.
- **Primitives**: `color/terracotta/11`, `color/teal/11` — darkened in f7ae360 for
  4.5:1 text contrast on neutral-subtlest.
- **Theme**: 8 `color/feedback/error/*` vars (or however they're named in Figma —
  confirm against the naming map) — repointed from terracotta to red in f7ae360.
- **Theme**: `color/border/selected` dark mode — alias target moved
  `brand/dark-9` → `brand/dark-8` (f7ae360, issue #23).

## Known pre-existing Figma extras (leave, don't delete)
`color/text/link/default`, `color/text/link/hover` — superseded by
`color/text/interactive/*` (added 06-30), old vars may still be bound to styles.

## After the push
Update `figma-file-variable-drift.md` with a new "Reconciled 2026-07-XX" entry (same
format as prior entries) and re-run the `figma-variables.json` capture per its own note
("update it after any code→Figma push").
