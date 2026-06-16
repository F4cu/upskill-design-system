import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './index'

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    defaultChecked: { control: 'boolean' },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'I agree to the terms and conditions',
  },
}

export const Checked: Story = {
  args: {
    label: 'Email me when a course is updated',
    defaultChecked: true,
  },
}

export const Disabled: Story = {
  args: {
    label: 'This option is unavailable',
    disabled: true,
  },
}

export const DisabledChecked: Story = {
  args: {
    label: 'Managed by your organisation',
    disabled: true,
    defaultChecked: true,
  },
}

export const Group: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Checkbox label="Email me when a course is updated" defaultChecked />
      <Checkbox label="Send weekly progress digests" defaultChecked />
      <Checkbox label="Notify me about new content in enrolled tracks" />
      <Checkbox label="Managed by your organisation" disabled defaultChecked />
    </div>
  ),
}
