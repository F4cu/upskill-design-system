import pipelineStatus from '../data/pipeline-status.json'
import type { PipelineNode } from './model'

export interface WorkflowRun {
  conclusion: string
  updatedAt: string
  htmlUrl: string
}

export type NodeStatus =
  | { tone: 'success' | 'failure'; run: WorkflowRun }
  | { tone: 'snapshot' }

const workflows = pipelineStatus.workflows as Record<string, WorkflowRun>

// pipeline-status.json is a frozen, build-time-copied snapshot (see T2 of the
// handoff) — never fetched live. A node with statusSource 'none' gets no
// badge at all; 'snapshot-freshness' nodes are backed by a different
// committed file with no per-node capture timestamp, so they're rendered as
// "known" rather than invented as stale/fresh. Only workflow-backed nodes get
// a success/failure tone, straight from the latest run's conclusion.
export function statusFor(node: PipelineNode): NodeStatus | null {
  if (node.statusSource === 'none') return null
  if (node.statusSource === 'snapshot-freshness') return { tone: 'snapshot' }
  const key = node.statusSource.replace('workflows.', '')
  const run = workflows[key]
  if (!run) return null
  return { tone: run.conclusion === 'success' ? 'success' : 'failure', run }
}

export const capturedAt = pipelineStatus.capturedAt
