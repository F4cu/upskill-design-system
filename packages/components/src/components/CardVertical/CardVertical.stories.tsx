import type { Meta, StoryObj } from '@storybook/react'
import { CardVertical } from './index'
import { Avatar } from '../Avatar'
import { Badge } from '../Badge'
import { Box } from '../Box'
import { Inline } from '../Inline'
import { Stack } from '../Stack'
import { Text } from '../Text'

const AVATAR = 'https://placehold.co/128x128/D15D50/ffffff?text=NF'

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

export const Placeholder: Story = {
  args: {
    title: 'Creative Acts for Curious People',
    duration: '12 Hours',
    size: 'lg',
  },
}

export const WithFavorite: Story = {
  args: {
    title: 'Designing Calm Interfaces',
    duration: '9 Hours',
    certified: true,
    size: 'lg',
    action: <CardVertical.Favorite defaultPressed onPressedChange={noop} />,
  },
}

export const WithMenu: Story = {
  args: {
    title: 'Storytelling with Data',
    duration: '4 Hours',
    size: 'sm',
    action: <CardVertical.Menu items={MENU_ITEMS} onSelect={noop} />,
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

export const Composed: Story = {
  args: {
    title: 'Facilitation Fundamentals',
    size: 'lg',
  },
  render: ({ title, size, thumbnailSrc, thumbnailAlt }) => (
    <CardVertical.Root size={size}>
      <CardVertical.Media src={thumbnailSrc} alt={thumbnailAlt}>
        <CardVertical.Action>
          <CardVertical.Menu items={MENU_ITEMS} onSelect={noop} />
        </CardVertical.Action>
      </CardVertical.Media>
      <CardVertical.Body>
        <CardVertical.Title>{title}</CardVertical.Title>
        <CardVertical.Meta>
          <Text as="span" size="metadata" color="subtle">Updated this week</Text>
        </CardVertical.Meta>
      </CardVertical.Body>
    </CardVertical.Root>
  ),
}

export const InstructorRow: Story = {
  args: {
    title: 'Designing Calm Interfaces',
    duration: '9 Hours',
    size: 'lg',
  },
  render: ({ title, duration, size, thumbnailSrc, thumbnailAlt }) => (
    <CardVertical.Root size={size}>
      <CardVertical.Media src={thumbnailSrc} alt={thumbnailAlt}>
        <CardVertical.Action>
          <CardVertical.Favorite onPressedChange={noop} />
        </CardVertical.Action>
      </CardVertical.Media>
      <CardVertical.Body>
        <CardVertical.Title>{title}</CardVertical.Title>
        <Inline gap="sm" align="center" wrap={false}>
          <Avatar src={AVATAR} alt="" size="sm" />
          <Stack gap="xs">
            <Text as="span" size="metadata">Nate Foss</Text>
            <Text as="span" size="metadata" color="subtle">Instructor</Text>
          </Stack>
        </Inline>
        <CardVertical.Meta>
          <CardVertical.Duration>{duration}</CardVertical.Duration>
          <CardVertical.Certified />
        </CardVertical.Meta>
      </CardVertical.Body>
    </CardVertical.Root>
  ),
}

export const GroupedMeta: Story = {
  args: {
    title: 'Research Ops, Explained',
    duration: '9 Hours',
    size: 'sm',
  },
  render: ({ title, duration, size, thumbnailSrc, thumbnailAlt }) => (
    <CardVertical.Root size={size}>
      <CardVertical.Media src={thumbnailSrc} alt={thumbnailAlt} />
      <CardVertical.Body>
        <CardVertical.Title>{title}</CardVertical.Title>
        <CardVertical.Meta>
          <CardVertical.Duration>{duration}</CardVertical.Duration>
          <Inline gap="xs" align="center">
            <Badge label="New" />
            <Text as="span" size="metadata" color="subtle">Updated this week</Text>
          </Inline>
        </CardVertical.Meta>
      </CardVertical.Body>
    </CardVertical.Root>
  ),
}
