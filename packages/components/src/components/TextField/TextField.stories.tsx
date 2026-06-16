import type { Meta, StoryObj } from '@storybook/react'
import { TextField } from './index'

const meta = {
  title: 'Components/TextField',
  component: TextField,
  argTypes: {
    label: { control: 'text' },
    hideLabel: { control: 'boolean' },
    error: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    size: { control: 'select', options: ['default', 'large'] },
    shape: { control: 'select', options: ['square', 'round'] },
    icon: {
      control: 'select',
      options: [undefined, 'search', 'badge-check', 'award', 'bookmark', 'plus', 'minus', 'heart', 'menu', 'sun', 'moon-star', 'download', 'file-down', 'zap', 'lightbulb', 'pen-tool', 'image'],
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
  },
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    type: 'email',
  },
}

export const WithValue: Story = {
  args: {
    label: 'First name',
    defaultValue: 'Jane',
  },
}

export const WithError: Story = {
  args: {
    label: 'Email',
    defaultValue: 'not-an-email',
    error: 'Enter a valid email address.',
    type: 'email',
  },
}

export const Disabled: Story = {
  args: {
    label: 'Username',
    defaultValue: 'jane.smith',
    disabled: true,
  },
}

export const Password: Story = {
  args: {
    label: 'Password',
    placeholder: '••••••••',
    type: 'password',
  },
}

export const HiddenLabel: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search…',
    type: 'search',
    hideLabel: true,
  },
}

export const Large: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    type: 'email',
    size: 'large',
  },
}

export const Round: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search…',
    type: 'search',
    shape: 'round',
  },
}

export const LargeRound: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search…',
    type: 'search',
    size: 'large',
    shape: 'round',
  },
}

export const SearchWithIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search…',
    type: 'search',
    shape: 'round',
    icon: 'search',
    hideLabel: true,
  },
}

export const SearchWithIconLarge: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search…',
    type: 'search',
    size: 'large',
    shape: 'round',
    icon: 'search',
    hideLabel: true,
  },
}
