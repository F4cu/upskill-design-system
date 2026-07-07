import { Box, Stack, Inline, Card, Text, Heading, Badge } from '@upskill/components'
import { PipelineDag } from '../pipeline/PipelineDag'
import { SplitChart } from '../pipeline/SplitChart'
import {
  AIRTABLE_TABLES,
  getComponentRows,
  getMaturitySplit,
  getImplementationSplit,
  lifecycleGeneratedAt,
  getGovernanceCounts,
  getGovernanceSplit,
  getDeprecatedInUseBacklog,
  getDriftSplit,
  driftCapturedAt,
  getOpenIssues,
} from '../pipeline/dashboardData'

// Pipeline Health Dashboard — /dashboard (Phase 11).
// Hero: the pipeline DAG (T4), full-width, first thing in <main>, above the
// fold. Everything below is T5: component lifecycle / token governance /
// Figma drift / open issues, each reading only committed frozen snapshots
// (see .claude/handoff/pipeline-dashboard.handoff.md and
// .claude/handoff/pipeline-dashboard-chart-spec.md).
export default function Dashboard() {
  const componentRows = getComponentRows()
  const maturitySplit = getMaturitySplit()
  const implementationSplit = getImplementationSplit()
  const governanceCounts = getGovernanceCounts()
  const deprecatedInUseBacklog = getDeprecatedInUseBacklog()
  const driftSplit = getDriftSplit()
  const issues = getOpenIssues()

  return (
    <Box as="main">
      <PipelineDag />

      <Box as="section" aria-labelledby="lifecycle-heading" paddingY="xl">
        <Box className="container">
          <Stack gap="lg">
            <Heading as="h2" id="lifecycle-heading">Component lifecycle</Heading>
            <Text color="subtle">As of {lifecycleGeneratedAt}</Text>
            <Inline gap="xl" wrap>
              <Card padding="lg">
                <SplitChart data={maturitySplit} title="Maturity" variant="donut" centerLabel="components" />
              </Card>
              <Card padding="lg">
                <SplitChart data={implementationSplit} title="Implementation" variant="bar" />
              </Card>
            </Inline>
            <table>
              <thead>
                <tr>
                  <th scope="col"><Text as="span" size="label">Component</Text></th>
                  <th scope="col"><Text as="span" size="label">Type</Text></th>
                  <th scope="col"><Text as="span" size="label">Maturity</Text></th>
                  <th scope="col"><Text as="span" size="label">Implementation</Text></th>
                </tr>
              </thead>
              <tbody>
                {componentRows.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <a href={AIRTABLE_TABLES.components} target="_blank" rel="noreferrer">
                        <Text as="span" color="brand">{row.name}</Text>
                      </a>
                    </td>
                    <td><Text as="span" color="subtle">{row.type}</Text></td>
                    <td><Badge label={row.maturity} /></td>
                    <td><Badge label={row.implementation} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Stack>
        </Box>
      </Box>

      <Box as="section" aria-labelledby="governance-heading" paddingY="xl">
        <Box className="container">
          <Stack gap="lg">
            <Heading as="h2" id="governance-heading">Token governance</Heading>
            <Stack gap="xs">
              <Heading as="h3" size="title-small">{deprecatedInUseBacklog} deprecated tokens in use</Heading>
              <Text color="subtle">
                The backlog that blocks a token deprecation pass — governed tokens only, summed across layers.
              </Text>
            </Stack>
            <Stack gap="md">
              {governanceCounts.map((counts) => (
                <Card key={counts.layer} padding="lg">
                  <Stack gap="sm">
                    <a href={AIRTABLE_TABLES[counts.layer]} target="_blank" rel="noreferrer">
                      <Heading as="h3" size="title-small">
                        {counts.layer === 'primitives' ? 'Primitives' : 'Semantic'}
                      </Heading>
                    </a>
                    <SplitChart
                      data={getGovernanceSplit(counts)}
                      title={`${counts.layer === 'primitives' ? 'Primitives' : 'Semantic'} tokens`}
                      variant="bar"
                    />
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box as="section" aria-labelledby="drift-heading" paddingY="xl">
        <Box className="container">
          <Stack gap="lg">
            <Heading as="h2" id="drift-heading">Figma drift</Heading>
            <Text color="subtle">As of {driftCapturedAt}</Text>
            <Card padding="lg">
              <SplitChart data={driftSplit} title="Figma variables" variant="bar" />
            </Card>
          </Stack>
        </Box>
      </Box>

      <Box as="section" aria-labelledby="issues-heading" paddingY="xl">
        <Box className="container">
          <Stack gap="lg">
            <Heading as="h2" id="issues-heading">Open issues</Heading>
            {issues.length === 0 ? (
              <Text color="subtle">No open issues in the snapshot.</Text>
            ) : (
              <ul>
                {issues.map((issue) => (
                  <li key={issue.number}>
                    <Inline gap="sm" align="center">
                      <a href={issue.htmlUrl} target="_blank" rel="noreferrer">
                        <Text as="span" color="brand">#{issue.number} {issue.title}</Text>
                      </a>
                      {issue.labels.map((label) => (
                        <Badge key={label} label={label} />
                      ))}
                    </Inline>
                  </li>
                ))}
              </ul>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}
