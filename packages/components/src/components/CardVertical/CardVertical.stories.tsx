import type { Meta, StoryObj } from '@storybook/react'
import { CardVertical } from './index'
import { Box } from '../Box'
import { Inline } from '../Inline'
import { Stack } from '../Stack'

const noop = () => {}

const MENU_ITEMS = [
  { value: 'share', label: 'Share' },
  { value: 'save', label: 'Save' },
  { value: 'hide', label: 'Hide course' },
]

const meta: Meta<typeof CardVertical> = {
  title: 'Components/CardVertical',
  component: CardVertical,
  subcomponents: {
    'CardVertical.Root': CardVertical.Root,
    'CardVertical.Media': CardVertical.Media,
    'CardVertical.Action': CardVertical.Action,
    'CardVertical.Favorite': CardVertical.Favorite,
    'CardVertical.Menu': CardVertical.Menu,
    'CardVertical.Progress': CardVertical.Progress,
    'CardVertical.Body': CardVertical.Body,
    'CardVertical.Title': CardVertical.Title,
    'CardVertical.Meta': CardVertical.Meta,
    'CardVertical.Duration': CardVertical.Duration,
    'CardVertical.Certified': CardVertical.Certified,
    'CardVertical.Completed': CardVertical.Completed,
  },
  decorators: [
    (Story) => (
      <Box maxWidth={280}>
        <Story />
      </Box>
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
    action: { control: false },
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

export const Completed: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    certified: true,
    progress: 100,
    size: 'sm',
  },
}

export const Placeholder: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    size: 'lg',
  },
}

export const FavoriteWithProgress: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    certified: true,
    progress: 20,
    size: 'sm',
    action: <CardVertical.Favorite defaultPressed onPressedChange={noop} />,
  },
}

export const ActionsOnLightAndDarkMedia: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Visual contrast check for the on-media halo (ADR-024): the token contrast gate cannot see photo pixels, so Favorite and Menu are shown over a near-white and a near-black thumbnail. The glyph must stay legible on both.',
      },
    },
  },
  decorators: [
    (Story) => (
      <Box maxWidth={600}>
        <Story />
      </Box>
    ),
  ],
  render: () => (
    <Inline gap="md" wrap={false}>
      {[
        ['https://placehold.co/400x500/F7F7F7/F7F7F7', 'Near-white thumbnail'],
        ['https://placehold.co/400x500/141414/141414', 'Near-black thumbnail'],
      ].map(([src, alt]) => (
        <Stack key={src} gap="md" grow={1}>
          <CardVertical
            size="lg"
            thumbnailSrc={src}
            thumbnailAlt={alt}
            title="Designing Calm Interfaces"
            duration="9 Hours"
            action={<CardVertical.Favorite onPressedChange={noop} />}
          />
          <CardVertical
            size="lg"
            thumbnailSrc={src}
            thumbnailAlt={alt}
            title="Storytelling with Data"
            duration="4 Hours"
            action={<CardVertical.Menu items={MENU_ITEMS} onSelect={noop} />}
          />
        </Stack>
      ))}
    </Inline>
  ),
}

export const TitleOnly: Story = {
  args: {
    title: 'Research Ops, Explained',
    size: 'sm',
  },
}
