import type { Meta, StoryObj } from '@storybook/react'
import { CardHorizontal } from './index'
import { Stack } from '../Stack'

const THUMBNAIL = 'https://placehold.co/80x80/D15D50/ffffff?text=Course'

const meta = {
  title: 'Components/CardHorizontal',
  component: CardHorizontal,
  argTypes: {
    variant: { control: 'radio', options: ['default', 'inverted'] },
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
} satisfies Meta<typeof CardHorizontal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    thumbnailSrc: THUMBNAIL,
    title: 'Introduction to UX Design',
    duration: '3h 20m',
    certified: true,
    variant: 'default',
  },
}

export const WithProgress: Story = {
  args: {
    thumbnailSrc: THUMBNAIL,
    title: 'Introduction to UX Design',
    duration: '3h 20m',
    certified: true,
    progress: 65,
    variant: 'default',
  },
}

export const Inverted: Story = {
  args: {
    thumbnailSrc: THUMBNAIL,
    title: 'Introduction to UX Design',
    duration: '3h 20m',
    certified: false,
    variant: 'inverted',
  },
  parameters: { backgrounds: { default: 'dark' } },
}

export const NoThumbnail: Story = {
  args: {
    title: 'Introduction to UX Design',
    duration: '3h 20m',
    certified: true,
    variant: 'default',
  },
}

export const List: Story = {
  args: { thumbnailSrc: THUMBNAIL, title: 'Course' },
  render: () => (
    <Stack gap="sm" style={{ maxWidth: 480 }}>
      <CardHorizontal
        thumbnailSrc={THUMBNAIL}
        title="Introduction to UX Design"
        duration="3h 20m"
        certified
        progress={65}
      />
      <CardHorizontal
        thumbnailSrc={THUMBNAIL}
        title="Advanced CSS Layouts"
        duration="2h 45m"
        progress={20}
      />
      <CardHorizontal
        thumbnailSrc={THUMBNAIL}
        title="React Fundamentals"
        duration="5h 10m"
        certified
      />
    </Stack>
  ),
}
