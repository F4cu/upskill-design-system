import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Box } from '../components/Box'
import { Stack } from '../components/Stack'
import { Heading } from '../components/Heading'
import { Button } from '../components/Button'
import { Text } from '../components/Text'
import { Accordion, AccordionItem } from '../components/Accordion'

const ALL_MODULES = [
  {
    title: 'The Anthropologist',
    subtitle: '4 hours, 30min',
    body: 'Explore how anthropologists study human behaviour and culture. This module covers ethnographic methods, field research, and cultural analysis.',
  },
  {
    title: 'Design Thinking Foundations',
    subtitle: '2 hours, 15min',
    body: 'An introduction to design thinking as a human-centred problem-solving approach. Learn the five stages: empathise, define, ideate, prototype, and test.',
  },
  {
    title: 'Prototyping & Testing',
    subtitle: '3 hours, 45min',
    body: 'Hands-on techniques for rapid prototyping and user testing. Covers wireframing, usability testing scripts, and iterating based on feedback.',
  },
  {
    title: 'Visual Communication',
    subtitle: '2 hours, 0min',
    body: 'Principles of layout, colour, and typography applied to product design. Learn how to communicate hierarchy and guide attention without words.',
  },
  {
    title: 'Systems Thinking',
    subtitle: '3 hours, 15min',
    body: 'Understanding products as interconnected systems. Covers feedback loops, unintended consequences, and designing for emergent behaviour.',
  },
]

const DEFAULT_VISIBLE = 3

function CourseModuleListPage() {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? ALL_MODULES : ALL_MODULES.slice(0, DEFAULT_VISIBLE)

  return (
    <Box
      padding="xl"
      style={{
        background: 'var(--ds-color-background-container-page)',
        minHeight: '100vh',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <Stack gap="lg">
        <Heading as="h2" size="headline">Course Modules</Heading>
        <div>
          <Accordion>
            {visible.map((module) => (
              <AccordionItem key={module.title} title={module.title} subtitle={module.subtitle}>
                <Text>{module.body}</Text>
              </AccordionItem>
            ))}
          </Accordion>
          {ALL_MODULES.length > DEFAULT_VISIBLE && (
            <Button
              variant="ghost"
              size="sm"
              trailingIcon={showAll ? 'chevron-up' : 'chevron-down'}
              onClick={() => setShowAll((prev) => !prev)}
              style={{ marginLeft: 'var(--ds-space-inset-md)' }}
            >
              {showAll ? 'Show less' : `Show ${ALL_MODULES.length - DEFAULT_VISIBLE} more`}
            </Button>
          )}
        </div>
      </Stack>
    </Box>
  )
}

const meta = {
  title: 'Layout/Examples/CourseModuleList',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Accordion list with progressive disclosure: 3 items visible by default, a ghost Button reveals the remaining items. The button label and icon update to reflect state. Wire the visible count to real data in production.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = { render: () => <CourseModuleListPage />, tags: ['!dev'] }
