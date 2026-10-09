import type { Meta, StoryObj } from '@storybook/react'
import { CardVertical } from './index'
import { Box } from '../Box'
import { Inline } from '../Inline'
import { Stack } from '../Stack'

const THUMBNAIL = 'https://placehold.co/440x680/D15D50/ffffff?text=Course'

const meta = {
  title: 'Components/CardVertical',
  component: CardVertical,
  argTypes: {
    size: { control: 'radio', options: ['sm', 'lg'] },
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
  decorators: [
    (Story) => (
      <Box maxWidth={280}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof CardVertical>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    thumbnailSrc: THUMBNAIL,
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    size: 'lg',
  },
}

export const InProgress: Story = {
  args: {
    thumbnailSrc: THUMBNAIL,
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    progress: 65,
    size: 'lg',
  },
}

export const Completed: Story = {
  args: {
    thumbnailSrc: THUMBNAIL,
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    certified: true,
    progress: 100,
    size: 'lg',
  },
}

export const Small: Story = {
  args: {
    thumbnailSrc: THUMBNAIL,
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    progress: 30,
    size: 'sm',
  },
}

export const NoThumbnail: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    size: 'lg',
  },
}

export const AllStates: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
  },
  decorators: [
    (Story) => (
      <Box maxWidth={960}>
        <Story />
      </Box>
    ),
  ],
  render: (args) => (
    <Stack gap="xxl">
      {(['lg', 'sm'] as const).map((size) => (
        <Inline key={size} gap="xl" align="start" wrap={false}>
          <CardVertical {...args} size={size} />
          <CardVertical {...args} size={size} progress={size === 'lg' ? 65 : 30} />
          <CardVertical {...args} size={size} progress={100} certified={size === 'sm'} />
        </Inline>
      ))}
    </Stack>
  ),
}
