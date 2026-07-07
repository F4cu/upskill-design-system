import { useEffect } from 'react'
import { Badge, Box, Button, Card, Heading, Stack, Text } from '@upskill/components'
import { AGENTIC_MOMENTS, githubUrl } from './agenticMoments'
import type { PipelineNode, PipelineNodeLinks } from './model'
import type { NodeStatus } from './status'
import styles from './PipelineDag.module.css'

const LINK_LABELS: Record<keyof PipelineNodeLinks, string> = {
  script: 'Script',
  workflow: 'Workflow definition',
  adr: 'Architectural decision',
  doc: 'Documentation',
  airtable: 'Airtable table',
}

function resolveHref(key: keyof PipelineNodeLinks, value: string) {
  return key === 'airtable' ? value : githubUrl(value)
}

interface PipelineDetailPanelProps {
  node: PipelineNode
  status: NodeStatus | null
  panelId: string
  onClose: () => void
}

export function PipelineDetailPanel({ node, status, panelId, onClose }: PipelineDetailPanelProps) {
  const linkEntries = Object.entries(node.links) as [keyof PipelineNodeLinks, string][]

  useEffect(() => {
    // Button doesn't forward a ref, so focus the panel's first focusable
    // descendant (the Close button) by querying the DOM after mount.
    const panel = document.getElementById(panelId)
    panel?.querySelector<HTMLElement>('button, a')?.focus()
  }, [panelId])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <Box as="aside" id={panelId} aria-label={`${node.label} details`} className={styles.panel}>
      <Card variant="elevated" padding="lg">
        <Stack gap="md">
          <Stack gap="xs" align="start">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Heading as="h3" size="title-small">
              {node.label}
            </Heading>
          </Stack>

          <Text size="body-small" color="subtle">
            {node.description}
          </Text>

          {status && (
            <Stack gap="xs">
              <Text size="label">Last known status</Text>
              {status.tone === 'snapshot' ? (
                <Badge label="Backed by a committed snapshot" variant="outline" />
              ) : (
                <Stack gap="xs">
                  <Badge
                    label={status.tone === 'success' ? 'Passing' : 'Failing'}
                    variant="filled"
                  />
                  <Text size="metadata" color="subtle">
                    Updated {new Date(status.run.updatedAt).toLocaleString()}
                  </Text>
                  {/* Gate nodes: honest replacement for a "Retry" button — there is
                      no runner to retry against, only the audited GitHub Actions run. */}
                  <a
                    href={status.run.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.panelLink}
                  >
                    View run on GitHub
                  </a>
                </Stack>
              )}
            </Stack>
          )}

          {linkEntries.length > 0 && (
            <Stack gap="xs">
              <Text size="label">Links</Text>
              <Stack gap="xs" as="ul">
                {linkEntries.map(([key, value]) => (
                  <li key={key}>
                    <a
                      href={resolveHref(key, value)}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.panelLink}
                    >
                      {LINK_LABELS[key]}
                    </a>
                  </li>
                ))}
              </Stack>
            </Stack>
          )}

          {node.agenticMoments && node.agenticMoments.length > 0 && (
            <Stack gap="xs">
              <Text size="label">Agentic moments</Text>
              <Stack gap="xs" as="ul">
                {node.agenticMoments.map((m) => (
                  <li key={m}>
                    <a
                      href={githubUrl(`.claude/commands/${AGENTIC_MOMENTS[m].command}.md`)}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.panelLink}
                    >
                      {m}. {AGENTIC_MOMENTS[m].label}
                    </a>
                  </li>
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Card>
    </Box>
  )
}
