import type { Meta, StoryObj } from '@storybook/react'
import { Chip } from './index'
import { Inline } from '../Inline'

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
  argTypes: {
    pressed: { control: 'boolean' },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Chip>

export const Default: Story = {
  args: {
    children: 'All Courses',
    pressed: false,
  },
}

export const Pressed: Story = {
  args: {
    children: 'Design',
    pressed: true,
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
    <Inline gap="sm" wrap role="group" aria-label="Filter courses by topic">
      <Chip pressed>All Courses</Chip>
      <Chip>Design</Chip>
      <Chip>Development</Chip>
      <Chip>Business</Chip>
      <Chip>Marketing</Chip>
    </Inline>
  ),
}
