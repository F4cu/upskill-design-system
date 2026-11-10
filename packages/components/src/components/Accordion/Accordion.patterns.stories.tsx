import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Accordion, AccordionItem } from './index'
import { Button } from '../Button'
import { Stack } from '../Stack'
import { Text } from '../Text'

const MODULES = [
  { title: 'The Anthropologist', subtitle: '4 hours, 30min', body: 'How anthropologists study human behaviour and culture: ethnographic methods, field research and cultural analysis.' },
  { title: 'Design Thinking Foundations', subtitle: '2 hours, 15min', body: 'Design thinking as a human-centred approach to problems, through its five stages.' },
  { title: 'Prototyping & Testing', subtitle: '3 hours, 45min', body: 'Rapid prototyping and user testing: wireframes, test scripts and iterating on feedback.' },
  { title: 'Visual Communication', subtitle: '2 hours, 0min', body: 'Layout, colour and typography applied to product design.' },
  { title: 'Systems Thinking', subtitle: '3 hours, 15min', body: 'Products as interconnected systems: feedback loops and unintended consequences.' },
]

const VISIBLE = 3

const meta: Meta<typeof Accordion> = {
  title: 'Components/Accordion/Patterns',
  component: Accordion,
}

export default meta
type Story = StoryObj<typeof Accordion>

function CourseModules() {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? MODULES : MODULES.slice(0, VISIBLE)
  return (
    <Stack gap="md">
      <Accordion>
        {visible.map((m) => (
          <AccordionItem key={m.title} title={m.title} subtitle={m.subtitle}>
            <Text>{m.body}</Text>
          </AccordionItem>
        ))}
      </Accordion>
      <Button
        variant="transparent"
        size="sm"
        trailingIcon={showAll ? 'chevron-up' : 'chevron-down'}
        onClick={() => setShowAll((prev) => !prev)}
      >
        {showAll ? 'Show less' : `Show ${MODULES.length - VISIBLE} more`}
      </Button>
    </Stack>
  )
}

export const CourseModuleList: Story = {
  render: () => <CourseModules />,
}
