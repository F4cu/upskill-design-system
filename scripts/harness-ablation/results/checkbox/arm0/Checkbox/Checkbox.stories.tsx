import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './index'

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {
    label: { control: 'text' },
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

export const AllStates: Story = {
  args: { label: 'Label' },
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', gap: '2rem 3rem' }}>
      <Checkbox label="Label" />
      <Checkbox label="Label" defaultChecked />
      <Checkbox label="Label" disabled />
      <Checkbox label="Label" defaultChecked disabled />
    </div>
  ),
}

export const Controlled: Story = {
  args: { label: 'Weekly digest' },
  render: function ControlledStory(args) {
    const [checked, setChecked] = useState(false)
    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        <Checkbox {...args} checked={checked} onCheckedChange={setChecked} />
        <span>Weekly digest is {checked ? 'on' : 'off'}</span>
      </div>
    )
  },
}

export const InForm: Story = {
  args: { label: 'Product updates' },
  render: function InFormStory() {
    const [submitted, setSubmitted] = useState<string>('')
    return (
      <form
        style={{ display: 'grid', gap: '1rem', justifyItems: 'start' }}
        onSubmit={e => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          setSubmitted(JSON.stringify(data.getAll('notifications')))
        }}
      >
        <Checkbox label="Product updates" name="notifications" value="product" defaultChecked />
        <Checkbox label="Course reminders" name="notifications" value="reminders" />
        <Checkbox label="Marketing emails" name="notifications" value="marketing" />
        <button type="submit">Save</button>
        <button type="reset">Reset</button>
        {submitted && <output>Submitted: {submitted}</output>}
      </form>
    )
  },
}
