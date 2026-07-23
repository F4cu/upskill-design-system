# The metadata contract: making agent output verifiable

*Case-study source draft — narrative voice, for `docs/system-case-study.html`. Not yet linked from the docsify sidebar.*

## Docs rot. Contracts don't.

Every design system I've seen carries a Markdown page somewhere describing how a component is supposed to be used — its states, its accessibility notes, the mistakes people keep making with it. That page is correct the day it's written and slowly wrong forever after, because nothing forces it to stay in sync with the code it describes. Nobody's CI fails when a Markdown usage note goes stale.

I didn't want that file to exist in this system at all — not because prose documentation is bad, but because prose documentation that nothing checks is a liability dressed as an asset. So instead of a Markdown page per component, every one of the 27 components in `packages/components/src/` ships a `<Name>.metadata.json`: the same information — purpose, variants, states, accessibility contract, composition rules, anti-patterns — but as data, validated in CI against a JSON Schema on every pull request. If it's wrong, the PR doesn't merge. That single move is the whole idea of this write-up: turn documentation into a contract by making every claim in it checked, not trusted.

## Every claim is checked, not just written down

It would be easy to stop at "it validates against a schema" and call it done — that only proves the file is shaped correctly, not that it's true. So the validator goes further: it merges every token source file (primitives, every brand, both themes, all three device breakpoints) into one tree and confirms every token path a component claims to use actually resolves to a real value. A component can't say it uses `color.border.selected` after that token gets renamed — the check fails at the PR that introduced the drift, not months later when someone notices the doc is wrong.

The anti-patterns section goes further still. It doesn't just warn against misuse in prose — it captures hard-won implementation knowledge as structured fact. Accordion's metadata records, in full, why its collapsed panel must stay mounted in the DOM rather than conditionally rendered: unmounting it breaks the `aria-controls` reference a screen reader depends on. That's not a stylistic preference documented for posterity — it's a bug that was found, fixed, and then encoded so it can't be silently reintroduced by the next person (or agent) who touches the component.

## Why JSON, and not a nicer-looking format

I didn't pick JSON over Markdown for aesthetic reasons — I picked it for a mechanism I can defend on every read: JSON is unambiguous — explicit keys, explicit values, nothing to parse out of prose — while Markdown makes an agent do interpretive work on every read that a schema does once, at write time. The best published numbers for the general principle come from an adjacent angle: Anthropic's own MCP-efficiency write-up shows a workflow dropping from 150,000 tokens to 2,000 (98.7%) once raw, verbose payloads stopped flowing through model context in favor of only the structured facts a step actually needs — the same economy a keyed schema buys over prose ([sources](08-measured-impact.md)). An earlier draft of this section cited a specific "JSON cuts ~80% vs Markdown" benchmark; I could no longer trace that figure to a primary source, so it's gone — a claim I can't let a reader chase down has no place in a write-up whose whole thesis is "checked, not trusted."

That's also why the schema is deliberately narrower than the sources I drew it from. Two sections I considered — a full part-by-part anatomy breakdown, and a catch-all `aiHints` bucket for loose agent instructions — got cut. Anatomy didn't reduce token cost and had a better home already (Storybook stories, which are human-facing anyway). The catch-all bucket was the more interesting rejection: instructions with no structural home always eventually become either redundant with a real field or so vague they don't constrain anything. Distributing that guidance into `usage.keywords`, `usage.when`, and `composition` instead means every piece of agent guidance in the system has to justify its own field.

## The contract is what makes agent output verifiable

This is where the machine-readable format earns its cost. When `/layout-generation` builds a page out of library components, every structural decision it makes has to cite a real field in a real metadata file — which components a given component accepts as children, which patterns are proven compositions. It can't say "I put a Card inside a Card because that seemed reasonable" — it has to point at `composition.accepts` actually allowing it. That turns "trust the agent's judgment" into "check the agent's citation," which is a categorically easier thing for a human reviewer to do.

Accessibility inherits the same property from a different angle. A component's interactivity — and therefore whether it owes a behavioral accessibility test — isn't hand-flagged by a developer; it's derived automatically from the metadata that's already there: does `component.type` say interactive, does the ARIA role imply a widget, does a declared keyboard interaction go beyond plain Tab. The consequence is real: declaring a keyboard interaction in the metadata creates a test obligation the CI gate enforces. You can't document a component as keyboard-navigable and skip proving it — the two facts are wired together by a script, not by good intentions.

I also built a cross-component index on top of the per-component files — a scanner that groups all 27 components by interaction pattern and flags where the actual code disagrees with what its own metadata claims. I was tempted to feed that aggregate into every generation task on the theory that more structural context can only help. I measured it instead of assuming it, and the measurement said no for one of the two tasks it touches — the full story, including the numbers, is in [Rejected alternatives](05-rejected-alternatives.md). What shipped is narrower than what I first wanted to ship, and I think that's the more honest outcome to show a reviewer.

## What the contract costs

None of this is free. Every new component pays an authoring tax — someone has to sit down and write out its states, its tokens, its accessibility contract, its anti-patterns — before it's allowed to ship, and the schema is strict enough (`additionalProperties: false` throughout) that a shortcut gets rejected rather than silently tolerated. A foundation review early on found 7 of 11 metadata files failing their own schema, which is really a story about how easy it is for a contract to rot the same way prose docs do if nothing enforces it — the difference is that a JSON Schema in CI catches that in a pull request, and a Markdown page doesn't catch it at all.

The honest tradeoff is that this only pays off because the same file is read by multiple things — a scaffold, a layout generator, an accessibility gate, a reviewer — and not typed out and read exactly once. A one-off internal tool with a single audience wouldn't earn back the authoring cost. A system meant to be read by both humans and agents, repeatedly, over the life of the product, does.

## The loop closes: review findings become permanent contract

The part of this I'm most satisfied with isn't the schema — it's what happens after a review finds something wrong. When an adversarial review catches a real issue — a missing ARIA attribute, a keyboard interaction that doesn't actually work the way it's documented, a consumer misusing a component in a way the anti-patterns list didn't yet cover — the fix doesn't just land in the component's code. It's routed back into the specific metadata field the finding belongs to: an ARIA gap updates `accessibility.ariaAttributes`, a misuse pattern becomes a new `usage.antiPattern`, a parent/child mistake tightens `composition.accepts` or `composition.containedBy`.

That write-back is what makes the contract a *learning* contract rather than a static one. A mistake fixed only in code can be made again by the next person who reads the code instead of the metadata. A mistake fixed in the metadata is a mistake the next scaffold, the next layout generation, and the next reviewer all inherit as a checked fact. The system gets harder to misuse over time — not because anyone remembers more, but because more of what was learned is now something a machine checks instead of something a person has to recall.

## The reviewer trusts the contract because it can't lie about itself

There's one more piece worth naming: the file that describes a component is validated by the same CI pipeline that builds and tests the component, which means a human or an adversarial reviewer opening a pull request isn't choosing between reading 400 lines of implementation or trusting a claim someone typed into a doc — they're reading a file that has already been checked against the schema, against the real token tree, and (for the parts a scanner can see) against the actual JSX. That's a smaller trust leap than "believe the comment," and it's the reason I keep coming back to the same framing: a contract that's checked is worth building even when it costs more upfront than a page of prose, because the prose never had to prove anything to get published.

## Sources for this section

- `packages/components/component.schema.json`, `scripts/validate-metadata.js`
- `scripts/generate-pattern-schema.js`, `scripts/a11y-coverage.js`
- `docs/decisions/001-component-metadata-schema.md`, `docs/decisions/013-cross-component-pattern-schema.md`
- `docs/06-agentic-moments.md` (the `/extract-learnings` routing table)
- `docs/case-study-source/04-benefits-by-audience.md`, `docs/case-study-source/05-rejected-alternatives.md`
