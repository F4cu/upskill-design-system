import { Box, Heading, Text } from '@upskill/components'

// Stub — replace with /layout-generation output for the Course Overview page
// Figma reference: node 96:5854 (Desktop)
export default function CourseOverview() {
  return (
    <Box as="main">
      <Box as="section" aria-label="Course overview" paddingY="xl">
        <Box className="container">
          <Heading level={1}>Course Overview</Heading>
          <Text>Generated layout will go here.</Text>
        </Box>
      </Box>
    </Box>
  )
}
