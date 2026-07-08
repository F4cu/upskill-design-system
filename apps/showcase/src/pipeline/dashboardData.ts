import componentPipeline from '../data/component-pipeline.json'
import airtableGovernance from '../data/airtable-governance.json'
import tokenUsage from '../data/token-usage.json'
import figmaVariables from '../data/figma-variables.json'
import pipelineStatus from '../data/pipeline-status.json'
import type { SplitDatum } from './SplitChart'
import { AIRTABLE_TABLES } from './airtable'

export { AIRTABLE_TABLES }

// ── Component lifecycle ─────────────────────────────────────────────────────

export interface ComponentRow {
  name: string
  type: string
  maturity: string
  implementation: string
}

const MATURITY_ORDER: { label: string; tone: SplitDatum['tone'] }[] = [
  { label: 'ready', tone: 'success' },
  { label: 'beta', tone: 'warning' },
  { label: 'deprecated', tone: 'danger' },
]

const IMPLEMENTATION_ORDER: { label: string; tone: SplitDatum['tone'] }[] = [
  { label: 'done', tone: 'success' },
  { label: 'in review', tone: 'warning' },
  { label: 'in progress', tone: 'brand' },
  { label: 'established', tone: 'neutral' },
  { label: 'todo', tone: 'neutralFaint' },
]

export function getComponentRows(): ComponentRow[] {
  return componentPipeline.components
}

export function getMaturitySplit(): SplitDatum[] {
  const counts = new Map<string, number>()
  for (const c of componentPipeline.components) {
    counts.set(c.maturity, (counts.get(c.maturity) ?? 0) + 1)
  }
  return MATURITY_ORDER.map(({ label, tone }) => ({ label, value: counts.get(label) ?? 0, tone }))
}

export function getImplementationSplit(): SplitDatum[] {
  const counts = new Map<string, number>()
  for (const c of componentPipeline.components) {
    counts.set(c.implementation, (counts.get(c.implementation) ?? 0) + 1)
  }
  return IMPLEMENTATION_ORDER.map(({ label, tone }) => ({ label, value: counts.get(label) ?? 0, tone }))
}

export const lifecycleGeneratedAt = componentPipeline.generatedAt

// ── Token governance ─────────────────────────────────────────────────────────

type GovernanceLayer = 'primitives' | 'semantic'

const GOVERNANCE_BAR_ORDER: { key: 'deprecatedInUse' | 'deprecatedUnused' | 'active'; label: string; tone: SplitDatum['tone'] }[] = [
  { key: 'deprecatedInUse', label: 'deprecated in use', tone: 'danger' },
  { key: 'deprecatedUnused', label: 'deprecated (unused)', tone: 'warning' },
  { key: 'active', label: 'active', tone: 'success' },
]

function cssVarFor(path: string) {
  return '--ds-' + path.replace(/\./g, '-')
}

function isInUse(path: string): boolean {
  const usage = tokenUsage as { css: Record<string, string[]>; aliases: Record<string, string[]> }
  const cssRefs = usage.css[cssVarFor(path)]?.length ?? 0
  const aliasRefs = usage.aliases[path]?.length ?? 0
  return cssRefs > 0 || aliasRefs > 0
}

export interface GovernanceLayerCounts {
  layer: GovernanceLayer
  active: number
  deprecatedUnused: number
  deprecatedInUse: number
}

export function getGovernanceCounts(): GovernanceLayerCounts[] {
  const governance = airtableGovernance as unknown as Record<string, Record<string, { status: string }>>
  const layers: GovernanceLayer[] = ['primitives', 'semantic']
  return layers.map((layer) => {
    let active = 0
    let deprecatedUnused = 0
    let deprecatedInUse = 0
    for (const [path, entry] of Object.entries(governance[layer] ?? {})) {
      if (path.startsWith('$')) continue
      if (entry.status === 'active') {
        active++
      } else if (entry.status === 'deprecated') {
        if (isInUse(path)) deprecatedInUse++
        else deprecatedUnused++
      }
    }
    return { layer, active, deprecatedUnused, deprecatedInUse }
  })
}

export function getGovernanceSplit(counts: GovernanceLayerCounts): SplitDatum[] {
  return GOVERNANCE_BAR_ORDER.map(({ key, label, tone }) => ({ label, value: counts[key], tone }))
}

export function getDeprecatedInUseBacklog(): number {
  return getGovernanceCounts().reduce((sum, c) => sum + c.deprecatedInUse, 0)
}

// ── Figma drift ──────────────────────────────────────────────────────────────

const DRIFT_ORDER: { key: 'realDrift' | 'expected' | 'inSync'; label: string; tone: SplitDatum['tone'] }[] = [
  { key: 'realDrift', label: 'real drift', tone: 'danger' },
  { key: 'expected', label: 'expected divergence', tone: 'neutral' },
  { key: 'inSync', label: 'in sync', tone: 'success' },
]

export function getDriftSplit(): SplitDatum[] {
  const f = figmaVariables as {
    representationalDivergences: { variables: string[] }
    figmaExtrasAwaitingDecision: { variables: string[] }
    collections: Record<string, { variables: Record<string, unknown> }>
  }
  const extras = new Set(f.figmaExtrasAwaitingDecision.variables)
  const repDiv = new Set(f.representationalDivergences.variables.filter((v) => !extras.has(v)))

  const counts = { realDrift: 0, expected: 0, inSync: 0 }
  for (const col of Object.values(f.collections)) {
    for (const name of Object.keys(col.variables)) {
      if (extras.has(name)) counts.realDrift++
      else if (repDiv.has(name)) counts.expected++
      else counts.inSync++
    }
  }

  return DRIFT_ORDER.map(({ key, label, tone }) => ({ label, value: counts[key], tone }))
}

export const driftCapturedAt = (figmaVariables as { capturedAt: string }).capturedAt

// ── Open issues ──────────────────────────────────────────────────────────────

export interface PipelineIssue {
  number: number
  title: string
  labels: string[]
  htmlUrl: string
}

export function getOpenIssues(): PipelineIssue[] {
  return pipelineStatus.issues
}
