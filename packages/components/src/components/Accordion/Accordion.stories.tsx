import type { Meta, StoryObj } from '@storybook/react'
import { Text } from '../Text'
import { Accordion, AccordionItem } from './index'

const meta: Meta<typeof AccordionItem> = {
  title: 'Components/Accordion',
  component: AccordionItem,
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    defaultOpen: { control: 'boolean' },
    headingLevel: { control: 'select', options: [2, 3, 4, 5, 6] },
  },
}

export default meta
type Story = StoryObj<typeof AccordionItem>

export const Default: Story = {
  args: {
    title: 'The Anthropologist',
    subtitle: '4 hours, 30min',
    defaultOpen: false,
    children: (
      <Text>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc elementum nulla eu justo
        iaculis, a condimentum sapien lobortis. Duis tincidunt, libero sit amet eleifend
        consectetur.
      </Text>
    ),
  },
}

export const OpenByDefault: Story = {
  args: {
    title: 'The Anthropologist',
    subtitle: '4 hours, 30min',
    defaultOpen: true,
    children: (
      <Text>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc elementum nulla eu justo
        iaculis, a condimentum sapien lobortis. Duis tincidunt, libero sit amet eleifend
        consectetur.
      </Text>
    ),
  },
}

export const CourseModuleList: Story = {
  render: () => (
    <Accordion>
      <AccordionItem title="The Anthropologist" subtitle="4 hours, 30min" defaultOpen>
        <Text>
          Explore how anthropologists study human behaviour and culture. This module covers
          ethnographic methods, field research, and cultural analysis.
        </Text>
      </AccordionItem>
      <AccordionItem title="Design Thinking Foundations" subtitle="2 hours, 15min">
        <Text>
          An introduction to design thinking as a human-centred problem-solving approach. Learn the
          five stages: empathise, define, ideate, prototype, and test.
        </Text>
      </AccordionItem>
      <AccordionItem title="Prototyping & Testing" subtitle="3 hours, 45min">
        <Text>
          Hands-on techniques for rapid prototyping and user testing. Covers wireframing, usability
          testing scripts, and iterating based on feedback.
        </Text>
      </AccordionItem>
    </Accordion>
  ),
}

export const NoSubtitle: Story = {
  args: {
    title: 'Introduction to the Course',
    children: (
      <Text>
        Welcome to this course. In this section you will learn the core concepts that underpin
        every module going forward.
      </Text>
    ),
  },
}
