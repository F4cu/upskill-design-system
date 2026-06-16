import type { Meta, StoryObj } from '@storybook/react'
import { Select } from './index'

const TIMEZONE_OPTIONS = [
  { value: 'utc', label: 'UTC' },
  { value: 'us-east', label: 'US Eastern (UTC−5)' },
  { value: 'us-central', label: 'US Central (UTC−6)' },
  { value: 'us-west', label: 'US Pacific (UTC−8)' },
  { value: 'eu-central', label: 'EU Central (UTC+1)' },
  { value: 'asia-tokyo', label: 'Asia/Tokyo (UTC+9)' },
]

const meta = {
  title: 'Components/Select',
  component: Select,
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Time zone',
    options: TIMEZONE_OPTIONS,
    placeholder: 'Select a time zone',
  },
}

export const WithSelection: Story = {
  args: {
    label: 'Time zone',
    options: TIMEZONE_OPTIONS,
    defaultValue: 'utc',
  },
}

export const WithError: Story = {
  args: {
    label: 'Time zone',
    options: TIMEZONE_OPTIONS,
    placeholder: 'Select a time zone',
    error: 'Please select a time zone to continue.',
  },
}

export const Disabled: Story = {
  args: {
    label: 'Time zone',
    options: TIMEZONE_OPTIONS,
    defaultValue: 'utc',
    disabled: true,
  },
}
