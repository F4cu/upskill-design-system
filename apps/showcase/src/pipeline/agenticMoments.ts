// Index of the eight agentic moments defined in CLAUDE.md's "Agentic moments"
// table, keyed by moment number. Used by the Level-2 overlay in PipelineDag to
// render a chip per moment that touches a node, linking to the moment's
// command definition.

export interface AgenticMoment {
  label: string
  command: string
}

export const AGENTIC_MOMENTS: Record<number, AgenticMoment> = {
  1: { label: 'Figma variable audit', command: 'figma-variable-audit' },
  2: { label: 'Token deprecation pass', command: 'token-deprecation-pass' },
  3: { label: 'Component scaffold', command: 'component-scaffold' },
  4: { label: 'Layout generation', command: 'layout-generation' },
  5: { label: 'Figma variable push', command: 'figma-variable-push' },
  6: { label: 'Add component', command: 'add-component' },
  7: { label: 'Review component', command: 'review-component' },
  8: { label: 'Extract learnings', command: 'extract-learnings' },
}

export const GITHUB_REPO_BLOB = 'https://github.com/F4cu/upskill-design-system/blob/main'

export function githubUrl(relPath: string) {
  return `${GITHUB_REPO_BLOB}/${relPath}`
}
