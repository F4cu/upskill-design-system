import type { Meta, StoryObj } from '@storybook/react'
import { CardVertical } from './index'
import { Inline } from '../Inline'
import { Stack } from '../Stack'

const meta = {
  title: 'Components/CardVertical',
  component: CardVertical,
  argTypes: {
    size: { control: 'radio', options: ['sm', 'lg'] },
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
  render: (args) => (
    <Stack maxWidth={280}>
      <CardVertical {...args} />
    </Stack>
  ),
} satisfies Meta<typeof CardVertical>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    size: 'lg',
  },
}

export const InProgress: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    progress: 65,
    size: 'lg',
  },
}

export const Completed: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    progress: 100,
    size: 'lg',
  },
}

export const CertifiedCompleted: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    certified: true,
    progress: 100,
    size: 'sm',
  },
}

export const Small: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    progress: 30,
    size: 'sm',
  },
}

export const WithThumbnail: Story = {
  args: {
    thumbnailSrc: 'https://placehold.co/440x550/D15D50/ffffff?text=Course',
    thumbnailAlt: '',
    title: 'Creative Acts for Curious People',
    duration: '2h 30m',
    size: 'lg',
  },
}

export const NoMeta: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    size: 'lg',
  },
}

export const SavedCoursesRow: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    size: 'sm',
  },
  render: (args) => (
    <Inline gap="md" wrap={false} align="start">
      <CardVertical {...args} />
      <CardVertical {...args} progress={30} />
      <CardVertical {...args} certified progress={100} />
    </Inline>
  ),
}
