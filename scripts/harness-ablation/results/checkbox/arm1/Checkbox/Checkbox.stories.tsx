import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './index'
import { Stack } from '../Stack'

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {
    label: { control: 'text' },
    defaultChecked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    name: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Checkbox>

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

export const Controlled: Story = {
  args: {
    label: 'Weekly progress digest',
  },
  render: function Render(args) {
    const [checked, setChecked] = useState(false)
    return <Checkbox {...args} checked={checked} onChange={e => setChecked(e.target.checked)} />
  },
}

export const NotificationPreferences: Story = {
  render: () => (
    <Stack gap="sm" role="group" aria-label="Notifications">
      <Checkbox name="notifications" value="courses" label="New courses" defaultChecked />
      <Checkbox name="notifications" value="digest" label="Weekly progress digest" />
      <Checkbox name="notifications" value="security" label="Security alerts" defaultChecked disabled />
    </Stack>
  ),
}
