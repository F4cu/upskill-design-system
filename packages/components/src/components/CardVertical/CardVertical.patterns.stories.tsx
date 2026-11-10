import type { Meta, StoryObj } from '@storybook/react'
import { CardVertical } from './index'
import { useCarousel } from '../../hooks/useCarousel'
import { Avatar } from '../Avatar'
import { Badge } from '../Badge'
import { Box } from '../Box'
import { ButtonArrow } from '../ButtonArrow'
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

const oneCard: Meta['decorators'] = [
  (Story) => (
    <Box maxWidth={280}>
      <Story />
    </Box>
  ),
]

const meta: Meta<typeof CardVertical> = {
  title: 'Components/CardVertical/Patterns',
  component: CardVertical,
  argTypes: {
    size: { control: 'radio', options: ['sm', 'lg'] },
    title: { control: 'text' },
    duration: { control: 'text' },
    action: { control: false },
  },
}

export default meta
type Story = StoryObj<typeof CardVertical>

export const FavoriteSaved: Story = {
  decorators: oneCard,
  args: {
    title: 'Designing Calm Interfaces',
    duration: '9 Hours',
    certified: true,
    size: 'lg',
    action: <CardVertical.Favorite defaultPressed onPressedChange={noop} />,
  },
}

export const OverflowMenu: Story = {
  decorators: oneCard,
  args: {
    title: 'Storytelling with Data',
    duration: '4 Hours',
    size: 'sm',
    action: <CardVertical.Menu items={MENU_ITEMS} onSelect={noop} />,
  },
}

export const CustomMeta: Story = {
  decorators: oneCard,
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
  decorators: oneCard,
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
  decorators: oneCard,
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
            <Badge>New</Badge>
            <Text as="span" size="metadata" color="subtle">Updated this week</Text>
          </Inline>
        </CardVertical.Meta>
      </CardVertical.Body>
    </CardVertical.Root>
  ),
}

const COURSES = [
  { title: 'Change by Design', duration: '12 Hours', certified: true },
  { title: 'Creative Confidence', duration: '8 Hours', certified: true },
  { title: 'The Design of Everyday Things', duration: '10 Hours', certified: true },
  { title: 'The Design Thinking Playbook', duration: '6 Hours', certified: true },
  { title: 'Creative Acts for Curious People', duration: '12 Hours', certified: true, progress: 65 },
  { title: 'Full-Stack Web Development', duration: '20 Hours', certified: true, progress: 30 },
]

const CARD_WIDTH = 250
const VISIBLE_COUNT = 3

function Carousel() {
  const carousel = useCarousel(COURSES.length, VISIBLE_COUNT)
  return (
    <Stack gap="md">
      <Box overflow="hidden">
        <Inline
          gap="md"
          wrap={false}
          style={{
            transform: `translateX(calc(-${carousel.offset} * (${CARD_WIDTH}px + var(--ds-space-inline-md))))`,
            transition: 'transform 300ms ease',
          }}
        >
          {COURSES.map((course) => (
            <Box key={course.title} minWidth={CARD_WIDTH} maxWidth={CARD_WIDTH}>
              <CardVertical size="sm" {...course} />
            </Box>
          ))}
        </Inline>
      </Box>
      <Inline gap="sm" justify="end">
        <ButtonArrow direction="left" disabled={!carousel.canPrev} onClick={carousel.prev} />
        <ButtonArrow direction="right" disabled={!carousel.canNext} onClick={carousel.next} />
      </Inline>
    </Stack>
  )
}

export const CardCarousel: Story = {
  decorators: [
    (Story) => (
      <Box maxWidth={800}>
        <Story />
      </Box>
    ),
  ],
  render: () => <Carousel />,
}
