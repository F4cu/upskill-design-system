import type { Meta, StoryObj } from '@storybook/react'
import { CardVertical } from './index'
import { Box } from '../Box'
import { Inline } from '../Inline'
import { ScrollArea } from '../ScrollArea'

const THUMBNAIL = 'https://placehold.co/440x550/D15D50/ffffff?text=Course'

const meta = {
  title: 'Components/CardVertical',
  component: CardVertical,
  argTypes: {
    size: { control: 'radio', options: ['sm', 'lg'] },
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    headingLevel: { control: 'select', options: ['h2', 'h3', 'h4', 'h5', 'h6'] },
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
    ...Default.args,
    progress: 65,
  },
}

export const Completed: Story = {
  args: {
    ...Default.args,
    progress: 100,
  },
}

export const Certified: Story = {
  args: {
    ...Default.args,
    certified: true,
    progress: 100,
  },
}

export const Small: Story = {
  args: {
    ...Default.args,
    size: 'sm',
    progress: 30,
  },
}

export const NoThumbnail: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    size: 'lg',
  },
}

export const NoMeta: Story = {
  args: {
    thumbnailSrc: THUMBNAIL,
    title: 'Creative Acts for Curious People',
    size: 'lg',
  },
}

export const SavedCoursesCarousel: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '2h 30m',
    size: 'sm',
  },
  decorators: [(Story) => <Story />],
  render: (args) => (
    <ScrollArea orientation="horizontal" aria-label="Saved courses" tabIndex={0}>
      <Inline gap="md" wrap={false} align="start" style={{ width: 'max-content' }}>
        <CardVertical {...args} />
        <CardVertical {...args} title="Zen Mind, Beginner’s Mind" progress={40} />
        <CardVertical {...args} title="The Art of Noticing" progress={100} certified />
        <CardVertical {...args} title="Drawing on the Right Side" />
      </Inline>
    </ScrollArea>
  ),
}
