import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './index'
import { Inline } from '../Inline'

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    children: { control: 'text' },
    variant: { control: 'radio', options: ['outline', 'filled'] },
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
    children: 'Beginner',
    variant: 'filled',
  },
}

export const CategoryRow: Story = {
  render: () => (
    <Inline gap="sm">
      <Badge>Design</Badge>
      <Badge>Development</Badge>
      <Badge variant="filled">Beginner</Badge>
      <Badge variant="filled">4h 30m</Badge>
    </Inline>
  ),
}
