import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './index'
import { Inline } from '../Inline'

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'radio', options: ['outlined', 'filled'] },
    children: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = {
  args: {
    children: 'Design',
    variant: 'outlined',
  },
}

export const Filled: Story = {
  args: {
    children: 'Design Thinking',
    variant: 'filled',
  },
}

export const TopicList: Story = {
  args: {
    variant: 'outlined',
  },
  render: args => (
    <Inline gap="sm" wrap>
      <Badge {...args}>Design</Badge>
      <Badge {...args}>Design Thinking</Badge>
      <Badge {...args}>User Research</Badge>
    </Inline>
  ),
}
