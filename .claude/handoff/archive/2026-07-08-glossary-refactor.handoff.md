---
status: done
created: 2026-07-08
completed: 2026-07-08
---

## Correction before starting: there are two glossary files, not one

`docs/08-glossary.md` is the real glossary — linked from `_sidebar.md` and `00-start-here.md` (item 8), tracked by `docs:check` via its `sources:` frontmatter, and already organized by topic. It is already correct on things the orphan copy has wrong (e.g. it says "nine" agentic moments; the orphan still says "eight" and has a stripped-down `Deterministic gate` / `Frozen snapshot` entry from before `/docs-sync` and pattern-generation were added).

`docs/glossary.md` is an **orphan draft** — not in the sidebar, not in `00-start-here.md`, not a `docs:check` source. It's where a batch of new AI/Eval terms (Few-Shot Prompting, Temperature, RAG, Hallucination, Context Rot, Evaluation Harness, Ground Truth, Golden Dataset, Assertions, Regression Testing, Synthetic Data Generation, Overfitting, Waiver, Ledger, Invariant, Frontmatter, Diff, Build, Handoff, Model Routing, Pruning, Dedup/Consolidation Discipline, Durable Grammar, Adversarial Review, Linting, Per Run Loop) got pasted in, in a different format (`### Term` heading + `*Example:*` bullet) than the rest of the site uses (`**Term**` + flowing paragraph ending in a repo-grounded example and, where useful, a "Contrast with X"/"See also" clause worked into the prose).

**Decision: one glossary file, not two, not a new doc.** This site's pages are already split by topic (01–07); the glossary's whole job is to be the single alphabetical-by-section lookup that cross-links into those pages. Splitting it into a second file defeats that, and doesn't match how any other page here is scoped. The fix is a consolidation into `08-glossary.md`, not a new hierarchy.

⸻

## Revised plan

### Phase 1 — Map the proposed IA onto what already exists

The categories from the original chat prompt mostly already exist in `08-glossary.md` under different names — this is a rename + regroup, not a rebuild:

| Proposed section | Existing `08-glossary.md` section | Action |
|---|---|---|
| Design System Fundamentals | `## Component architecture` | Keep, rename heading |
| React Concepts | Scattered: `Hook (React)`, `Ref / forwardRef`, `Spread props`, `Component tree (React)` (currently buried in `## Trees`) | Pull into its own `## React concepts` section |
| Browser Fundamentals | `Accessibility tree`, `DOM tree`, `Render tree` (currently in `## Trees`) | Pull into its own `## Browser fundamentals` section |
| Design Tokens (Core/Pipeline/Governance) | `## Design tokens — core concepts` / `— pipeline` / `— governance` | Already matches; keep as-is |
| APIs & Integrations | `## APIs` | Keep, rename heading |
| Git & Development Workflow | `Working tree (Git)` (currently in `## Trees`); nothing else | New section — pull `Working tree` in, add `Diff`, `Frontmatter`, `Pull request` (currently undocumented) |
| AI & Agentic Workflows | `## Agentic loops`, plus `LLM token`/`Bearer token`/`Auth token` (currently in the standalone `## Tokens` word-overload section) | Merge `## Tokens` entries in here or keep `## Tokens` as its own short section — see note below |
| AI Evaluation & Reliability | Doesn't exist yet — this is `docs/glossary.md`'s new content | New section, rewritten to house style (see Phase 2) |

Note on `## Trees`: it's a genuinely useful cross-cutting teaching device (four kinds of tree, one page), so don't delete it — keep it as a short standalone section that states the unifying idea, but move each individual term's *full* definition into its topical home (React concepts / Browser fundamentals / Git) and have `## Trees` link out to them instead of duplicating the prose.

Note on the word-overload `## Tokens` section (Auth token / Bearer token / LLM token): it doesn't fit neatly into one proposed category since it's deliberately about three unrelated meanings of one word. Keep it standalone rather than splitting it apart — splitting would lose the point of the entry, which is "here are three things with the same name, don't confuse them."

### Phase 2 — Rewrite only the new entries, into the existing house style

Don't introduce the `## Term / Definition / **In practice** / **Common confusion** / **Example** / **See also**` template from the original prompt — no entry in `08-glossary.md` uses labeled subsections today, and mixing two entry formats in one file is worse than either alone. Match what's already there:

```
**Term**
Flowing-paragraph definition, ending in a concrete example grounded in this repo's actual files/commands where one exists, and a "Contrast with X." or "See also X." clause folded into the prose when useful.
```

Apply this to every AI/Eval term being ported over from the orphan file. Concretely, ground the generic ones in real repo artifacts instead of made-up examples, e.g.:
- **Waiver** → `scripts/token-contrast-waivers.json` and `scripts/a11y-backlog.json` (the two actual shrinking-ledger waiver files)
- **Ledger** → `.claude/handoff/run-ledger.json`
- **Invariant** → the "Invariant that must survive" column in the agentic-moments table in `CLAUDE.md`
- **Frontmatter** → the 3-line `status/created/completed` block on this very handoff file, or the `sources:` block on `08-glossary.md` itself
- **Adversarial Review** → `/review-component`'s one fresh subagent, read-only by construction
- **Handoff** → this file's own convention (ADR-015)
- **Diff** → skip or fold into an existing entry; too generic to need its own repo tie-in
- Terms with no honest repo tie-in (Temperature, Few-Shot Prompting, RAG, Overfitting, Golden Dataset, Synthetic Data Generation) can stay as plain AI/ML definitions without forcing a repo example — don't invent one that isn't true.

Drop **Model Routing** and **Per Run Loop** unless a concrete repo referent exists for them (nothing in this repo currently does per-request model routing or literal "per-run loop" naming) — an entry that doesn't describe something true of this repo just adds noise.

### Phase 3 — Consolidate, don't duplicate

1. Move/rewrite every section above into `08-glossary.md`.
2. Update its frontmatter `sources:` only if a genuinely new tracked source is introduced (none of the AI/Eval terms need one — they're general concepts, not derived from a specific repo file the way the existing sections are).
3. Delete `docs/glossary.md` once its content has been merged — it should not survive as a second file.
4. Update `_sidebar.md` / `00-start-here.md` only if the heading rename (e.g. "Component architecture" → "Design System Fundamentals") should be reflected in the page's one-line description — check before editing, since both already just say "terms explained for a non-developer collaborator" and may not need a change.

### Phase 4 — Cross-link

Same as originally planned: add "See also" references folded into prose (not a separate subsection) where terms relate — this already happens in the existing file (e.g. `Atom` ↔ `Molecule`, `Coupled` ↔ `Orthogonal`) and should extend to the new terms (e.g. `Hallucination` ↔ `Adversarial Review`, `Frozen snapshot` ↔ `Ground Truth`/`Regression Testing` if there's a genuine relationship — don't force one).

⸻

## Why not a separate `08a-ai-glossary.md` or similar

Considered and rejected: this repo's docs are explicitly "lite" (one person maintains it), and the glossary's value is being the one place to Ctrl-F a term regardless of category. Every other doc page (01–07) is scoped to one architectural concern; a glossary split by "kind of term" doesn't have an equivalent architectural boundary — it would just be an arbitrary second alphabetical list, doubling the places a reader has to check. Keep it one file, organized by section headings within it.
