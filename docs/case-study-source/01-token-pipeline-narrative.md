# Token pipeline: code as the source of truth

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar.*

## The decision that reads backwards on first pass

If you ask most design-system teams where a color token lives, the answer is Figma. Designers author in the tool they design in; engineering pulls from it. This system does the opposite: `primitives.json`, a hand-edited, PR-reviewed JSON file in the repo, is the single source of truth, and Figma holds a downstream *mirror* of it. That reads backwards until you learn it wasn't the original design — it's a reversal, made once the original plan ran into a wall that had nothing to do with taste.

## What was originally decided, and what broke it

ADR-002 first declared primitives Figma-owned: designers author variables in Figma, an automated sync pulls them into code, primitives.json is "never hand-edited." That's the conventional shape, and it's the one this system tried first. It broke on plan limits, not on principle: the Variables REST API and Code Connect are both Enterprise/Org-only, and Token Studio's free-tier sync can't span the six-plus files this architecture needs — full accounting of the wall and what survived it in [Rejected alternatives §3](04-rejected-alternatives.md#3-figma-as-the-primitives-source-of-truth-adr-002-reversed). ADR-002's 2026-06-17 amendment records the reversal plainly: primitives.json becomes hand-editable via PR like every other layer, and **a value invented in Figma is a proposal, not a fact, until it lands in the committed JSON.**

## What the reversal costs, and what it buys

The honest cost: designers lose the "just tweak the variable in Figma" workflow that a well-integrated design tool sync would give them. A color change now goes through a PR like any other code change, reviewed the same way.

What it buys is arguably the more valuable trade for a small, one-maintainer system: **a single, versioned, diffable source of truth that never drifts silently.** Every token change has a commit, a diff, and (per CLAUDE.md's ADR policy) a record when the change is structural. Figma becomes what it's honestly good at being here — a design-exploration surface and a downstream mirror — instead of a hidden second source of truth that could quietly diverge from what actually ships. `/figma-variable-audit` exists specifically because "downstream mirror" needs an active drift check, not passive trust: it diffs Figma's variables against the committed tokens and usage before anything gets pulled back, so an accidental Figma edit can't sneak into `primitives.json` unreviewed. The committed `figma-variables.json` mirror already carries one concrete catch from this check: 13 `font/line-height/*` variables in Figma's Device collection are flagged `figmaExtrasAwaitingDecision` — orphaned mirrors of a device-level line-height indirection that was removed from code in commit `48a2e15` (2026-06-24), left for an owner decision rather than silently deleted or silently re-imported.

One further refinement earns its own line because it prevents a false-positive drift report forever: Figma cannot store **unitless values**. Line-heights in code are unitless ratios (`1`, `1.25`, `1.4`...) specifically so they scale with any font size; Figma is forced to store them as fixed pixels. That's a permanent representational gap, not drift, and both Figma-facing moments (`/figma-variable-audit`, `/figma-variable-push`) explicitly exclude line-heights from their diffs rather than flag a difference that will never go away and was never wrong.

## Four layers, because one flat file couldn't hold three orthogonal facts

The other half of this story is architectural, not political: tokens resolve through four ordered layers — primitives → brand → theme → device — and the reason there are four, not one, is that a flat file can't simultaneously answer three unrelated questions:

1. What is the raw value? (primitives — context-free, single source)
2. Which brand's hue does a semantic slot point to? (brand — `color.brand.9` means "terracotta" for `upskill`, "cyan" for `horizon`)
3. What does that slot *mean* in light vs. dark mode? (theme — brand-agnostic semantic aliases)
4. How much of it, at what breakpoint? (device — spacing/typography/grid per screen size)

Each layer can only reference the one before it — theme aliases point at brand slots or primitives, never the other way — so the dependency graph is a straight line, not a web. That's what makes "switch brand" (`data-brand` attribute) and "switch color mode" (`data-theme` attribute) fully independent operations: changing one never has to know about the other, because neither layer references the other.

The brand layer is the newest piece, and it's a clean illustration of the system evolving without breaking its own invariant. Originally there was no brand layer — theme files pointed straight at a hue (`{color.terracotta.9}`), so a second brand would have meant forking every theme file wholesale. ADR-012 inserted brand as a layer *between* primitives and theme instead: theme files were rewritten to point at brand slots (`{color.brand.9}`), and a brand file resolves which literal hue each slot means. Adding `horizon` as a second brand became "write one new brand file," not "duplicate the semantic layer."

## Naming with teeth, not vibes

A subtler discipline runs underneath the four layers: token *names* are made to encode intent, and three ADRs pin this down hard enough that a Style Dictionary build or a lint rule can catch a violation, rather than relying on a reviewer remembering a convention.

- `space.*` (gaps, padding, margin) is never the same token as `size.*` (icon/avatar/control dimensions) even when the raw pixel value is identical — `space.300` and `size.300` can both be 24px and mean different things.
- `space.*` (spacing *inside* a component) is never the same category as `grid.*` (the page grid at a breakpoint), even when values coincide, because `grid.*` is consumed by exactly one place — the `.container` utility — and cross-use would silently couple unrelated layout decisions.
- The group-default suffix went through a full reversal, not a quiet edit: `$root` was the original convention, discovered later to require a custom preprocessor and produce meaningless `-root` CSS suffixes, and was fully superseded by `.default` once research confirmed that's what the W3C DTCG spec, Tokens Studio, and Style Dictionary all converge on. The old ADR wasn't deleted — it carries a supersession note, the same "amend or supersede, never silently rewrite" discipline that governs the Airtable side of this system (see the governance section of this case study).

None of these are style preferences enforced by review discipline alone. They're structural — Style Dictionary's custom transforms in `build.js` encode them, and a token that crosses categories produces output a human would immediately notice looks wrong.

## The invariant that closes the loop

Everything above is in service of one rule stated plainly in `CLAUDE.md` and never violated anywhere in the codebase: **components only ever consume the built output — `var(--token-name)` in CSS, generated constants in TS — never the source JSON.** `npm run tokens:build` is the only bridge between the DTCG source and anything a component can `import` or reference. That single chokepoint is what makes every rule above enforceable: if a component could reach into `primitives.json` directly, brand-swapping, theme-swapping, and the naming discipline would all be optional per call site instead of guaranteed by the build.

## Sources for this section

- `docs/01-token-pipeline.md`
- `docs/decisions/002-three-layer-token-model.md` (+ two amendments)
- `docs/decisions/003-root-token-convention.md` (superseded)
- `docs/decisions/004-layout-token-categories.md`
- `docs/decisions/005-size-vs-space-primitives.md`
- `docs/decisions/012-brand-layer-multi-brand.md`
- `packages/tokens/build.js`, `.claude/commands/tokens-author.md`
