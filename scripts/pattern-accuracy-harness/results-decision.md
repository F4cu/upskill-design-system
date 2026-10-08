# Governance decision eval results

Generated: 2026-10-08T08:01:59.936Z — 13 of 13 tasks scored.

Arm A = brief + CLAUDE.md component scope + ADR text (redacted per task). Arm B = A + candidate metadata (pre-decision from git for historical tasks). Arm C = B + candidate specs (ADR-027).
Headline: the decision label (and target, where the reference names one) matches the locked reference. A task passes in an arm when most of its runs are correct.
Secondary, never in the headline: citation hits, required candidates missed, hallucinated component names, recordPattern misses.

> **Honest-outcome rule** (handoff, pre-registered): don't tune briefs, reference answers or the scorer after seeing results.

| Task | Reference | Arm | Runs | Correct | Decisions | Cited | Missed candidates | Hallucinated | Pattern misses | Prompt chars |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| decision-arrow-vs-disclosure | internal(Accordion) | A | 3 | 0/3 | compose(Button) ×3 | 3/3 | 0 | 0 | 0 | 56930 |
| decision-arrow-vs-disclosure | internal(Accordion) | B | 3 | 0/3 | reuse(Button) ×2, compose(Button) ×1 | 3/3 | 0 | 1 | 0 | 74422 |
| decision-arrow-vs-disclosure | internal(Accordion) | C | 3 | 0/3 | reuse(Button) ×3 | 3/3 | 0 | 0 | 0 | 83378 |
| decision-button-ghost | extend-variant(Button) | A | 3 | 2/3 | extend-variant(Button) ×2, reuse(Button) ×1 | 3/3 | 0 | 0 | 1 | 52887 |
| decision-button-ghost | extend-variant(Button) | B | 3 | 3/3 | extend-variant(Button) ×3 | 3/3 | 0 | 1 | 0 | 62929 |
| decision-button-loading | extend-prop(Button) | A | 3 | 3/3 | extend-prop(Button) ×3 | 3/3 | 0 | 1 | 0 | 60222 |
| decision-button-loading | extend-prop(Button) | B | 3 | 3/3 | extend-prop(Button) ×3 | 3/3 | 0 | 2 | 0 | 73807 |
| decision-button-loading | extend-prop(Button) | C | 3 | 3/3 | extend-prop(Button) ×3 | 3/3 | 0 | 4 | 0 | 82763 |
| decision-button-trailing-icon | extend-prop(Button) | A | 3 | 3/3 | extend-prop(Button) ×3 | 3/3 | 0 | 0 | 0 | 57746 |
| decision-button-trailing-icon | extend-prop(Button) | B | 3 | 3/3 | extend-prop(Button) ×3 | 3/3 | 0 | 0 | 0 | 67788 |
| decision-card-actions-row | compose(Button) | A | 3 | 3/3 | compose(Button) ×3 | 3/3 | 0 | 0 | 3 | 60130 |
| decision-card-actions-row | compose(Button) | B | 3 | 3/3 | compose(Button) ×3 | 3/3 | 0 | 6 | 3 | 91802 |
| decision-card-actions-row | compose(Button) | C | 3 | 3/3 | compose(Button) ×3 | 3/3 | 0 | 3 | 3 | 100758 |
| decision-card-favorite-progress | parts(CardVertical) | A | 3 | 3/3 | parts(CardVertical) ×3 | 3/3 | 0 | 0 | 0 | 53090 |
| decision-card-favorite-progress | parts(CardVertical) | B | 3 | 3/3 | parts(CardVertical) ×3 | 3/3 | 0 | 0 | 0 | 100086 |
| decision-carousel | compose | A | 3 | 1/3 | compose(ScrollArea) ×1, extend-prop(ScrollArea) ×1, reuse(ScrollArea) ×1 | 3/3 | 0 | 4 | 3 | 56416 |
| decision-carousel | compose | B | 3 | 2/3 | compose(ScrollArea) ×1, compose(Inline) ×1, new ×1 | 3/3 | 0 | 3 | 2 | 88081 |
| decision-carousel | compose | C | 3 | 3/3 | compose(ScrollArea) ×3 | 3/3 | 0 | 5 | 3 | 106006 |
| decision-carousel-arrows | new | A | 3 | 3/3 | new ×3 | 3/3 | 0 | 0 | 0 | 57195 |
| decision-carousel-arrows | new | B | 3 | 0/3 | compose(Button) ×2, reuse(Button) ×1 | 3/3 | 0 | 4 | 0 | 73597 |
| decision-course-tag-filter | reuse(Chip) | A | 3 | 0/3 | compose(Chip) ×3 | 1/3 | 0 | 1 | 3 | 60149 |
| decision-course-tag-filter | reuse(Chip) | B | 3 | 2/3 | reuse(Chip) ×2, compose(Chip) ×1 | 3/3 | 0 | 0 | 3 | 73017 |
| decision-course-tag-static | reuse(Badge) | A | 3 | 3/3 | reuse(Badge) ×3 | 3/3 | 0 | 0 | 0 | 60111 |
| decision-course-tag-static | reuse(Badge) | B | 3 | 3/3 | reuse(Badge) ×3 | 3/3 | 0 | 0 | 0 | 69755 |
| decision-otp-input | escalate | A | 3 | 3/3 | escalate ×3 | 3/3 | 0 | 0 | 0 | 60138 |
| decision-otp-input | escalate | B | 3 | 3/3 | escalate ×3 | 3/3 | 0 | 0 | 0 | 68859 |
| decision-select-search | escalate | A | 3 | 3/3 | escalate ×3 | 3/3 | 0 | 0 | 0 | 60108 |
| decision-select-search | escalate | B | 3 | 3/3 | escalate ×3 | 3/3 | 0 | 0 | 0 | 76583 |
| decision-textfield-helper | extend-prop(TextField) | A | 3 | 3/3 | extend-prop(TextField) ×3 | 3/3 | 0 | 3 | 0 | 60221 |
| decision-textfield-helper | extend-prop(TextField) | B | 3 | 3/3 | extend-prop(TextField) ×3 | 3/3 | 0 | 0 | 0 | 71104 |

## Pass rate per arm

- Arm A: **10/13** tasks pass (30/39 runs correct).
- Arm B: **11/13** tasks pass (31/39 runs correct).
- Arm C: **3/4** tasks pass (9/12 runs correct).

## What the result decides (A vs B)

- **Thin semantics** (fails in A and B; the missing field is in the failing runs' records): decision-arrow-vs-disclosure
- **Metadata earns it** (fails in A, passes in B): decision-carousel, decision-course-tag-filter
- **Metadata hurts** (passes in A, fails in B): decision-carousel-arrows
