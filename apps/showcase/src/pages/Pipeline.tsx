import { Box, Heading } from '@upskill/components'
import { PipelineDag } from '../pipeline/PipelineDag'

// Standalone pipeline DAG route — /pipeline. Just the DAG, nothing else
// (T4 of .claude/handoff/pipeline-dashboard.handoff.md); the same PipelineDag
// component is reused as the hero at the top of /dashboard.
export default function Pipeline() {
  return (
    <Box as="main">
      <Box as="section" aria-labelledby="pipeline-page-heading" paddingY="lg">
        <Box className="container">
          <Heading id="pipeline-page-heading" as="h1" size="display">
            Pipeline
          </Heading>
        </Box>
      </Box>
      <PipelineDag />
    </Box>
  )
}
