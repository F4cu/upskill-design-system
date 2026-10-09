import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './index'
import { Inline } from '../Inline'

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'inline-radio', options: ['bordered', 'filled'] },
    children: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Bordered: Story = {
  args: {
    children: 'Design',
    variant: 'bordered',
  },
}

export const Filled: Story = {
  args: {
    children: 'Design Thinking',
    variant: 'filled',
  },
}

export const Variants: Story = {
  render: () => (
    <Inline gap="md">
      <Badge>Badge</Badge>
      <Badge variant="filled">Badge</Badge>
    </Inline>
  ),
}

export const CourseTopics: Story = {
  render: () => (
    <Inline gap="sm" wrap>
      <Badge>Design</Badge>
      <Badge>Design Thinking</Badge>
      <Badge variant="filled">Beginner</Badge>
    </Inline>
  ),
}
