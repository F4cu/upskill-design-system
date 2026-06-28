import { Box, Heading, Text } from '@upskill/components'

// Stub — replace with /layout-generation output
export default function Dashboard() {
  return (
    <Box as="main">
      <Box as="section" aria-label="Dashboard" paddingY="xl">
        <Box className="container">
          <Heading level={1}>Dashboard</Heading>
          <Text>Generated layout will go here.</Text>
        </Box>
      </Box>
    </Box>
  )
}
