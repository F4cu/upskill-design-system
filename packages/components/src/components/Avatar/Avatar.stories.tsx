import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from './index'

const PLACEHOLDER = 'https://placehold.co/128x128/D15D50/ffffff?text=U'

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  argTypes: {
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    src: PLACEHOLDER,
    alt: 'Jane Smith',
    size: 'md',
  },
}

export const Small: Story = {
  args: {
    src: PLACEHOLDER,
    alt: 'Jane Smith',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    src: PLACEHOLDER,
    alt: 'Jane Smith',
    size: 'lg',
  },
}

export const Sizes: Story = {
  args: { src: PLACEHOLDER, alt: 'Avatar' },
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <Avatar src={PLACEHOLDER} alt="Small — 24px" size="sm" />
      <Avatar src={PLACEHOLDER} alt="Medium — 80px" size="md" />
      <Avatar src={PLACEHOLDER} alt="Large — 128px" size="lg" />
    </div>
  ),
}
