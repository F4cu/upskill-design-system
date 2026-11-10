import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Chip } from './index'
import { Heading } from '../Heading'
import { Inline } from '../Inline'
import { Stack } from '../Stack'

const TOPICS = ['Design', 'Development', 'Business', 'Marketing']

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip/Patterns',
  component: Chip,
}

export default meta
type Story = StoryObj<typeof Chip>

function Filters() {
  const [active, setActive] = useState<string[]>(['Design', 'Development'])
  const toggle = (topic: string, pressed: boolean) =>
    setActive((prev) => (pressed ? [...prev, topic] : prev.filter((t) => t !== topic)))
  return (
    <Stack gap="sm">
      <Heading id="filter-bar-heading" as="h2" size="title-small">Topics</Heading>
      <Inline gap="sm" wrap role="group" aria-labelledby="filter-bar-heading">
        {TOPICS.map((topic) => (
          <Chip key={topic} pressed={active.includes(topic)} onPressedChange={(p) => toggle(topic, p)}>
            {topic}
          </Chip>
        ))}
      </Inline>
    </Stack>
  )
}

export const FilterBar: Story = {
  render: () => <Filters />,
}
