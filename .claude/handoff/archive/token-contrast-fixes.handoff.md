---
status: done
created: 2026-07-07
completed: 2026-07-07
---

# Token Contrast Fixes — Handoff

Self-contained execution handoff for resolving most of the open `scripts/token-contrast-waivers.json` entries (issues #21, #22, #23) plus two systemic asks that came up while reviewing an interactive contrast-audit artifact. Written 2026-07-07 after computing every candidate value against the actual built theme CSS (`dist/css/theme.{light,dark}.css`) and the official Radix UI color scales. Execute via `/tokens-author` in one session — all the color-science legwork below is already done; this is implementation + verification, not re-derivation.

**Settled decisions — do not relitigate:**
- **Issue #23** (`border.selected` undershoots 3:1 in horizon dark): fix by moving the shared `border.selected` slot from `brand.dark.9` → `brand.dark.8`. Verified both brands clear 3:1 at step 8 (horizon 3.89/3.52 vs page/input; upskill 3.33/3.02 — narrower margin but still passes). No per-brand override; both brands move together.
- **Issue #22** (ProgressBar fill undershoots 3:1 everywhere): **leave open, no token change this pass.** `background.progress` (`color.accent.8`) only clears 3:1 for all four brand/theme combinations at `accent.11`, and horizon's `amber.11` is a near-black chocolate brown there — a real visual-weight regression, not a safe swap. Waiver stays as-is; do not touch `scripts/token-contrast-waivers.json`'s #22 entries.
- **New ask A** — darken primitive step 11 wherever it fails 4.5:1 against `background.neutral.subtlest`, checked against both brands' actual composited backgrounds (upskill `#F1F0ED`, horizon `#EFEFEF` — horizon is the stricter target, relative luminance 0.8632, so max passing foreground luminance ≈ 0.1529; use ≤0.150 as the working ceiling for margin).
- **New ask B** — cyan's light ramp has a monotonicity bug: steps 9→10 get darker correctly, then 10→11 gets **lighter** again before 11→12 drops sharply. Fix by regenerating cyan step-11 (and, since it's cheap and keeps the ramp coherent, the whole light ramp) so each step's relative luminance matches terracotta's per-step luminance — terracotta's ramp is monotonic end-to-end and becomes the reference curve once its own step 11 is darkened per ask A.
- **New ask C** — add a dedicated `red` primitive hue (light 1–12 + dark 1–12) sourced from the official Radix UI scale (`radix-ui.com/colors`, package `@radix-ui/colors@3.0.0`) and repoint all `feedback.error` theme tokens from `color.terracotta.*` to `color.red.*`, so error state no longer shares a hue with the terracotta brand accent. `award.copper` (`terracotta.6`) is unrelated — decorative, not feedback — and stays on terracotta.

---

## Verified facts (do not re-derive; trust these)

1. **Per-hue step-11 audit**, light ramp, against both brands' subtlest background:

   | hue | current step 11 | ratio vs upskill `#F1F0ED` | ratio vs horizon `#EFEFEF` | verdict |
   |---|---|---|---|---|
   | terracotta | `#BD4B3F` | 4.34 | 4.31 | **fails — darken** |
   | cyan | `#007A96` | 4.36 | 4.32 | **fails — darken (see ask B)** |
   | teal | `#008573` | 4.00 | 3.97 | **fails — darken** |
   | gold | `#6B6248` | 5.32 | 5.27 | passes, no change |
   | sand | `#63635E` | 5.30 | 5.25 | passes, no change |
   | grey | `#646464` | 5.19 | 5.15 | passes, no change |
   | amber | `#5C2700` | 10.56 | 10.46 | passes, no change |

   `black` and `white` have no 12-step ramp (single-stop primitives) — excluded from this audit entirely.

2. **Computed replacement hexes** (HSL lightness reduced, hue/saturation held constant, verified against both backgrounds with margin):
   - `terracotta.11`: `#BD4B3F` → **`#B7483D`** (4.60 upskill / 4.56 horizon)
   - `teal.11`: `#008573` → **`#007A6A`** (4.62 upskill / 4.58 horizon)
   - `cyan.11`: not an independent darken — see the terracotta-matched ramp in fact 3 (lands on `#007691`, 4.61/4.57, and is now darker than the new `cyan.10`, fixing the monotonicity bug in the same move).

3. **Full cyan **light** ramp, luminance-matched to terracotta's per-step curve** (cyan's hue/saturation preserved at each step; only lightness moved to match terracotta's relative luminance at that step — using terracotta's own corrected step 11 from fact 2 as the target for step 11):

   | step | cyan now | terracotta target L | cyan **new** | new L |
   |---|---|---|---|---|
   | 1 | `#FAFDFE` | 0.9791 | `#FAFDFE` | 0.9791 |
   | 2 | `#F3FAFC` | 0.9492 | `#F4FAFC` | 0.9492 |
   | 3 | `#E3F5FC` | 0.8644 | `#DDF3FB` | 0.8644 |
   | 4 | `#D2EFF8` | 0.7832 | `#C7EBF6` | 0.7832 |
   | 5 | `#C1E5F2` | 0.7019 | `#B7E1F0` | 0.7019 |
   | 6 | `#ACDAE9` | 0.6118 | `#A2D5E6` | 0.6118 |
   | 7 | `#91CADD` | 0.5091 | `#89C6DB` | 0.5091 |
   | 8 | `#64B4CD` | 0.3939 | `#63B3CD` | 0.3939 |
   | 9 | `#007D99` | 0.2196 | `#008DAC` | 0.2196 |
   | 10 | `#006F8B` | 0.1773 | `#007F9F` | 0.1773 |
   | 11 | `#007A96` | 0.1504 (terracotta.11 **new**) | `#007691` | 0.1504 |
   | 12 | `#1A3D48` | 0.0371 | `#193B45` | 0.0371 |

   Resulting ramp is monotonically decreasing in luminance end-to-end (0.979 → 0.037), matching terracotta step-for-step, so every step-11 contrast pairing that currently uses `cyan.11` inherits the same margin terracotta gets (≈4.56–4.61:1).

4. **Cyan's dark ramp has the same class of dip** (steps 8→9→10 get darker, i.e. relative luminance drops from 0.182→0.124→0.090, before jumping to 0.502 at step 11) — this is *why* step 8 beats step 9 for `border.selected` in issue #23. Not in scope for this pass since #23 is being resolved with a step choice, not a regen, but flag it: if a future brand ever needs `cyan.dark.9`/`.10`/`.11` directly, the same terracotta-matching technique (fact 3's method, against `terracotta.dark`) would fix it the same way.

5. **Radix UI red scale**, official, fetched from `unpkg.com/@radix-ui/colors@3.0.0/red.css` + `red-dark.css` (sRGB values; ignore the P3 `@supports` block, this system doesn't consume it):

   ```
   red (light):        red (dark):
   1  #fffcfc           1  #191111
   2  #fff7f7           2  #201314
   3  #feebec           3  #3b1219
   4  #ffdbdc           4  #500f1c
   5  #ffcdce           5  #611623
   6  #fdbdbe           6  #72232d
   7  #f4a9aa           7  #8c333a
   8  #eb8e90           8  #b54548
   9  #e5484d           9  #e5484d
   10 #dc3e42           10 #ec5d5e
   11 #ce2c31           11 #ff9592
   12 #641723           12 #ffd1d9
   ```

   (Radix's `tomato` scale was also pulled for comparison and rejected — it reads too close to terracotta's own hue family; `red` is the correct distinct choice.)

6. **`feedback.error` consumers to repoint** — 4 tokens × 2 themes = 8 edits, all currently `color.terracotta.*`:

   | token | light value → new | dark value → new | file:line (light / dark) |
   |---|---|---|---|
   | `background.feedback.error` | `terracotta.3` → `red.3` | `terracotta.dark.5` → `red.dark.5` | `theme/light.json:65` / `theme/dark.json:65` |
   | `text.feedback.error` | `terracotta.12` → `red.12` | `terracotta.dark.11` → `red.dark.11` | `theme/light.json:181` / `theme/dark.json:181` |
   | `border.feedback.error` | `terracotta.9` → `red.9` | `terracotta.dark.9` → `red.dark.9` | `theme/light.json:239` / `theme/dark.json:239` |
   | `icon.feedback.error` | `terracotta.9` → `red.9` | `terracotta.dark.9` → `red.dark.9` | `theme/light.json:289` / `theme/dark.json:289` |

   Step numbers stay the same on the repoint (only the hue changes) — re-verify contrast after, since red's per-step hex values differ from terracotta's (fact 5 vs. terracotta's own scale), so the existing waived/passing status of these 4 pairs (`token-contrast-check.js` `PAIRS`) needs re-checking, not assumed to carry over.

7. **`border.selected` (issue #23) edit locations**: only the **`border.selected`** key at `theme/dark.json:216-218` moves from `{color.brand.dark.9}` to `{color.brand.dark.8}`. Do **not** touch the other two `brand.dark.9` occurrences in the same file — `border.brand` (`theme/dark.json:22-24`, the AppHeader underline) and `icon.brand` (`theme/dark.json:278-280`) are unrelated and already pass; changing them isn't part of this fix and would be an unreviewed scope creep.

8. **`terracotta.11` has other live consumers besides `text.selected`/`text.brand`**: it also feeds `background.button.default` (Button's primary background, via `color.brand.11`) and `text.interactive.default` (link/interactive text color). Darkening it is contrast-positive everywhere it's used as a foreground, and as `button.default`'s background it only *increases* the existing contrast margin against `text.inverted.default` (white-ish button label) — no new failure risk there, but re-run the full `tokens:contrast-check` anyway rather than assuming.

9. **`teal.11` (light) has no live theme consumer today** — only `color.accent.dark.11` is aliased (`text.accent.inverted`). Confirmed via `grep -rn "accent\.11\b" packages/tokens/src/theme/`. Darkening it is still worth doing per ask A (systemic invariant: every hue's step 11 should be legible as text against the neutral-subtlest surface, in case a future brand or component ever reaches for it), but it's not fixing a currently-failing waiver.

---

## Tasks

1. **Add `color.red`** to `primitives.json` — light 1–12 and dark 1–12, values from fact 5. Follow the existing hue block shape exactly (see `terracotta` or `cyan` for the pattern: light ramp keys `1`–`12`, `dark.1`–`dark.12`, no `alpha` sub-ramp needed unless a later token needs it — none currently do).
2. **Darken `color.terracotta.11`** → `#B7483D` and **`color.teal.11`** → `#007A6A` in `primitives.json` (single `$value` edit each).
3. **Replace all 12 steps of `color.cyan`'s light ramp** in `primitives.json` with the values from fact 3's "cyan new" column. Leave `cyan.dark` and `cyan.alpha` untouched (fact 4 is a flagged follow-up, not part of this task list).
4. **Repoint the 8 `feedback.error` tokens** (fact 6) in `theme/light.json` and `theme/dark.json` from `color.terracotta.*` to `color.red.*` at the same step numbers.
5. **Repoint `border.selected`** (fact 7) in `theme/dark.json` from `{color.brand.dark.9}` to `{color.brand.dark.8}`. `theme/light.json`'s `border.selected` (`{color.brand.9}`) is unaffected — issue #23 is dark-theme-only.
6. **Rebuild**: `npm run tokens:build`.
7. **Re-run** `npm run tokens:contrast-check`. Expect:
   - Issue #21's two waived pairs (upskill + horizon `text.selected`/`text.brand`) now pass — remove their entries from `scripts/token-contrast-waivers.json`.
   - Issue #23's two waived pairs (horizon `border.selected` vs page/input) now pass — remove their entries too.
   - Issue #22's four waived pairs (progress fill) still fail as expected — leave untouched.
   - Re-check the 4 repointed `feedback.error` pairs (fact 6) against `token-contrast-check.js`'s `PAIRS` list (`T("feedback-error")`, `B("feedback-error")`, `I("feedback-error")` entries) — red's hex values differ from terracotta's at the same step, so these are **not** guaranteed to pass just because the terracotta versions did. If any fail, that's new information — don't silently pick a different step; surface it.
8. **Full gate**: `npm run tokens:contrast-check` clean (module above), then the usual token-change checklist — `npm run typecheck`, `npm run build`, check Storybook color-showcase stories render the new red hue and the shifted terracotta/teal/cyan swatches correctly in both themes.
9. **Record an ADR** (or amend ADR-002/012 — judgment call for whoever executes, but this changes the primitive hue list, which ADR-002 governs): document (a) the new `red` hue and the rule that `feedback.error` must use it, never a brand hue, and (b) the terracotta-luminance-matching method now used to regenerate cyan, as precedent for any future hue that needs the same correction.
10. **Update CLAUDE.md**'s "Current hues" list (Token architecture → Primitive color scales) to add `red`.

## Open questions for the executing session

- Fact 4's dark-ramp dip (cyan dark steps 8–10) is flagged but explicitly **not** part of this task list — issue #23 is being resolved with a step choice (task 5), not a regen. Only revisit if a future brand needs `cyan.dark.9`–`.11` directly for something other than `border.selected`.
- Task 7's re-check of the repointed `feedback.error` pairs is a real unknown, not a formality — resolve whatever it finds rather than deferring it into a new waiver by default.
- No new component or layout work is implied by any of this — it's a primitives + theme-alias change only, so `components-check.yml`'s scope shouldn't be touched.
