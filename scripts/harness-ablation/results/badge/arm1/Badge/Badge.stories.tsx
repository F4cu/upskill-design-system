import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './index'
import { Inline } from '../Inline'

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'inline-radio', options: ['outline', 'filled'] },
    children: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = {
  args: {
    children: 'Design',
    variant: 'outline',
  },
}

export const Filled: Story = {
  args: {
    children: 'Design',
    variant: 'filled',
  },
}

export const TopicGroup: Story = {
  args: {
    variant: 'outline',
  },
  render: args => (
    <Inline gap="sm" wrap>
      <Badge {...args}>Design</Badge>
      <Badge {...args}>Design Thinking</Badge>
      <Badge {...args}>UX Research</Badge>
    </Inline>
  ),
}
