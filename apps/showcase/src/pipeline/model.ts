export type PipelineNodeKind =
  | 'source'
  | 'build'
  | 'output'
  | 'consumer'
  | 'gate'
  | 'governance'

export type PipelineStatusSource =
  | 'workflows.tokens-check'
  | 'workflows.components-check'
  | 'workflows.sync-tokens'
  | 'snapshot-freshness'
  | 'none'

export interface PipelineNodeLinks {
  script?: string
  workflow?: string
  adr?: string
  doc?: string
  airtable?: string
}

export interface PipelineNode {
  id: string
  label: string
  kind: PipelineNodeKind
  description: string
  links: PipelineNodeLinks
  statusSource: PipelineStatusSource
  agenticMoments?: number[]
  col: number
  row: number
}

export interface PipelineEdge {
  from: string
  to: string
}

const AIRTABLE_BASE = 'https://airtable.com/appBfY2arkReKQNit'
const AIRTABLE_TABLES = {
  primitives: `${AIRTABLE_BASE}/tblAl09uImcO1VPeb`,
  semantic: `${AIRTABLE_BASE}/tblxMSyL7EFIXltqX`,
  device: `${AIRTABLE_BASE}/tblQvDDo0EZoiYrdf`,
  components: `${AIRTABLE_BASE}/tblT79kVwnCZJdlQE`,
} as const

export const pipelineNodes: PipelineNode[] = [
  {
    id: 'figma-mirror',
    label: 'Figma (mirror)',
    kind: 'source',
    description:
      'Figma is deliberately a downstream mirror, not the token source — the Variables REST API and Code Connect are Enterprise-gated, so the only automatable sync direction on this plan is code to Figma, done interactively via the Figma MCP. A value invented in Figma is a proposal until it lands in primitives.json via PR. Two agentic moments manage the boundary: the variable audit diffs Figma against committed tokens and captures the read into figma-variables.json (a frozen drift-detection snapshot, never an ingestion source), and the variable push writes clean-missing variables into Figma when code moves ahead. Representational divergences Figma cannot store faithfully — unitless line-height ratios held there as fixed px — are labeled as expected, not flagged as drift.',
    links: {
      doc: '.claude/commands/figma-variable-audit.md',
      adr: 'docs/decisions/002-three-layer-token-model.md',
    },
    statusSource: 'snapshot-freshness',
    agenticMoments: [1, 5],
    col: 1,
    row: 2,
  },
  {
    id: 'dtcg-source',
    label: 'DTCG source JSON',
    kind: 'source',
    description:
      'The single source of truth: W3C DTCG token files in packages/tokens/src/, hand-edited via PR and layered in a fixed resolution order — primitives (raw values), per-brand slot mappings (brands/*.json), brand-agnostic semantic themes (theme/light, theme/dark), and responsive device tokens per breakpoint. Every alias uses curly-brace references to the deepest available primitive path, and no $extensions blocks are committed. This node is where two agentic moments do their work: the Figma variable audit reconciles proposed Figma changes into these files, and the token deprecation pass migrates usages of deprecated tokens to their Airtable-declared successors.',
    links: {
      doc: 'docs/01-token-pipeline.md',
      adr: 'docs/decisions/002-three-layer-token-model.md',
      airtable: AIRTABLE_TABLES.primitives,
    },
    statusSource: 'snapshot-freshness',
    agenticMoments: [1, 2],
    col: 2,
    row: 2,
  },
  {
    id: 'sd-build',
    label: 'Style Dictionary build',
    kind: 'build',
    description:
      'npm run tokens:build transforms the DTCG source through custom transforms — px to rem, font-weight names to numerics, the $root rename, and a media-query combiner that folds tablet/mobile device tokens into @media blocks. Each brand builds to its own data-brand-scoped CSS file, and theme files build with outputReferences against the default brand so one theme.light/theme.dark CSS serves every brand as a var() chain. Because that setup intentionally trips Style Dictionary’s filtered-reference warning, two post-build gates compensate: a shape gate (every brand’s token-path set must match the default brand’s) and a no-inlined/no-dangling gate (theme CSS may contain only resolvable var() references, never a leaked default-brand value).',
    links: {
      script: 'packages/tokens/build.js',
      doc: '.claude/commands/tokens-author.md',
      adr: 'docs/decisions/012-brand-layer-multi-brand.md',
    },
    statusSource: 'none',
    col: 3,
    row: 2,
  },
  {
    id: 'dist-outputs',
    label: 'CSS / JS outputs',
    kind: 'output',
    description:
      'The built artifacts in packages/tokens/dist: CSS custom properties (dimensions in rem, desktop device tokens in :root, tablet and mobile in @media blocks, one CSS file per brand and theme mode) plus JS/TS constants. The import order in tokens.css — primitives, default brand, non-default brands, device, theme.light, theme.dark — is load-bearing for cascade correctness at equal specificity, which is how runtime brand and theme switching via data-brand and data-theme attributes works without any JavaScript. The system’s core invariant lives at this boundary: components only ever consume this built output, never the source JSON.',
    links: {
      doc: 'docs/01-token-pipeline.md',
      adr: 'docs/decisions/003-root-token-convention.md',
    },
    statusSource: 'none',
    col: 4,
    row: 2,
  },
  {
    id: 'components',
    label: 'Components (@upskill/components)',
    kind: 'consumer',
    description:
      'A fixed, deliberately small component set — layout primitives, typography, form inputs, Card variants and a handful of page-specific molecules — each shipping index.tsx, a CSS Module referencing only built token custom properties, stories, and a schema-validated metadata.json that agents read to compose correctly. This is the most agent-operated node in the pipeline: components are scaffolded from schema plus Figma context, built through the verified add-component loop (sense, scaffold, deterministic gate, adversarial review), reviewed by a fresh subagent that opens a component/* PR, and mined for learnings that land back in metadata rather than rotting in code. Lifecycle has two axes (ADR-010): maturity is pushed code-to-Airtable, implementation sign-off is human-set in Airtable and pulled back.',
    links: {
      doc: 'docs/02-component-lifecycle.md',
      adr: 'docs/decisions/010-component-lifecycle-two-axes.md',
      airtable: AIRTABLE_TABLES.components,
    },
    statusSource: 'snapshot-freshness',
    agenticMoments: [3, 6, 7, 8],
    col: 5,
    row: 2,
  },
  {
    id: 'consumers',
    label: 'Consumers (Storybook, showcase)',
    kind: 'consumer',
    description:
      'Where the system is actually used: Storybook (living documentation, token showcase MDX stories, light/dark via data-theme and a custom brand toolbar toggling data-brand) and the apps/showcase pages, distributed via the npm workspace protocol rather than a registry publish. Page layouts here follow a fixed grammar mapping Figma structure to HTML landmarks — one main per route, every section accessibly named — enforced deterministically by npm run layout:validate. The layout-generation moment composes pages from only fixed-set components and tokens, citing a metadata rule for every structural choice, and is the sole consumer of the cross-component pattern aggregate (ADR-013 found it helps layouts but regresses scaffolds).',
    links: {
      doc: 'docs/04-layout-grammar.md',
      adr: 'docs/decisions/011-layout-landmark-grammar.md',
    },
    statusSource: 'none',
    agenticMoments: [4],
    col: 6,
    row: 2,
  },
  {
    id: 'tokens-check',
    label: 'CI gate: token build',
    kind: 'gate',
    description:
      'GitHub Actions workflow on every push and PR touching token source or the build script: runs the full Style Dictionary build, the WCAG contrast check, and verifies each expected output file exists — including every brand’s CSS, so a new brand cannot merge half-wired. Like all automation in this system it is a plain script-calling workflow: no MCP, no agent, no judgment — deterministic work stays deterministic, and anything needing judgment is routed to a developer-triggered agentic moment instead.',
    links: {
      workflow: '.github/workflows/tokens-check.yml',
      doc: 'docs/01-token-pipeline.md',
    },
    statusSource: 'workflows.tokens-check',
    col: 3,
    row: 1,
  },
  {
    id: 'contrast-check',
    label: 'Token contrast check',
    kind: 'gate',
    description:
      'npm run tokens:contrast-check computes WCAG relative-luminance ratios against the built theme.light and theme.dark CSS for a hand-curated set of foreground/background pairs reflecting how components actually render — an automated CSS-co-occurrence derivation was tried and rejected as too noisy. It exists because the behavioral a11y tier runs in jsdom, which cannot judge color: this closes the color-contrast gap ADR-008 left open. Known failures live in a shrinking waiver ledger (scripts/token-contrast-waivers.json) with tracked issues, never silently dropped or forced through a token change; ProgressBar’s fill contrast (issue #26) is the current occupant.',
    links: {
      script: 'scripts/token-contrast-check.js',
      workflow: '.github/workflows/tokens-check.yml',
      adr: 'docs/decisions/008-behavioral-a11y-tier.md',
    },
    statusSource: 'workflows.tokens-check',
    col: 4,
    row: 1,
  },
  {
    id: 'components-check',
    label: 'CI gate: components',
    kind: 'gate',
    description:
      'The component quality gate on every push and PR touching packages/components: token build, metadata validation against component.schema.json, typecheck, package build, the a11y coverage gate (every interactive component, derived from its metadata, must ship a behavioral a11y test — Vitest, Testing Library and vitest-axe asserting the dynamic ARIA contract), the behavioral tests themselves, and an ADR-013 staleness check that regenerates the cross-component pattern schema and diffs it against the committed copy. Agent-generated component code must clear this gate and an adversarial review before a human-reviewed PR can land it on main.',
    links: {
      workflow: '.github/workflows/components-check.yml',
      doc: 'docs/03-accessibility.md',
      adr: 'docs/decisions/008-behavioral-a11y-tier.md',
    },
    statusSource: 'workflows.components-check',
    col: 5,
    row: 1,
  },
  {
    id: 'airtable-sync',
    label: 'Airtable sync (code → Airtable)',
    kind: 'governance',
    description:
      'On every merge to main touching token source or component metadata, scripts/airtable-sync.js upserts primitives, semantic and device tokens into three Airtable tables and pushes component metadata (including the sense-derived pipeline stage) into a fourth — one-directional, direct REST, no MCP anywhere near CI. Airtable is the governance layer: humans annotate tokens there with status, owner, successor and notes. A "don’t downgrade done" guard ensures a pushed pipeline stage never overwrites a human’s Implementation sign-off, which is why the two lifecycle axes live in separate columns.',
    links: {
      script: 'scripts/airtable-sync.js',
      workflow: '.github/workflows/sync-tokens.yml',
      doc: 'docs/05-governance.md',
      airtable: AIRTABLE_TABLES.primitives,
    },
    statusSource: 'workflows.sync-tokens',
    col: 4,
    row: 3,
  },
  {
    id: 'governance-pull',
    label: 'Governance pull (Airtable → code)',
    kind: 'governance',
    description:
      'The return leg of the governance round-trip: scripts/airtable-pull.js fetches each token’s human-set status, owner, successor dot-path and notes into airtable-governance.json, and each component’s Implementation sign-off into component-signoff.json. These committed snapshots are the frozen-memory pattern this whole system runs on — agentic moments read the status quo from committed files, never live APIs, which keeps agent context small and shields runs from rate limits. The token deprecation pass, for instance, reads only this file plus the token-usage scan to build its migration PR. Run manually before deprecation or sign-off work until Phase 6 automates it.',
    links: {
      script: 'scripts/airtable-pull.js',
      doc: 'docs/05-governance.md',
      adr: 'docs/decisions/010-component-lifecycle-two-axes.md',
      airtable: AIRTABLE_TABLES.primitives,
    },
    statusSource: 'snapshot-freshness',
    col: 2,
    row: 3,
  },
]

export const pipelineEdges: PipelineEdge[] = [
  { from: 'figma-mirror', to: 'dtcg-source' },
  { from: 'dtcg-source', to: 'sd-build' },
  { from: 'sd-build', to: 'dist-outputs' },
  { from: 'dist-outputs', to: 'components' },
  { from: 'components', to: 'consumers' },
  { from: 'dtcg-source', to: 'tokens-check' },
  { from: 'tokens-check', to: 'contrast-check' },
  { from: 'components', to: 'components-check' },
  { from: 'dtcg-source', to: 'airtable-sync' },
  { from: 'components', to: 'airtable-sync' },
  { from: 'airtable-sync', to: 'governance-pull' },
  { from: 'governance-pull', to: 'dtcg-source' },
]
