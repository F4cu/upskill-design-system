import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Accordion } from './index'
import { Box } from '../Box'
import { Stack } from '../Stack'
import { Text } from '../Text'

const DESCRIPTION =
  'The Experimenter is a curious, hands-on innovator who learns by testing and prototyping. They take calculated risks, embrace failure as learning, and drive innovation through rapid iteration and experimentation.'

const MODULES = [
  'The Anthropologist',
  'The Experimenter',
  'The Cross-Pollinator',
  'The Hurdler',
  'The Collaborator',
  'The Director',
]

const meta: Meta<typeof Accordion> = {
  title: 'Components/Accordion',
  component: Accordion,
  argTypes: {
    headingLevel: { control: 'select', options: [2, 3, 4, 5, 6] },
  },
  decorators: [
    (Story) => (
      <Box maxWidth={500}>
        <Story />
      </Box>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Accordion>

export const Default: Story = {
  args: {
    headingLevel: 3,
    items: MODULES.map((title, index) => ({
      title,
      subtitle: '4 hours, 30min',
      content: DESCRIPTION,
      defaultOpen: index === 1,
    })),
  },
}

export const AllCollapsed: Story = {
  args: {
    items: MODULES.map(title => ({ title, subtitle: '4 hours, 30min', content: DESCRIPTION })),
  },
}

export const MultipleOpen: Story = {
  args: {
    items: MODULES.slice(0, 4).map((title, index) => ({
      title,
      subtitle: '4 hours, 30min',
      content: DESCRIPTION,
      defaultOpen: index < 2,
    })),
  },
}

export const WithoutSubtitle: Story = {
  args: {
    items: [
      { title: 'Can I learn at my own pace?', content: 'Yes. Every course is self-paced and stays available after you finish.' },
      { title: 'Do I get a certificate?', content: 'Certified courses award a certificate once you complete every module.' },
      { title: 'Can I cancel my subscription?', content: 'You can cancel any time from your account settings.' },
    ],
  },
}

export const RichContent: Story = {
  args: {
    items: [
      {
        title: 'The Experimenter',
        subtitle: '4 hours, 30min',
        defaultOpen: true,
        content: (
          <Stack gap="xs">
            <Text>{DESCRIPTION}</Text>
            <Text size="body-small" color="subtle">5 lessons · 1 project</Text>
          </Stack>
        ),
      },
      { title: 'The Hurdler', subtitle: '4 hours, 30min', content: DESCRIPTION },
    ],
  },
}

export const Controlled: Story = {
  render: function ControlledAccordion(args) {
    const [openTitles, setOpenTitles] = useState<string[]>(['The Experimenter'])
    return (
      <Stack gap="md">
        <Text size="body-small" color="subtle">
          Open: {openTitles.length ? openTitles.join(', ') : 'none'}
        </Text>
        <Accordion
          {...args}
          items={MODULES.slice(0, 3).map(title => ({
            title,
            subtitle: '4 hours, 30min',
            content: DESCRIPTION,
            open: openTitles.includes(title),
            onOpenChange: open =>
              setOpenTitles(current => (open ? [...current, title] : current.filter(t => t !== title))),
          }))}
        />
      </Stack>
    )
  },
}
