import type { Meta, StoryObj } from '@storybook/react'
import { VideoFrame } from './index'

const meta: Meta<typeof VideoFrame> = {
  title: 'Components/VideoFrame',
  component: VideoFrame,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    src: { control: 'text' },
    alt: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof VideoFrame>

export const Default: Story = {
  args: {
    alt: 'Course preview video thumbnail',
  },
}

export const WithThumbnail: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop',
    alt: 'Course preview: laptop on desk',
  },
}
