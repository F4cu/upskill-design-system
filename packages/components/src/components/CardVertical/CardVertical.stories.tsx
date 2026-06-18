import type { Meta, StoryObj } from '@storybook/react'
import { CardVertical } from './index'

const meta: Meta<typeof CardVertical> = {
  title: 'Components/CardVertical',
  component: CardVertical,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    size: { control: 'radio', options: ['sm', 'lg'] },
    thumbnailSrc: { control: 'text' },
    thumbnailAlt: { control: 'text' },
    title: { control: 'text' },
    duration: { control: 'text' },
    certified: { control: 'boolean' },
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
}

export default meta
type Story = StoryObj<typeof CardVertical>

export const Default: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    certified: true,
    size: 'lg',
  },
}

export const SmallSize: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    certified: true,
    size: 'sm',
  },
}

export const WithProgress: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    certified: true,
    progress: 65,
    size: 'lg',
  },
}

export const Placeholder: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    size: 'lg',
  },
}
