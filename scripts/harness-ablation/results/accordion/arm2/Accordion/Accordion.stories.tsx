import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Accordion } from './index'
import { Box } from '../Box'
import { Text } from '../Text'

const MODULES = [
  {
    title: 'The Anthropologist',
    description:
      'The Anthropologist observes people in their natural setting to uncover needs they cannot articulate, turning field notes into insight.',
  },
  {
    title: 'The Experimenter',
    description:
      'The Experimenter is a curious, hands-on innovator who learns by testing and prototyping. They take calculated risks, embrace failure as learning, and drive innovation through rapid iteration and experimentation.',
  },
  {
    title: 'The Cross-Pollinator',
    description: 'The Cross-Pollinator borrows ideas from unrelated fields and recombines them into something new.',
  },
  {
    title: 'The Hurdler',
    description: 'The Hurdler treats obstacles as design constraints and finds a way over, around, or through them.',
  },
  {
    title: 'The Collaborator',
    description: 'The Collaborator brings people together and helps mixed teams work as one.',
  },
  {
    title: 'The Director',
    description: 'The Director sets the stage, assembles the cast, and keeps the project moving toward its goal.',
  },
]

const meta: Meta<typeof Accordion> = {
  title: 'Components/Accordion',
  component: Accordion,
  subcomponents: {
    'Accordion.Item': Accordion.Item,
  },
  decorators: [
    (Story) => (
      <Box maxWidth={520}>
        <Story />
      </Box>
    ),
  ],
  argTypes: {
    headingLevel: { control: 'select', options: [2, 3, 4, 5, 6] },
    children: { control: false },
  },
}

export default meta
type Story = StoryObj<typeof Accordion>

export const Default: Story = {
  args: {
    headingLevel: 3,
    children: MODULES.map((module, index) => (
      <Accordion.Item key={module.title} title={module.title} subtitle="4 hours, 30min" defaultOpen={index === 1}>
        <Text>{module.description}</Text>
      </Accordion.Item>
    )),
  },
}

export const AllClosed: Story = {
  args: {
    headingLevel: 3,
    children: MODULES.map(module => (
      <Accordion.Item key={module.title} title={module.title} subtitle="4 hours, 30min">
        <Text>{module.description}</Text>
      </Accordion.Item>
    )),
  },
}

export const WithoutSubtitle: Story = {
  args: {
    headingLevel: 2,
    children: [
      <Accordion.Item key="refund" title="Can I get a refund?" defaultOpen>
        <Text>Yes. Request a refund within 30 days of purchase from your account settings.</Text>
      </Accordion.Item>,
      <Accordion.Item key="certificate" title="Do I get a certificate?">
        <Text>Certified courses issue a certificate once every module is completed.</Text>
      </Accordion.Item>,
      <Accordion.Item key="offline" title="Can I watch offline?">
        <Text>Lessons can be downloaded in the mobile app.</Text>
      </Accordion.Item>,
    ],
  },
}

function ControlledAccordion() {
  const [openTitles, setOpenTitles] = useState<string[]>([MODULES[0].title])
  return (
    <Accordion>
      {MODULES.slice(0, 3).map(module => (
        <Accordion.Item
          key={module.title}
          title={module.title}
          subtitle="4 hours, 30min"
          open={openTitles.includes(module.title)}
          onOpenChange={open =>
            setOpenTitles(current =>
              open ? [...current, module.title] : current.filter(title => title !== module.title),
            )
          }
        >
          <Text>{module.description}</Text>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}

export const Controlled: Story = {
  render: () => <ControlledAccordion />,
}
