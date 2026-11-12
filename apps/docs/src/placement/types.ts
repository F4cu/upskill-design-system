import type { ReactElement } from 'react'

// The usage entry a box illustrates: a pattern (Do) or a notFor, composition
// limit or composition don't (Don't), by name or index.
export type PlacementSource = { patterns: string } | { notFor: number } | { limits: number } | { donts: number }

export type PlacementEntry = {
  kind: 'do' | 'dont'
  source: PlacementSource
  // One or two plain sentences, at most 120 characters, read under the verdict.
  caption: string
  // A pattern renders its pattern story when render is omitted.
  render?: () => ReactElement
}
