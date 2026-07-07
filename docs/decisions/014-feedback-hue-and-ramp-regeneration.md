# ADR-014 — Feedback Hue Separation and Terracotta-Luminance-Matched Ramp Regeneration

**Date:** 2026-07-07
**Status:** `accepted`

## Context

While resolving open `scripts/token-contrast-waivers.json` entries (issues #21, #22, #23) and reviewing a contrast-audit artifact against the built theme CSS, two structural problems surfaced that a routine contrast tweak could not fix without setting new conventions:

1. **`feedback.error` shared a hue with a brand accent.** All eight `feedback.error` theme tokens (background/text/border/icon × light/dark) aliased `color.terracotta.*`. Terracotta is also `upskill`'s brand slot (`brand → terracotta`, per ADR-012). An error state rendered in the brand's own hue can visually collide with brand chrome — the "something is wrong" signal and the "this is our accent" signal become indistinguishable. Because a brand slot may be remapped to any eligible hue, any hue used for a brand-eligible slot is unsafe to also carry a fixed semantic meaning like error.

2. **A primitive hue ramp was non-monotonic.** Cyan's light ramp had a luminance defect: steps 9→10 darkened correctly, then 10→11 got *lighter* again before 11→12 dropped sharply. This broke the implicit contract that a numeric ramp step's darkness increases monotonically, and it meant `cyan.11` could not be relied on as a legible text color against the neutral-subtlest surface. Ad-hoc darkening of a single step risks re-introducing a different non-monotonicity elsewhere in the ramp, so a repeatable regeneration method was needed — not a one-off nudge.

Related systemic finding (handled in the same pass, but not itself precedent-setting): several hues' step-11 failed 4.5:1 against `background.neutral.subtlest` and were darkened (`terracotta.11`, `teal.11`, and `cyan.11` via the regeneration below), establishing the working invariant that **every hue's step 11 should be legible as body text against the neutral-subtlest surface**.

## Decision

### (a) Feedback semantics must use a dedicated, non-brand-eligible hue

A new `color.red` primitive hue (light `1–12` + dark `1–12`) was added, sourced verbatim from the official Radix UI red scale (`@radix-ui/colors@3.0.0`). All eight `feedback.error` theme tokens were repointed from `color.terracotta.*` to `color.red.*` at the same step numbers.

**Rule:** `feedback.error` (and by extension any fixed feedback semantic that must read unambiguously regardless of active brand) must alias a dedicated hue that is **never** used for a brand slot (`brand`/`accent`/`neutral`/`surface` — see ADR-012). Error state must not visually collide with a brand's accent. `red` exists specifically to be that non-brand feedback hue; it is deliberately *not* brand-eligible.

Radix's `tomato` scale was evaluated and rejected — it reads too close to terracotta's hue family to serve as a distinct error signal.

Note: `award.copper` (`terracotta.6`) is decorative, not feedback, and correctly stays on terracotta. This rule governs feedback semantics, not every use of a brand hue.

### (b) Terracotta-luminance-matching ramp regeneration (the documented method)

To fix a hue whose light ramp is non-monotonic in luminance, regenerate the whole ramp against a reference curve rather than nudging individual steps:

1. Use **terracotta's light ramp as the reference curve** — it is monotonic end-to-end (relative luminance 0.979 → 0.037), using its own corrected step-11 as the step-11 target.
2. For each step of the hue being fixed, **hold hue and saturation constant** and move **only lightness** so that the step's relative luminance **matches terracotta's relative luminance at the same step**.
3. The result is a ramp that is monotonic by construction and inherits terracotta's per-step contrast margins — every pairing that consumed the old step (e.g. `cyan.11` as text) picks up the same ≈4.56–4.61:1 margin terracotta gets.

This was applied to cyan's entire light ramp in this pass. It is the documented precedent for correcting any future hue with the same class of defect.

**Known follow-up (not fixed this pass):** cyan's *dark* ramp has the same class of dip (steps 8→9→10 drop, then jump at 11). It is intentionally left as-is because issue #23 was resolved with a step choice, not a regen. If a future brand ever needs `cyan.dark.9`/`.10`/`.11` directly, apply the same method against `terracotta.dark`.

### Contrast-waiver outcomes (context, not new convention)

- Issues #21 (4 waivers) and #23 (2 waivers) were resolved and their waiver entries removed. #23 moved the shared `border.selected` slot from `brand.dark.9` → `brand.dark.8` (both brands move together, no per-brand override).
- Issue #22 (ProgressBar fill, `background.progress` = `accent.8`) was **deliberately left as a waiver** — `accent.8` cannot clear 3:1 across all brand/theme combinations without a real visual-weight regression (horizon's `amber.11` reads near-black there). Documenting this as a conscious accepted failure, not an oversight.

## Consequences

- **Primitive hue list grows to include `red`** (now: terracotta, cyan, gold, teal, sand, grey, black, white, amber, red). This changes the hue set governed by ADR-002 — see the ADR-002 amendment of the same date, which cross-references this ADR.
- **`red` is reserved for feedback and is not brand-eligible.** It has a full light + dark ramp but must never be mapped to a brand slot; conversely, `feedback.error` must never point back at a brand-eligible hue. This is the load-bearing invariant future token work must preserve.
- **A repeatable ramp-repair method now exists.** Future non-monotonic hues are corrected by luminance-matching against terracotta's reference curve, not by hand-nudging steps — keeping ramps monotonic and contrast margins predictable.
- **Systemic step-11 invariant.** Every hue's step 11 is expected to clear 4.5:1 as text against `background.neutral.subtlest`. `terracotta.11`, `teal.11`, and `cyan.11` were darkened to satisfy it; darkening a step-11 is contrast-positive wherever it is used as a foreground.
- **Trade-off accepted:** the `tomato`-vs-`red` choice and the whole-ramp cyan regen mean red and cyan no longer share step-by-step hex parity with any prior scale; contrast for the repointed `feedback.error` pairs was re-verified against the built theme CSS rather than assumed to carry over from terracotta.
- **Known debt tracked, not hidden:** cyan's dark-ramp dip (deferred) and issue #22's ProgressBar-fill waiver remain, each documented above and in the waiver ledger.

## Related

- **ADR-002** (three-layer/now four-layer token model) — governs the primitive hue list; amended the same date to record the addition of `red`, cross-referencing this ADR.
- **ADR-012** (brand layer / multi-brand) — defines brand slots and brand-eligibility; the "feedback hue must not be brand-eligible" rule is the complement of that eligibility contract.
