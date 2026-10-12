// The harness-ablation and pattern-accuracy evals measured the pre-ADR-027
// architecture (metadata carried states, tokens and accessibility). Their tasks,
// prompts and scorers still assume it, so a run on a later HEAD would not be
// comparable with the committed results. They stay as the evidence for
// ADR-013, ADR-027 and ADR-029; re-run them from a worktree at FROZEN_AT.
import { spawnSync } from 'child_process'

export const FROZEN_AT = '044d28f'
const SPEC_REQUIRED = '31a7bd0'

export const FROZEN_BANNER = `> **Historical.** Measured against the pre-ADR-027 schema; the eval is frozen at \`${FROZEN_AT}\` (ADR-029 amendment 2026-10-12). Results are not comparable with a run on the current architecture.`

export function exitIfFrozen(name) {
  const res = spawnSync('git', ['merge-base', '--is-ancestor', SPEC_REQUIRED, 'HEAD'])
  if (res.status !== 0) return
  console.error(`${name} is a frozen eval: its tasks and scorer assume metadata with states, tokens and accessibility, which ADR-027 moved to the spec.`)
  console.error(`Re-run it from the commit it was measured on:`)
  console.error(`  git worktree add ../upskill-frozen-eval ${FROZEN_AT}`)
  process.exit(1)
}
