---
sources:
  - .claude/commands/*.md
  - .claude/rules/*.md
  - .claude/agents/adversarial-reviewer.md
  - scripts/sense.js
  - packages/components/component.schema.json
  - docs/decisions/007-verified-component-loop.md
# clock reset 2026-07-08: /extract-learnings routing widened; glossary only lists the moment, still accurate
# clock reset 2026-07-10: sense.js lighter-path review recognition; glossary defines no stage-derivation rules, still accurate
# clock reset 2026-07-10: four commands gain deterministic-gate steps (PR #58); glossary defines no per-command procedures, still accurate
# clock reset 2026-07-13: sense.js change was STATUS_QUO rendering only (checklist table, compact maturity lists); stage derivation and checklist semantics unchanged, still accurate
---
# Glossary

Terms that come up in design system and developer conversations, explained for a non-developer collaborator. Terms are grouped by topic; each group maps loosely to one of this site's pages — [component architecture](02-component-lifecycle.md), [design tokens](01-token-pipeline.md), [governance](05-governance.md), and [agentic loops](06-agentic-moments.md).

---

## Design System Fundamentals

**Atom**
The smallest, most self-contained component in the system — one that doesn't depend on other components to function. `Button`, `Text`, `Icon`, and `Chip` are atoms. They can be used anywhere and composed into larger things. Contrast with molecule.

**Children**
The content you place *inside* a component when using it. In JSX, children are whatever sits between the opening and closing tags: `<Card>this is the children</Card>`. Some components (like `Box` or `Stack`) exist entirely to wrap and arrange their children. Others (like `Button`) accept children as the label text. A component that doesn't accept children is self-closing: `<Icon name="arrow" />`.

**Composition**
Building a complex UI by combining simple, focused components rather than creating one large component that does everything. In this repo, a course card row is not a `CourseCarousel` component — it is `ScrollArea` wrapping `Inline` wrapping several `CardVertical` components. Each piece stays simple and reusable; complexity lives in how they are arranged.

**Coupled**
Two things are coupled when one depends on the other — changing or using one affects the other. For example, if `useSlider` needed to read the scroll position from a `ScrollArea`, they would be coupled. Coupling is not always bad, but it makes things harder to change independently. The opposite of orthogonal.

**Hook (Claude Code)**
A shell command that runs automatically when Claude does something — for example, "run the linter after every file edit." Configured in `.claude/settings.json`. Unrelated to React hooks despite sharing the name.

**Implementation stage**
Where a component sits in the build-review-sign-off pipeline — one axis of the two-axis lifecycle (the other is maturity: `beta`/`ready`/`deprecated`). Exactly four broad stages exist, and only these four ever reach Airtable's `Implementation` column: `todo` (human-set — planned, no code yet), `in progress` (derived — code exists but the review pipeline hasn't begun), `in review` (derived — generation is complete and renderable; the review checklist is open, and the component stays here as committable work-in-progress until sign-off), and `done` (human-set sign-off). `sense.js` derives the two middle stages from handoff artifacts; the human values always win and are never overwritten. See also Sub-state (pipeline), Review checklist.

**Layout component**
A component whose only job is to control how its children are arranged in space — it has no visual style of its own. `Box`, `Stack`, and `Inline` are layout components. They set spacing, direction, and alignment via tokens but render no color, border, or background. Contrast with content component.

**Content component**
A component that carries visual meaning or user interaction: `Button`, `Text`, `Heading`, `Card`, `TextField`. Content components may use layout components internally, but from the outside they present a styled, meaningful piece of UI. Contrast with layout component.

**Molecule**
A component built from two or more atoms combined into a small, reusable unit. `Card` is a molecule — it composes `Text`, `Heading`, and layout primitives into a single thing with its own purpose. Molecules are still general enough to be reused across the product. Contrast with atom.

**Orthogonal**
Two things are orthogonal when they are fully independent — using or changing one has no effect on the other. In this repo, `ScrollArea` (native browser scroll), `useCarousel` (JS-animated carousel), and `useSlider` (fade-in step-through) are orthogonal: they solve different problems and share no state or implementation. The opposite of coupled.

**Props and variants**
Props are the inputs you pass to a component to control its appearance or behavior — similar to settings or options. For example, `<Button size="lg" disabled>Save</Button>` passes a `size` prop and a `disabled` prop. A **variant** is a specific type of prop that switches between named visual styles: `<Button variant="primary">` vs `<Button variant="secondary">`. In this repo's metadata, variants are modelled as named axes — each axis (like `variant` or `size`) lists its options, its default, and the purpose of each option. This is how the scaffold and layout tools know what combinations a component supports.

**Review checklist**
The four items a component clears while in the `in review` stage, rendered per component in `STATUS_QUO.md` and derived at render time by `sense.js` (no stored checklist state): (1) the automated gate — lint, typecheck, build, metadata, a11y as one pass/fail item; (2) visual review — the human go/no-go; (3) code review — via the adversarial subagent or in-session `/code-review`, depending on the review path; (4) learnings back-fill via `/extract-learnings`. Items a path doesn't require render as an explicit `n/a — reason`, never silently omitted. See also Review path, Visual review.

**Review path**
Which review route a component or layout took, recorded as `reviewPath` in the review artifacts. Two values: `adversarial` (`/review-component` — one fresh, read-only subagent reviews with independent context, followed by the `/extract-learnings` loop) and `in-session` (`/code-review` run on the diff inside the working session — no subagent, no separate learnings step, so checklist item 4 is `n/a`). See also Adversarial Review, Subagent.

**Scaffold**
To generate the skeleton files for a new component — the `index.tsx`, CSS module, stories file, and `metadata.json` — from a template, before any real logic is written. Scaffolding creates the structure; the developer (or agent) fills in the details afterward. In this repo the `/component-scaffold` command does this.

**State (component)**
The different conditions a component can be in that change its appearance or behavior. Common states: `default`, `hover` (cursor is over it), `focused` (selected via keyboard), `disabled` (not interactive), `loading`, `error`. States are defined in each component's `metadata.json` and are distinct from React state (the internal data a component holds) — though the two are related: a component uses React state to track which visual state it is currently in.

**Sub-state (pipeline)**
A finer-grained label under the `in progress` implementation stage, recorded only in `.claude/component-pipeline.json` and `STATUS_QUO.md` — never pushed to Airtable. Two values: `unreviewed` (code exists but no loop artifacts at all — this replaces the old `established` stage label) and `scaffold-underway` (a `.run.json` is open but the component hasn't reached its render checkpoint yet). See also Implementation stage.

**Visual review**
The human yes/no/other judgment on a freshly rendered component or layout, given in Storybook right after the render checkpoint. `/add-component` and `/layout-generation` record the answer as a `visualReview` record (`status: approved | changes-requested`, `comments`, `at`) in `.claude/component-review-state.json` — it is item 2 of the review checklist. See also Review checklist.

**Wrapper**
A component (or element) whose only purpose is to surround something else — to add styling, behavior, or structure without contributing visible content of its own. `ScrollArea` is a wrapper: it adds hidden-scrollbar overflow behavior to whatever is inside it. `Box` is a wrapper: it applies spacing and layout rules. Wrappers are often thin — just a `div` with a CSS class or a few props — and they rely on composition to do meaningful work.

---

## React concepts

**Component tree (React)**
The nested hierarchy of React components in an application. The root component sits at the top; it renders child components, each of which may render further children, forming a tree. Props and data flow downward from parent to child; events bubble upward. In this repo, a layout like `ScrollArea > Inline > CardVertical` is a fragment of a component tree, and the `/layout-generation` command produces a React component tree for a page — each structural choice annotated by the metadata rule that justified it.

**Hook (React)**
A function that packages reusable state or behavior so multiple components can share it. In React, hooks always start with `use` by convention (`useCarousel`, `useSlider`, `useState`). They are not components — they have no visual output. Instead, you plug them *into* a component to give it behavior. In this repo, `useCarousel` tracks which card is currently active; `useSlider` tracks which step is visible in a step-through UI.

**Ref / forwardRef**
A ref is a way for a parent component to get a direct handle on a child's underlying HTML element — for example, to call `scrollBy()` on a `ScrollArea` div, or to move focus to a `TextField` programmatically. `forwardRef` is the React pattern that allows a component to pass that handle through to its caller. You'll see `forwardRef` in component source code when the component needs to expose its DOM element. As a non-developer, the main thing to know is: if a component supports ref, it can be controlled programmatically by its parent, not just through props.

**Spread props (`...rest`)**
A pattern where a component forwards any props it doesn't explicitly handle down to the underlying HTML element. In code it looks like `{...rest}`. For example, `ScrollArea` accepts `orientation` as its own prop, but if you also pass `aria-label="Course list"` or `style={{ height: 300 }}`, those pass straight through to the `div` because of `...rest`. It keeps components flexible without having to list every possible HTML attribute explicitly.

---

## Browser fundamentals

**Accessibility tree**
A parallel representation of the page that the browser builds alongside the DOM and exposes to screen readers and other assistive technologies. It contains only semantically meaningful nodes — not bare layout divs — and labels each one with a role, a name, a state, and any relevant properties. ARIA attributes modify the accessibility tree without changing the visual DOM. In this repo, every interactive component (`Button`, `TextField`, `Select`, `DropdownMenu`, etc.) must have correct roles and states so that a screen reader gives the user an accurate picture of the UI — verified by the behavioral a11y tests (`*.a11y.test.tsx`).

**DOM tree**
The browser's internal representation of an HTML page as a hierarchy of nodes — document at the root, then `<html>`, then `<head>` and `<body>`, then every element nested inside. "Tree" refers to the branching parent-child structure: each element is a node contained inside exactly one parent. JavaScript and React both read and modify the DOM tree to update what is displayed on screen. React does this indirectly, via a virtual DOM it maintains in memory before syncing changes to the real one.

**Render tree**
The combined result of the DOM tree and the CSS rules, used by the browser to decide what actually appears on screen. Unlike the DOM, the render tree excludes invisible elements (`display: none`) and includes computed styles for every visible node. After building the render tree, the browser runs a **layout** step (calculating each element's size and position) and a **paint** step (drawing pixels). In a design system, the tokens that set sizes, spacing, and colors feed into this pipeline — changing a token propagates through the render tree and repaints every element that used it.

---

## Trees

A **tree** is a data structure where each item (called a node) has exactly one parent, except for the root at the top. Browsers, React, Git, and assistive technologies each maintain their own tree representation of a page or project. The browser's two — the DOM tree and the render tree — plus the accessibility tree assistive technology reads, are covered in Browser fundamentals; React's component tree is covered in React concepts; Git's working tree is covered in Git & Development Workflow. The same HTML can give rise to all of them simultaneously — this section exists as a pointer because that's a useful thing to know as one fact, even though each individual tree's full definition belongs to a different topic above.

---

## Design tokens — core concepts

**Alias**
When one token points to another token instead of holding a raw value. Written in curly-brace syntax: `{color.terracotta.9}`. Aliases are how semantic tokens reference primitives — changing the primitive updates every alias that points to it automatically.

**Primitive**
A raw, context-free token that holds a concrete value: `color.terracotta.9 = #D15D50`. It says what the value *is*, not where to use it. Primitives are the single source of truth; all other layers reference them via aliases.

**Scale**
A numbered sequence of values for a single property. In this repo, each color hue has a `1–12` lightness scale (light mode), a `dark-1` through `dark-12` scale (dark mode), and an `alpha-1` through `alpha-12` scale (transparent variants). Font weights follow a `100–800` scale. The numbers indicate where a value sits within the range — lower numbers are lighter/smaller, higher numbers are darker/larger.

**Semantic token**
A token that describes *intent* rather than a raw value. `color.action.primary` doesn't say "terracotta at step 9" — it says "the primary action color." It points to a primitive via an alias, and that alias can change per theme (light, dark) without the token name ever changing. Components reference semantic tokens so they adapt to themes automatically.

**Token**
A named design decision stored as data — a color, a spacing size, a font size, a border radius. Instead of writing `#D15D50` directly in CSS, you give it a name (`color.action.primary`) and reference the name everywhere. When the value needs to change, you update the token once and every component that uses it updates automatically.

---

## Design tokens — pipeline

**Build**
The step that turns source files into the artifacts a system actually runs on. In this repo, `npm run tokens:build` is a build: Style Dictionary reads the token JSON source and produces the CSS custom properties and JS constants components consume. See also Style Dictionary.

**CSS custom property**
The output format that the browser reads, produced by the Style Dictionary build. Looks like `--ds-color-action-primary`. Components reference these in their stylesheets via `var(--ds-color-action-primary)`. You never write these by hand — they are generated from the token JSON files.

**Style Dictionary**
The build tool that converts the token JSON source files into CSS custom properties and JS constants. Running `npm run tokens:build` triggers Style Dictionary. It applies transforms (such as px → rem) and produces the files that components actually consume.

**Transform**
A conversion step applied by Style Dictionary during the build. Examples in this repo: converting pixel values to `rem` units, converting font-weight strings like `"Bold"` to their numeric equivalent (`700`), and wrapping device tokens in `@media` blocks. Transforms are configured in `packages/tokens/build.js`.

---

## Design tokens — governance

**Deprecated**
A token that is scheduled for removal. It still works, but should not be used in new code. In this repo, deprecated tokens are flagged in Airtable with `status: deprecated` and point to a `successor` token that should be used instead. The `/token-deprecation-pass` command migrates existing usages automatically.

**Drift**
When Figma variables and code tokens have diverged and no longer match — a value was changed in one place but not the other. In this repo, code is the source of truth, so drift is always resolved by updating Figma to match the code, never the other way around. The `/figma-variable-audit` command detects drift.

**Successor**
The replacement token for a deprecated one. Stored as a dot-path in Airtable (e.g. `color.terracotta.9`). When a token is deprecated, its successor field tells the migration tooling exactly which token to substitute in every place the deprecated token was used.

---

## APIs & Integrations

**API (Application Programming Interface)**
A defined contract that lets two systems talk to each other. One system makes a request; the other responds with data or confirms an action. In this repo, Airtable, GitHub, and Figma all expose APIs — scripts call them to sync tokens, open pull requests, or read variable definitions without anyone opening a browser.

**API key / authentication**
A secret credential that proves to an external service that you are allowed to call it. In this repo, the Airtable API key is stored in a `.env` file locally and as a [CI](08-glossary.md) secret in GitHub Actions — never committed to the repo. Without it, the sync scripts are rejected by Airtable's servers.

**CI (Continuous Integration)**
Automation that runs checks on every change pushed to the repository, before the change is allowed to merge — so nobody has to remember to run them. A local npm script like `npm run docs:check` runs only when you invoke it; CI runs the same script automatically as a merge gate. In this repo, GitHub Actions workflows such as `docs-check.yml` and `components-check.yml` run on every pull request, so a stale doc or a stale component snapshot blocks the merge instead of slipping through.

**Endpoint**
A specific URL on an API that performs one action. For example, Airtable has separate endpoints for reading records, creating records, and updating records. `scripts/airtable-sync.js` calls the "upsert records" endpoint; `scripts/airtable-pull.js` calls the "list records" endpoint. An API is the whole contract; an endpoint is one door into it.

**Rate limit**
A cap on how many API calls you can make in a given time window. Exceed it and the service rejects your requests until the window resets. This is one reason CLAUDE.md forbids putting MCP calls inside loops — looping over many records while calling Figma or Airtable on each iteration would hit rate limits quickly. Scripts batch their calls; agents are used only for one-off, human-present tasks.

**REST API**
The style of API used by Airtable and GitHub in this repo. "REST" describes a set of conventions: each endpoint is a URL, requests use standard HTTP methods (`GET` to read, `POST` to create, `PATCH` to update, `DELETE` to remove), and responses come back as JSON. You don't need to know the conventions in detail — just that when CLAUDE.md says "direct REST calls," it means a script talking to one of these APIs without going through an intermediary tool.

**Upsert**
A portmanteau of "update" and "insert." An upsert tells an API or database: if a record with this identifier already exists, update it; if it doesn't exist, create it. You use it when syncing data where you don't know upfront whether a record is new or pre-existing — it handles both cases in one operation without needing a prior lookup. In this repo, `scripts/airtable-sync.js` calls Airtable's upsert endpoint when pushing tokens, so it doesn't need to first check whether a token row already exists. The alternatives are a plain **insert** (creates a new record, fails or errors if one already exists) or a plain **update** (modifies an existing record, does nothing if it doesn't exist). Some APIs also offer **replace** (delete then insert), which overwrites the whole record rather than merging changes.

---

## Git & Development Workflow

**Diff**
The set of line-level differences between two versions of a file — additions and removals shown together, so a reviewer can see exactly what changed without re-reading the whole file. `git diff` shows this for uncommitted changes; a GitHub pull request shows it as red/green line highlighting for review.

**Frontmatter**
A block of key-value metadata at the very top of a markdown file, delimited by triple dashes (`---`). The handoff files in `.claude/handoff/` carry a frontmatter block (`status`, `created`, `completed`) — it lets `npm run handoff:tidy` know whether a handoff is still active without parsing the prose below it. This page's `sources:` block is another example: it lists the files `docs:check` watches to decide whether this page has gone stale.

**Pull request**
A request to merge one branch's commits into another, opened so the change can be reviewed before it lands. In this repo, agent-generated work always goes through a PR rather than committing straight to `main` — `/review-component` opens one on a `component/<kebab-name>` branch, `/docs-sync` on a `docs-sync/<date>` branch — so a human reviews agent output before it becomes the default branch's history.

**Working tree (Git)**
The files on disk in your project folder that you can see and edit — distinct from Git's stored history. When you open a file and make changes, you are working in the working tree. `git status` compares your working tree against the last committed snapshot and reports what has changed. In Claude Code, the term appears when multiple simultaneous copies of a branch are needed: `git worktree` creates an additional working tree at a different folder path so two branches can be checked out at once without cloning the whole repo again.

---

## Tokens

The word "token" means something different in each field that uses it. In this repo alone it appears in three distinct senses: design tokens (named values for colors, spacing, etc.), auth tokens (credentials for calling APIs), and LLM tokens (chunks of text a model processes). The design token meanings are covered in depth in the "Design tokens" sections above; the entries below cover the other two.

**Auth token**
A dynamically generated credential that proves identity or grants permission for a specific action — typically short-lived and scoped, unlike a static API key. Auth tokens are issued as part of a login or authorization flow and expire automatically. In this repo, GitHub Actions generates a `GITHUB_TOKEN` at the start of each workflow run — CI scripts use it to call the GitHub API, and it is revoked automatically when the job finishes. Contrast with API key / authentication, which tends to be long-lived and broad.

**Bearer token**
The HTTP convention for sending a credential to an API: the request includes a header `Authorization: Bearer <value>`. Any request that "bears" (carries) this header is treated as authenticated. Both API keys and auth tokens are typically sent this way — "bearer" describes the transport pattern, not the kind of credential. When scripts in this repo call the GitHub or Airtable APIs, they attach the relevant key or token in exactly this form.

**LLM token**
The smallest chunk of text a language model processes as a single unit. A token is roughly a word fragment — "tokenization" might split into `["token", "ization"]`; short common words are usually one token each. Limits and costs for Claude are measured in tokens, not words or characters: the context window is a token budget, and Anthropic's pricing is per input and output token. This is why the design of agentic moments in this repo keeps the data fed to Claude small — fewer tokens means faster, cheaper runs.

---

## Agentic loops

**Agentic moment**
One of the nine defined scenarios in this repo where invoking Claude with external tool access is worth the cost. Each moment is developer-triggered, has a clear input and output, and maps to a slash command. The nine are: `/figma-variable-audit`, `/token-deprecation-pass`, `/component-scaffold`, `/layout-generation`, `/figma-variable-push`, `/add-component`, `/review-component`, `/extract-learnings`, and `/docs-sync`. Everything outside these moments is a script or a GitHub Action — not an agent.

**CLAUDE.md**
The project instruction file Claude Code loads into every session — the one document an agent is guaranteed to have read before doing anything. Because it competes for context-window space with the actual task, every line has a recurring cost, paid on every session forever. This repo caps it at 200 lines / 20KB, enforced in CI by `npm run claudemd:check` (ADR-017), and keeps only cross-cutting invariants and indexes that point elsewhere — anything package-specific lives in a path-scoped rule instead. See also Context window, Rules (path-scoped).

**Context window**
The amount of information an AI can hold and reason over at once — think of it as working memory. It has a hard limit. This is why this repo uses frozen snapshots: instead of streaming raw Figma or Airtable data into an agent mid-task, the relevant information is pre-written to a small file (`STATUS_QUO.md`, `.claude/handoff/runs/<Name>.snapshot.json`) that the agent reads. Less data in context means more room for reasoning, and cheaper, faster runs.

**Deterministic gate**
A fixed set of automated checks that must pass before agent-written code is allowed to proceed to human review. In this repo the gate is: `npm run metadata:validate` + `npm run typecheck` + `npm run build` + `npm run a11y:coverage` + `npm run a11y:test` + `npm run patterns:generate`. "Deterministic" means the result is always the same for the same input — no judgment involved, just pass or fail. If the gate fails, the loop bounces back to the scaffold stage rather than pushing broken code forward.

**Frozen snapshot**
A committed file that captures the state of an external system at a point in time, so agents can read it without making a live API call. In this repo: `airtable-governance.json` (Airtable state), `token-usage.json` (repo scan), `figma-variables.json` (Figma variables), `.claude/component-signoff.json` (human sign-off pulled from Airtable), `.claude/component-pipeline.json` (per-component pipeline stage), `.claude/component-patterns.json` (cross-component pattern aggregate), and `.claude/STATUS_QUO.md` (aggregate of the above). Regenerated manually before a loop run with `npm run sense`. Frozen snapshots keep agents fast, cheap, and immune to rate limits during a task.

**Glob pattern**
A file's location is written as a **path** — the chain of folder names leading to it, like `packages/tokens/src/primitives.json`. A glob pattern is a way of writing a location that matches many files at once instead of one exact file, using special characters — most commonly `*` — to stand in for "anything here"; also called a **wildcard** pattern. `packages/tokens/**` means "every file under `packages/tokens/`, at any depth," rather than one specific file. In this repo, path-scoped rules declare when they load using glob patterns in their `paths:` frontmatter. See also Rules (path-scoped).

**Handoff**
A committed file that formally transfers context and state from one stage of a loop — or one session — to the next, so work can resume without re-deriving what already happened. In this repo, markdown handoffs live in `.claude/handoff/` with a 3-line frontmatter block (`status`, `created`, `completed`) per ADR-015; per-run component-loop JSON handoffs live under the gitignored `.claude/handoff/runs/`, regenerable via `npm run sense:component <Name>`. See also Frontmatter.

**MCP (Model Context Protocol)**
A protocol that connects Claude to external tools — Figma, Airtable, GitHub, Notion — so it can read and write to them during a conversation. MCP tools appear as capabilities Claude can call, like `get_design_context` (Figma) or `list_records` (Airtable). In this repo, MCP is reserved for one-off, developer-present tasks — never for recurring scripts or CI, because MCP calls are interactive and not scriptable.

**Orchestrator**
The main Claude session that coordinates a multi-stage agentic loop. In `/add-component`, the orchestrator runs Stages 0–2b (sense, scaffold, gate, visual checkpoint), then delegates to `/review-component` which spawns the one adversarial subagent. It decides when to move forward, when to bounce back, and when to open the PR. Having one orchestrator keeps the loop sequential and predictable.

**Progressive disclosure**
Giving an agent only the instructions relevant to the task at hand, and loading everything else on demand instead of all up front. This repo's instruction surfaces form a ladder: `CLAUDE.md` (always loaded — cross-cutting invariants only) → path-scoped rules (loaded when a matching file is touched) → slash commands and skills (loaded when invoked) → frozen snapshots (read when a moment needs external state). Each rung defers cost until the knowledge is actually needed, which keeps every session's context small and its instructions followable. See also Context window, Context Rot, Rules (path-scoped).

**Prompt**
The instruction given to an AI to tell it what to do. The slash commands in `.claude/commands/` are prompts — they describe the inputs, the steps, the constraints, and the expected output for each agentic moment. Prompt wording matters: a vague prompt produces vague output; a prompt that names specific files and rules produces consistent, verifiable results.

**Rules (path-scoped)**
Markdown instruction files in `.claude/rules/`, each with `paths:` frontmatter listing [glob patterns](08-glossary.md); Claude Code loads a rule into context only when the session touches a file matching its patterns. This repo keeps two: `components.md` (`packages/components/**`) and `tokens.md` (`packages/tokens/**`) — so component implementation rules cost nothing in a token-authoring session, and vice versa. A rule *without* `paths:` loads into every session, silently defeating the point, which is why `npm run claudemd:check` fails on one. See also CLAUDE.md, Progressive disclosure, Frontmatter.

**Slash command / skill**
A prompt file invoked by typing `/name` in a Claude Code session, loaded into context only at that moment. In this repo, `.claude/commands/` holds prompt-only commands (all nine agentic moments live there) and `.claude/skills/` holds commands that ship companion code (only `/run-storybook`, which ships `driver.mjs`). Claude Code's naming is the inverse of plain-English intuition — "skills" are the ones with code, "commands" are the prompts. On-demand loading is what lets each moment carry its full procedure without every session paying for it. See also Prompt, Agentic moment, Progressive disclosure.

**Subagent**
A fresh Claude session spawned by the orchestrator for one specific stage that benefits from having no prior context. In `/review-component` (called by `/add-component` or standalone), exactly one subagent runs the adversarial code review — it has never seen the scaffold, so it can spot issues the orchestrator might have rationalized away. It is also read-only by construction (its agent definition grants no file-editing tools): it reports findings, and the orchestrator writes them to `.review.json` and applies any fixes. After it finishes, control returns to the orchestrator. This repo's rule is at most two agents per loop (orchestrator + one subagent) to avoid draining the usage window. See also Adversarial Review.

**Tool call**
When an AI invokes a specific capability during a task — reading a file, running a shell command, calling a Figma MCP function, writing to disk. Each tool call is discrete and visible in the session transcript. In this repo's agentic moments, tool calls to external services (Figma MCP, Airtable MCP) are kept to a minimum and always happen with the developer present.

---

## AI Evaluation & Reliability

**Adversarial Review**
A review process — human or AI — that deliberately adopts a skeptical, fault-finding stance instead of a collaborative one, on the theory that someone trying to break something finds different problems than someone trying to help it succeed. In this repo, `/review-component` spawns exactly one fresh subagent for this purpose. See also Subagent.

**Assertions**
The explicit pass/fail checks a test or evaluation makes against an output. A **deterministic assertion** checks something exact and mechanical — a file exists, a class name equals `btn-large`, `npm run typecheck` exits 0. An **LLM-assisted assertion** instead asks a model to judge something fuzzier, like whether generated copy matches a tone-of-voice guideline. This repo's deterministic gate is built entirely from deterministic assertions — see Deterministic gate.

**Context Rot**
The gradual loss of focus and accuracy an AI model shows over a long, single conversation, as earlier turns — including stale errors or abandoned approaches — crowd out the instructions that actually matter. It's part of why this repo keeps agentic moments short and bounded rather than running one long open-ended session, and why frozen snapshots feed an agent only the current state rather than the history that produced it.

**Deterministic vs. Probabilistic**
A distinction between operations that always produce the same output for the same input (deterministic) and ones that vary run to run (probabilistic). `npm run typecheck` is deterministic — same code, same result, always. Asking Claude to draft a component summary is probabilistic — the wording will differ slightly each time even from an identical prompt. This repo's deterministic gate exists specifically to keep the parts that can be deterministic out of an agent's hands.

**Evaluation Harness**
An automated framework for measuring how well a model, prompt, or pipeline performs against a fixed set of test cases, rather than judging quality by spot-checking a few examples. This repo doesn't yet have one; the closest analogue is the deterministic gate plus the adversarial-reviewer pass, which check code correctness rather than prompt quality.

**Few-Shot Prompting**
Showing a model a small number of worked examples of the exact input/output shape you want, instead of only describing the rule in prose. In this repo, `/component-scaffold` points at an existing component as a template — effectively a one-shot example the agent pattern-matches against when generating the next one.

**Golden Dataset**
A small, deliberately curated set of the hardest or most representative test cases a system must handle correctly before a change ships — the benchmark, not just a sample. This repo doesn't maintain one currently; a plausible future one would be a fixed set of tricky layout briefs that `/layout-generation` must keep producing correctly.

**Ground Truth**
The verified-correct reference an output is checked against. A hand-checked `metadata.json` file that `npm run metadata:validate` runs against functions as ground truth for "is this schema-valid" — though correctness of the content itself still needs human review.

**Hallucination**
When a model states something confidently and fluently that is factually wrong or unsupported by the context it was given — inventing a file path, a prop name, or a token that doesn't exist. It's a specific risk this repo's frozen snapshots and adversarial review both guard against: giving an agent the real committed state to read, then having a second, skeptical pass check the output against that same state. See also Adversarial Review.

**Invariant**
A condition that must remain true no matter what else changes. The "Invariant that must survive" column in CLAUDE.md's agentic-moments table names one per moment — for example, `/figma-variable-audit` must never overwrite primitives without diffing against usage first. An invariant is a promise the system makes about itself, not a one-time check.

**Ledger**
An append-only record of events, kept specifically so nothing already recorded is ever edited or deleted — only added to. `.claude/handoff/run-ledger.json` is a ledger: every `/review-component` run's gate result and reviewer findings get appended to it, deduped by component and timestamp, so the history of runs survives even though the per-run JSON files themselves are gitignored.

**Linting**
Automated static analysis that flags structural or stylistic problems in source code without running it — a missing `alt` attribute, a raw hex color where a token should be used. `npm run lint` runs `jsx-a11y` lint in this repo (Tier 1 of the three-tier accessibility check); it catches a category of mistake before any test or build step does.

**Overfitting**
When a system becomes so tuned to the exact cases it was tested or trained against that it stops generalizing to new, slightly different inputs. A prompt tuned until it nails one layout brief perfectly but breaks on any brief phrased differently is overfit to that one example.

**RAG (Retrieval-Augmented Generation)**
Supplying a model with relevant, up-to-date material from an external source at the moment it answers, rather than relying only on what it learned during training. Every agentic moment in this repo is a form of RAG: `/component-scaffold` reads the component schema and an existing component before generating a new one, so it works from the repo's actual current rules instead of a guess.

**Regression Testing**
Re-running an existing test suite after a change to confirm the change didn't break something that used to work. This repo's `components-check.yml` does this on every PR touching components — the a11y, typecheck, and build steps all rerun regardless of which file changed, to catch a side effect the diff didn't obviously touch.

**Synthetic Data Generation**
Programmatically generating artificial data that mimics real data's shape, for testing without needing real records. This repo doesn't currently generate synthetic data; the closest need would be fabricating sample Airtable rows to test `scripts/airtable-pull.js` without touching the real base.

**Temperature**
A model setting that trades determinism for variety — low temperature produces the most likely, most consistent output; high temperature allows more varied, less predictable phrasing. Every agentic moment in this repo wants low-temperature behavior: writing a component or migrating a token usage should be as repeatable as possible, not creative.

**Waiver**
An explicit, tracked exemption that lets something bypass a rule temporarily instead of either fixing it immediately or silently ignoring it. This repo keeps two: `scripts/a11y-backlog.json` waives pre-existing interactive components that lack a behavioral a11y test, and `scripts/token-contrast-waivers.json` waives known, tracked contrast failures. Both are meant to shrink over time, never to grow.
