import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './index'

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {
    label: { control: 'text' },
    hideLabel: { control: 'boolean' },
    defaultChecked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    name: { control: 'text' },
    value: { control: 'text' },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Email me about new courses',
  },
}

export const Checked: Story = {
  args: {
    label: 'Email me about new courses',
    defaultChecked: true,
  },
}

export const Disabled: Story = {
  args: {
    label: 'Email me about new courses',
    disabled: true,
  },
}

export const DisabledChecked: Story = {
  args: {
    label: 'Email me about new courses',
    defaultChecked: true,
    disabled: true,
  },
}

export const HiddenLabel: Story = {
  args: {
    label: 'Select row',
    hideLabel: true,
  },
}

export const Controlled: Story = {
  args: {
    label: 'Weekly progress digest',
  },
  render: function ControlledCheckbox(args) {
    const [checked, setChecked] = useState(true)
    return <Checkbox {...args} checked={checked} onChange={(event) => setChecked(event.target.checked)} />
  },
}
