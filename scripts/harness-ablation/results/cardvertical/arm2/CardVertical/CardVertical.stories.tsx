import type { Meta, StoryObj } from '@storybook/react'
import { CardVertical } from './index'
import { Inline } from '../Inline'

const THUMBNAIL = 'https://placehold.co/560x680/D15D50/ffffff?text=Course'

const meta = {
  title: 'Components/CardVertical',
  component: CardVertical,
  argTypes: {
    size: { control: 'radio', options: ['sm', 'lg'] },
    headingLevel: { control: 'select', options: ['h2', 'h3', 'h4', 'h5', 'h6'] },
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
  args: {
    thumbnailSrc: THUMBNAIL,
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    size: 'lg',
  },
} satisfies Meta<typeof CardVertical>

export default meta
type Story = StoryObj<typeof meta>

const cardWidth: Story['decorators'] = [(Story) => <div style={{ width: 280 }}><Story /></div>]

export const Default: Story = {
  decorators: cardWidth,
}

export const InProgress: Story = {
  decorators: cardWidth,
  args: {
    progress: 65,
  },
}

export const Completed: Story = {
  decorators: cardWidth,
  args: {
    progress: 100,
  },
}

export const CertifiedCompleted: Story = {
  decorators: cardWidth,
  args: {
    certified: true,
    progress: 100,
  },
}

export const Small: Story = {
  decorators: cardWidth,
  args: {
    progress: 30,
    size: 'sm',
  },
}

export const NoThumbnail: Story = {
  decorators: cardWidth,
  args: {
    thumbnailSrc: undefined,
  },
}

export const NoMeta: Story = {
  decorators: cardWidth,
  args: {
    duration: undefined,
  },
}

export const LongTitle: Story = {
  decorators: cardWidth,
  args: {
    title: 'Creative Acts for Curious People: Building a Daily Practice of Making, Noticing and Sharing',
    duration: '2h 30m',
    certified: true,
  },
}

export const Row: Story = {
  parameters: { controls: { disable: true } },
  args: {
    size: 'sm',
  },
  render: (args) => (
    <Inline gap="lg" align="start">
      <div style={{ width: 280 }}><CardVertical {...args} /></div>
      <div style={{ width: 280 }}><CardVertical {...args} progress={30} /></div>
      <div style={{ width: 280 }}><CardVertical {...args} progress={100} certified /></div>
    </Inline>
  ),
}
