import type { Meta, StoryObj } from '@storybook/react'
import { Breadcrumb } from './index'

const meta = {
  title: 'Components/Breadcrumb',
  component: Breadcrumb,
} satisfies Meta<typeof Breadcrumb>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Courses', href: '/courses' },
      { label: 'User Settings' },
    ],
  },
}

export const TwoLevels: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'User Settings' },
    ],
  },
}

export const SingleLevel: Story = {
  args: {
    items: [{ label: 'User Settings' }],
  },
}
