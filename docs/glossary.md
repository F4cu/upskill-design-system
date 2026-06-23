# Glossary

Terms that come up in design system and developer conversations, explained for a non-developer collaborator.

---

## Component architecture

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

**Hook (React)**
A function that packages reusable state or behavior so multiple components can share it. In React, hooks always start with `use` by convention (`useCarousel`, `useSlider`, `useState`). They are not components — they have no visual output. Instead, you plug them *into* a component to give it behavior. In this repo, `useCarousel` tracks which card is currently active; the planned `useSlider` will track which step is visible in a step-through UI.

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

**Ref / forwardRef**
A ref is a way for a parent component to get a direct handle on a child's underlying HTML element — for example, to call `scrollBy()` on a `ScrollArea` div, or to move focus to a `TextField` programmatically. `forwardRef` is the React pattern that allows a component to pass that handle through to its caller. You'll see `forwardRef` in component source code when the component needs to expose its DOM element. As a non-developer, the main thing to know is: if a component supports ref, it can be controlled programmatically by its parent, not just through props.

**Scaffold**
To generate the skeleton files for a new component — the `index.tsx`, CSS module, stories file, and `metadata.json` — from a template, before any real logic is written. Scaffolding creates the structure; the developer (or agent) fills in the details afterward. In this repo the `/component-scaffold` command does this.

**Spread props (`...rest`)**
A pattern where a component forwards any props it doesn't explicitly handle down to the underlying HTML element. In code it looks like `{...rest}`. For example, `ScrollArea` accepts `orientation` as its own prop, but if you also pass `aria-label="Course list"` or `style={{ height: 300 }}`, those pass straight through to the `div` because of `...rest`. It keeps components flexible without having to list every possible HTML attribute explicitly.

**State (component)**
The different conditions a component can be in that change its appearance or behavior. Common states: `default`, `hover` (cursor is over it), `focused` (selected via keyboard), `disabled` (not interactive), `loading`, `error`. States are defined in each component's `metadata.json` and are distinct from React state (the internal data a component holds) — though the two are related: a component uses React state to track which visual state it is currently in.

**Wrapper**
A component (or element) whose only purpose is to surround something else — to add styling, behavior, or structure without contributing visible content of its own. `ScrollArea` is a wrapper: it adds hidden-scrollbar overflow behavior to whatever is inside it. `Box` is a wrapper: it applies spacing and layout rules. Wrappers are often thin — just a `div` with a CSS class or a few props — and they rely on composition to do meaningful work.

---

## Trees

A **tree** is a data structure where each item (called a node) has exactly one parent, except for the root at the top. Browsers, React, Git, and assistive technologies each maintain their own tree representation of a page or project — the same HTML can give rise to four distinct trees simultaneously.

**Accessibility tree**
A parallel representation of the page that the browser builds alongside the DOM and exposes to screen readers and other assistive technologies. It contains only semantically meaningful nodes — not bare layout divs — and labels each one with a role, a name, a state, and any relevant properties. ARIA attributes modify the accessibility tree without changing the visual DOM. In this repo, every interactive component (`Button`, `TextField`, `Select`, `DropdownMenu`, etc.) must have correct roles and states so that a screen reader gives the user an accurate picture of the UI — verified by the behavioral a11y tests (`*.a11y.test.tsx`).

**Component tree (React)**
The nested hierarchy of React components in an application. The root component sits at the top; it renders child components, each of which may render further children, forming a tree. Props and data flow downward from parent to child; events bubble upward. In this repo, a layout like `ScrollArea > Inline > CardVertical` is a fragment of a component tree, and the `/layout-generation` command produces a React component tree for a page — each structural choice annotated by the metadata rule that justified it.

**DOM tree**
The browser's internal representation of an HTML page as a hierarchy of nodes — document at the root, then `<html>`, then `<head>` and `<body>`, then every element nested inside. "Tree" refers to the branching parent-child structure: each element is a node contained inside exactly one parent. JavaScript and React both read and modify the DOM tree to update what is displayed on screen. React does this indirectly, via a virtual DOM it maintains in memory before syncing changes to the real one.

**Render tree**
The combined result of the DOM tree and the CSS rules, used by the browser to decide what actually appears on screen. Unlike the DOM, the render tree excludes invisible elements (`display: none`) and includes computed styles for every visible node. After building the render tree, the browser runs a **layout** step (calculating each element's size and position) and a **paint** step (drawing pixels). In a design system, the tokens that set sizes, spacing, and colors feed into this pipeline — changing a token propagates through the render tree and repaints every element that used it.

**Working tree (Git)**
The files on disk in your project folder that you can see and edit — distinct from Git's stored history. When you open a file and make changes, you are working in the working tree. `git status` compares your working tree against the last committed snapshot and reports what has changed. In Claude Code, the term appears when multiple simultaneous copies of a branch are needed: `git worktree` creates an additional working tree at a different folder path so two branches can be checked out at once without cloning the whole repo again.

Two things are coupled when one depends on the other — changing or using one affects the other. For example, if `useSlider` needed to read the scroll position from a `ScrollArea`, they would be coupled. Coupling is not always bad, but it makes things harder to change independently. The opposite of orthogonal.

**Hook (Claude Code)**
A shell command that runs automatically when Claude does something — for example, "run the linter after every file edit." Configured in `.claude/settings.json`. Unrelated to React hooks despite sharing the name.

**Hook (React)**
A function that packages reusable state or behavior so multiple components can share it. In React, hooks always start with `use` by convention (`useCarousel`, `useSlider`, `useState`). They are not components — they have no visual output. Instead, you plug them *into* a component to give it behavior. In this repo, `useCarousel` tracks which card is currently active; the planned `useSlider` will track which step is visible in a step-through UI.

**Orthogonal**
Two things are orthogonal when they are fully independent — using or changing one has no effect on the other. In this repo, `ScrollArea` (native browser scroll), `useCarousel` (JS-animated carousel), and `useSlider` (fade-in step-through) are orthogonal: they solve different problems and share no state or implementation. The opposite of coupled.

**Scaffold**
To generate the skeleton files for a new component — the `index.tsx`, CSS module, stories file, and `metadata.json` — from a template, before any real logic is written. Scaffolding creates the structure; the developer (or agent) fills in the details afterward. In this repo the `/component-scaffold` command does this.

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

**CSS custom property**
The output format that the browser reads, produced by the Style Dictionary build. Looks like `--ds-color-action-primary`. Components reference these in their stylesheets via `var(--ds-color-action-primary)`. You never write these by hand — they are generated from the token JSON files.

**Style Dictionary**
The build tool that converts the token JSON source files into CSS custom properties and JS constants. Running `npm run build:tokens` triggers Style Dictionary. It applies transforms (such as px → rem) and produces the files that components actually consume.

**Transform**
A conversion step applied by Style Dictionary during the build. Examples in this repo: converting pixel values to `rem` units, converting font-weight strings like `"Bold"` to their numeric equivalent (`700`), and wrapping device tokens in `@media` blocks. Transforms are configured in `style-dictionary.config.js`.

---

## Design tokens — governance

**Deprecated**
A token that is scheduled for removal. It still works, but should not be used in new code. In this repo, deprecated tokens are flagged in Airtable with `status: deprecated` and point to a `successor` token that should be used instead. The `/token-deprecation-pass` command migrates existing usages automatically.

**Drift**
When Figma variables and code tokens have diverged and no longer match — a value was changed in one place but not the other. In this repo, code is the source of truth, so drift is always resolved by updating Figma to match the code, never the other way around. The `/figma-variable-audit` command detects drift.

**Successor**
The replacement token for a deprecated one. Stored as a dot-path in Airtable (e.g. `color.terracotta.9`). When a token is deprecated, its successor field tells the migration tooling exactly which token to substitute in every place the deprecated token was used.

---

## APIs

**API (Application Programming Interface)**
A defined contract that lets two systems talk to each other. One system makes a request; the other responds with data or confirms an action. In this repo, Airtable, GitHub, and Figma all expose APIs — scripts call them to sync tokens, open pull requests, or read variable definitions without anyone opening a browser.

**API key / authentication**
A secret credential that proves to an external service that you are allowed to call it. In this repo, the Airtable API key is stored in a `.env` file locally and as a CI secret in GitHub Actions — never committed to the repo. Without it, the sync scripts are rejected by Airtable's servers.

**Endpoint**
A specific URL on an API that performs one action. For example, Airtable has separate endpoints for reading records, creating records, and updating records. `scripts/airtable-sync.js` calls the "upsert records" endpoint; `scripts/airtable-pull.js` calls the "list records" endpoint. An API is the whole contract; an endpoint is one door into it.

**Rate limit**
A cap on how many API calls you can make in a given time window. Exceed it and the service rejects your requests until the window resets. This is one reason CLAUDE.md forbids putting MCP calls inside loops — looping over many records while calling Figma or Airtable on each iteration would hit rate limits quickly. Scripts batch their calls; agents are used only for one-off, human-present tasks.

**REST API**
The style of API used by Airtable and GitHub in this repo. "REST" describes a set of conventions: each endpoint is a URL, requests use standard HTTP methods (`GET` to read, `POST` to create, `PATCH` to update, `DELETE` to remove), and responses come back as JSON. You don't need to know the conventions in detail — just that when CLAUDE.md says "direct REST calls," it means a script talking to one of these APIs without going through an intermediary tool.

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
One of the six defined scenarios in this repo where invoking Claude with external tool access is worth the cost. Each moment is developer-triggered, has a clear input and output, and maps to a slash command. The six are: `/figma-variable-audit`, `/token-deprecation-pass`, `/component-scaffold`, `/layout-generation`, `/figma-variable-push`, and `/add-component`. Everything outside these moments is a script or a GitHub Action — not an agent.

**Context window**
The amount of information an AI can hold and reason over at once — think of it as working memory. It has a hard limit. This is why this repo uses frozen snapshots: instead of streaming raw Figma or Airtable data into an agent mid-task, the relevant information is pre-written to a small file (`STATUS_QUO.md`, `handoff/<Name>.snapshot.json`) that the agent reads. Less data in context means more room for reasoning, and cheaper, faster runs.

**Deterministic gate**
A fixed set of automated checks that must pass before agent-written code is allowed to proceed to human review. In this repo the gate is: `npm run validate:metadata` + `npm run typecheck` + `npm run build`. "Deterministic" means the result is always the same for the same input — no judgment involved, just pass or fail. If the gate fails, the loop bounces back to the scaffold stage rather than pushing broken code forward.

**Frozen snapshot**
A committed file that captures the state of an external system at a point in time, so agents can read it without making a live API call. In this repo: `governance.json` (Airtable state), `token-usage.json` (repo scan), `figma-variables.json` (Figma variables), and `.claude/STATUS_QUO.md` (aggregate of all three). Regenerated manually before a loop run with `npm run sense`. Frozen snapshots keep agents fast, cheap, and immune to rate limits during a task.

**MCP (Model Context Protocol)**
A protocol that connects Claude to external tools — Figma, Airtable, GitHub, Notion — so it can read and write to them during a conversation. MCP tools appear as capabilities Claude can call, like `get_design_context` (Figma) or `list_records` (Airtable). In this repo, MCP is reserved for one-off, developer-present tasks — never for recurring scripts or CI, because MCP calls are interactive and not scriptable.

**Orchestrator**
The main Claude session that coordinates a multi-stage agentic loop. In `/add-component`, the orchestrator runs every stage — sense, scaffold, gate — and spawns exactly one subagent for the adversarial review. It decides when to move forward, when to bounce back, and when to open the PR. Having one orchestrator keeps the loop sequential and predictable.

**Prompt**
The instruction given to an AI to tell it what to do. The slash commands in `.claude/commands/` are prompts — they describe the inputs, the steps, the constraints, and the expected output for each agentic moment. Prompt wording matters: a vague prompt produces vague output; a prompt that names specific files and rules produces consistent, verifiable results.

**Subagent**
A fresh Claude session spawned by the orchestrator for one specific stage that benefits from having no prior context. In `/add-component`, exactly one subagent runs the adversarial code review — it has never seen the scaffold, so it can spot issues the orchestrator might have rationalized away. After it finishes, control returns to the orchestrator. This repo's rule is at most two agents per loop (orchestrator + one subagent) to avoid draining the usage window.

**Tool call**
When an AI invokes a specific capability during a task — reading a file, running a shell command, calling a Figma MCP function, writing to disk. Each tool call is discrete and visible in the session transcript. In this repo's agentic moments, tool calls to external services (Figma MCP, Airtable MCP) are kept to a minimum and always happen with the developer present.
