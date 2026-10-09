import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './index'
import type { CheckboxProps } from './index'
import { Stack } from '../Stack'
import { Text } from '../Text'

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {
    label: { control: 'text' },
    defaultChecked: { control: 'boolean' },
    disabled: { control: 'boolean' },
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

function ControlledCheckbox(args: CheckboxProps) {
  const [checked, setChecked] = useState(false)
  return (
    <Stack gap="sm">
      <Checkbox {...args} checked={checked} onChange={e => setChecked(e.target.checked)} />
      <Text size="body-small" color="subtle">
        {checked ? 'Subscribed' : 'Not subscribed'}
      </Text>
    </Stack>
  )
}

export const Controlled: Story = {
  args: {
    label: 'Weekly progress digest',
  },
  render: args => <ControlledCheckbox {...args} />,
}

export const InForm: Story = {
  render: () => (
    <form aria-label="Notification preferences" onSubmit={e => e.preventDefault()}>
      <Stack gap="md">
        <Checkbox name="notifications" value="newCourses" label="New courses" defaultChecked />
        <Checkbox name="notifications" value="reminders" label="Learning reminders" />
        <Checkbox name="notifications" value="digest" label="Weekly progress digest" />
        <Checkbox name="notifications" value="billing" label="Billing updates" defaultChecked disabled />
      </Stack>
    </form>
  ),
}
