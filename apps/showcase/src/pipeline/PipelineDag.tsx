import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Badge, Box, Button, Heading, Inline, Stack, Text } from '@upskill/components'
import { AGENTIC_MOMENTS, githubUrl } from './agenticMoments'
import { pipelineEdges, pipelineNodes } from './model'
import { capturedAt, statusFor } from './status'
import { PipelineDetailPanel } from './PipelineDetailPanel'
import styles from './PipelineDag.module.css'

const PANEL_ID = 'pipeline-detail-panel'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface Point {
  x: number
  y: number
}

// Returns the point on `from`'s border where a straight line toward `towards`
// crosses it, so edges visually terminate at a node's edge rather than
// passing through its center.
function anchorPoint(from: Rect, towards: Point): Point {
  const cx = from.x + from.width / 2
  const cy = from.y + from.height / 2
  const dx = towards.x - cx
  const dy = towards.y - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const halfW = from.width / 2
  const halfH = from.height / 2
  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity
  const scale = Math.min(scaleX, scaleY)
  return { x: cx + dx * scale, y: cy + dy * scale }
}

export function PipelineDag() {
  const [showAgentic, setShowAgentic] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>())
  const [rects, setRects] = useState<Record<string, Rect>>({})

  const measure = () => {
    const container = containerRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const next: Record<string, Rect> = {}
    nodeRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect()
      next[id] = {
        x: r.left - containerRect.left,
        y: r.top - containerRect.top,
        width: r.width,
        height: r.height,
      }
    })
    setRects(next)
  }

  // Re-measure whenever the agentic overlay toggles (node sizes change) and
  // on mount. ResizeObserver keeps edges correct across viewport width and
  // font-size changes without hand-written @media breakpoints in this file.
  useLayoutEffect(() => {
    measure()
  }, [showAgentic])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(container)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const selectedNode = useMemo(
    () => pipelineNodes.find((n) => n.id === selectedId) ?? null,
    [selectedId]
  )

  return (
    <Box as="section" aria-labelledby="pipeline-dag-heading" paddingY="lg">
      <Box className="container">
        <Stack gap="md">
          <Inline justify="space-between" align="center" wrap gap="sm">
            <Stack gap="xs">
              <Heading id="pipeline-dag-heading" as="h2" size="headline">
                Token pipeline
              </Heading>
              <Text size="metadata" color="subtle">
                Statuses as of {new Date(capturedAt).toLocaleString()}
              </Text>
            </Stack>
            <Button
              variant="outlined"
              size="sm"
              aria-pressed={showAgentic}
              onClick={() => setShowAgentic((v) => !v)}
            >
              {showAgentic ? 'Hide AI in the pipeline' : 'Show AI in the pipeline'}
            </Button>
          </Inline>

          <Inline align="start" gap="lg" wrap={false} style={{ alignItems: 'flex-start' }}>
            <div ref={containerRef} className={styles.diagram}>
              <svg className={styles.edges} aria-hidden="true" focusable="false">
                <defs>
                  <marker
                    id="pipeline-arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M0,0 L8,4 L0,8 Z" className={styles.arrowhead} />
                  </marker>
                </defs>
                {pipelineEdges.map((edge) => {
                  const from = rects[edge.from]
                  const to = rects[edge.to]
                  if (!from || !to) return null
                  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
                  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
                  const p1 = anchorPoint(from, toCenter)
                  const p2 = anchorPoint(to, fromCenter)
                  return (
                    <line
                      key={`${edge.from}->${edge.to}`}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      className={styles.edge}
                      markerEnd="url(#pipeline-arrow)"
                    />
                  )
                })}
              </svg>

              {pipelineNodes.map((node) => {
                const status = statusFor(node)
                const moments = showAgentic ? node.agenticMoments : undefined
                const isSelected = selectedId === node.id
                return (
                  <button
                    key={node.id}
                    type="button"
                    ref={(el) => {
                      if (el) nodeRefs.current.set(node.id, el)
                      else nodeRefs.current.delete(node.id)
                    }}
                    className={[styles.node, styles[`kind-${node.kind}`], isSelected && styles.selected]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ gridColumn: node.col, gridRow: node.row }}
                    onClick={() => setSelectedId(isSelected ? null : node.id)}
                    aria-haspopup="true"
                    aria-controls={PANEL_ID}
                    aria-expanded={isSelected}
                  >
                    <Stack gap="xs" align="start">
                      <Text as="span" size="label" className={styles.nodeLabel}>
                        {node.label}
                      </Text>
                      {status && (
                        <span className={styles.statusRow}>
                          <span className={[styles.statusDot, styles[status.tone]].join(' ')} aria-hidden="true" />
                          <Badge
                            label={
                              status.tone === 'success'
                                ? 'Passing'
                                : status.tone === 'failure'
                                  ? 'Failing'
                                  : 'Snapshot'
                            }
                            variant={status.tone === 'snapshot' ? 'outline' : 'filled'}
                          />
                        </span>
                      )}
                      {moments && moments.length > 0 && (
                        <Inline gap="xs" wrap className={styles.chipRow}>
                          {moments.map((m) => (
                            <a
                              key={m}
                              href={githubUrl(`.claude/commands/${AGENTIC_MOMENTS[m].command}.md`)}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.chip}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {m}. {AGENTIC_MOMENTS[m].label}
                            </a>
                          ))}
                        </Inline>
                      )}
                    </Stack>
                  </button>
                )
              })}
            </div>

            {selectedNode && (
              <PipelineDetailPanel
                node={selectedNode}
                status={statusFor(selectedNode)}
                panelId={PANEL_ID}
                onClose={() => setSelectedId(null)}
              />
            )}
          </Inline>
        </Stack>
      </Box>
    </Box>
  )
}
