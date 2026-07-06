# Handoff — Refresh the Add-Component Loop case study

## Context
This repo (`upskill-design-system`) is a lite-agentic design system. Read `CLAUDE.md`
and `ROADMAP.md` first — honor every convention in them. This is a documentation-only
task: no component code, no tokens, no new pages.

`docs/add-component-loop-case-study.html` is a standalone, self-styled HTML write-up
(inline CSS, no external deps) documenting the `/add-component` loop stage-by-stage,
using the Accordion component's real pilot run as the worked example (Sense → Scaffold
→ Gate → Adversarial Review → Fix/Branch/PR, 5 stages in one continuous flow).

**The loop has changed since that doc was written (2026-06-23) and the doc is now
stale:**
- Stage 3 (adversarial review) and Stage 4 (fix, branch, PR) were extracted out of
  `/add-component` into a standalone `/review-component` command. `/add-component` now
  *delegates* to it rather than performing those steps itself.
- A new **Stage 2b — visual checkpoint** was inserted between the deterministic gate
  and the review stage: after the gate passes, the developer opens the Default story in
  Storybook, checks both light and dark themes, and replies `go` (or describes issues,
  which triggers a fix cycle) before anything proceeds to review. Nothing reaches Stage
  3 without this human sign-off.

The doc's narrative currently implies one command owns all 5 stages end-to-end. That's
no longer accurate.

## Tasks (in order)
1. Read `.claude/commands/add-component.md` and `.claude/commands/review-component.md`
   — the current, authoritative command definitions.
2. Read `ROADMAP.md` Phase 9 ("The Verified Component Loop") for the current accurate
   stage list: Stage 0 (sense, script) → Stage 1 (scaffold, in-session) → Stage 2 (gate,
   script) → **Stage 2b (visual checkpoint, human sign-off)** → Stage 3+ (delegates to
   `/review-component`: adversarial subagent, fix, branch `component/<kebab-name>`, PR).
3. Read `docs/add-component-loop-case-study.html` in full.
4. Edit the HTML to match the current shape:
   - Add a Stage 2b section/card for the visual checkpoint (model its markup on the
     existing `.stage` / `.stage-header` / `.stage-body` blocks used for Stages 0–4).
   - Adjust the Stage 3 and Stage 4 sections' framing so it's clear they now run inside
     the standalone `/review-component` command, invoked *by* `/add-component`, not as
     inline steps of the same script.
   - Update the pipeline diagram near the top (`.pipeline` / `.pipe-step` elements) to
     include the new stage.
   - Fix any prose elsewhere in the doc that describes the loop as a single unbroken
     5-stage command.
5. **Do not touch the historical Accordion pilot data** — the actual findings, diffs,
   terminal output, and stats (5 gate checks, 50 tests, 1 silent bug caught, etc.) are
   facts about that specific run and stay as-is. Only the *process/structure* narrative
   around them needs correcting.
6. If anything about the historical run is ambiguous, leave it unchanged rather than
   guessing — this is a structural-accuracy pass, not a rewrite.

## Definition of done
- The doc's described stages match `/add-component` + `/review-component` as they
  actually exist today, including Stage 2b.
- The Accordion pilot's factual content (findings, code, stats) is unchanged.
- The file still renders as valid standalone HTML (open it in a browser and check).

## Constraints
- Documentation-only. Do not edit component code, tokens, or any other file.
- No new components, no new commands. Don't invent findings or numbers.
- Commit only if asked; otherwise leave the change unstaged for review.
