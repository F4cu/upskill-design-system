import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './index'

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'radio', options: ['outline', 'filled'] },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = {
  args: {
    label: 'Design',
    variant: 'outline',
  },
}

export const Filled: Story = {
  args: {
    label: 'Beginner',
    variant: 'filled',
  },
}

export const CategoryRow: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Badge label="Design" />
      <Badge label="Development" />
      <Badge label="Beginner" variant="filled" />
      <Badge label="4h 30m" variant="filled" />
    </div>
  ),
}
