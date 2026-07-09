import type { Meta, StoryObj } from '@storybook/react'
import { Chip } from './index'
import { Inline } from '../Inline'

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
  argTypes: {
    selected: { control: 'boolean' },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Chip>

export const Default: Story = {
  args: {
    children: 'All Courses',
    selected: false,
  },
}

export const Selected: Story = {
  args: {
    children: 'Design',
    selected: true,
  },
}

export const Disabled: Story = {
  args: {
    children: 'Development',
    disabled: true,
  },
}

export const FilterGroup: Story = {
  render: () => (
    <Inline gap="sm" wrap>
      <Chip selected>All Courses</Chip>
      <Chip>Design</Chip>
      <Chip>Development</Chip>
      <Chip>Business</Chip>
      <Chip>Marketing</Chip>
    </Inline>
  ),
}
