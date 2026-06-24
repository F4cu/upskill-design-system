import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { useCarousel } from '../hooks/useCarousel'
import { Box } from '../components/Box'
import { Stack } from '../components/Stack'
import { Inline } from '../components/Inline'
import { Heading } from '../components/Heading'
import { Divider } from '../components/Divider'
import { Chip } from '../components/Chip'
import { CardVertical } from '../components/CardVertical'
import { ButtonArrow } from '../components/ButtonArrow'

const FILTERS = ['All Courses', 'Design', 'Development', 'Business', 'Marketing']

const COURSES = [
  { title: 'Change by Design', duration: '12 Hours', certified: true },
  { title: 'Creative Confidence', duration: '8 Hours', certified: true },
  { title: 'The Design of Everyday Things', duration: '10 Hours', certified: true },
  { title: 'The Design Thinking Playbook', duration: '6 Hours', certified: true },
  { title: 'Creative Acts for Curious People', duration: '12 Hours', certified: true, progress: 65 },
  { title: 'Full-Stack Web Development', duration: '20 Hours', certified: true, progress: 30 },
]

const COMPACT_CARD_WIDTH = 250
const VISIBLE_COUNT = 4

function CarouselPage() {
  const [discoverFilter, setDiscoverFilter] = useState('All Courses')
  const [savedFilter, setSavedFilter] = useState('All Courses')
  const carousel = useCarousel(COURSES.length, VISIBLE_COUNT)

  return (
    <Box
      padding="xl"
      style={{
        background: 'var(--ds-color-background-container-page)',
        minHeight: '100vh',
        maxWidth: '1280px',
        margin: '0 auto',
      }}
    >
      <Stack gap="xxl">

        {/* Default: 4 equal-width cards, no arrows */}
        <Stack gap="lg">
          <Stack gap="md">
            <Heading size="headline">Discover Courses</Heading>
            <Inline gap="sm" wrap>
              {FILTERS.map((f) => (
                <Chip key={f} selected={f === discoverFilter} onClick={() => setDiscoverFilter(f)}>
                  {f}
                </Chip>
              ))}
            </Inline>
          </Stack>
          <Box overflow="hidden">
            <div style={{ display: 'flex', gap: 'var(--ds-grid-gutter)' }}>
              {COURSES.slice(0, 4).map((course) => (
                <div key={course.title} style={{ flex: '1 0 min-content' }}>
                  <CardVertical title={course.title} duration={course.duration} certified={course.certified} size="lg" />
                </div>
              ))}
            </div>
          </Box>
        </Stack>

        <Divider />

        {/* Compact: fixed-width cards with arrow pagination */}
        <Stack gap="lg">
          <Stack gap="md">
            <Heading size="headline">Saved Courses</Heading>
            <Inline gap="sm" wrap>
              {FILTERS.map((f) => (
                <Chip key={f} selected={f === savedFilter} onClick={() => setSavedFilter(f)}>
                  {f}
                </Chip>
              ))}
            </Inline>
          </Stack>
          <Stack gap="md">
            <Box overflow="hidden">
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--ds-grid-gutter)',
                  transform: `translateX(calc(-${carousel.offset} * (${COMPACT_CARD_WIDTH}px + var(--ds-grid-gutter))))`,
                  transition: 'transform 300ms ease',
                }}
              >
                {COURSES.map((course) => (
                  <div key={course.title} style={{ flexShrink: 0, width: `${COMPACT_CARD_WIDTH}px` }}>
                    <CardVertical
                      title={course.title}
                      duration={course.duration}
                      certified={course.certified}
                      progress={course.progress}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </Box>
            <Inline gap="sm" justify="end">
              <ButtonArrow direction="left" disabled={!carousel.canPrev} onClick={carousel.prev} />
              <ButtonArrow direction="right" disabled={!carousel.canNext} onClick={carousel.next} />
            </Inline>
          </Stack>
        </Stack>

      </Stack>
    </Box>
  )
}

const meta = {
  title: 'Layout/Examples/Carousel',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Demonstrates two carousel patterns: a full-width 4-card grid (Discover) and a compact paginated carousel with ButtonArrow navigation (Saved Courses). Both include a Chip filter bar and section heading. Chip selection is local state in this example — wire to real filter logic in production.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => <CarouselPage />,
  tags: ['!dev'],
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `
const carousel = useCarousel(courses.length, VISIBLE_COUNT)
const [filter, setFilter] = useState('All Courses')

{/* Full-width grid: equal-width cards, no pagination */}
<Stack gap="lg">
  <Stack gap="md">
    <Heading size="headline">Discover Courses</Heading>
    <Inline gap="sm" wrap>
      {FILTERS.map((f) => (
        <Chip key={f} selected={f === filter} onClick={() => setFilter(f)}>{f}</Chip>
      ))}
    </Inline>
  </Stack>
  <Box overflow="hidden">
    <div style={{ display: 'flex', gap: 'var(--ds-grid-gutter)' }}>
      {courses.slice(0, 4).map((course) => (
        <div key={course.title} style={{ flex: '1 0 min-content' }}>
          <CardVertical title={course.title} duration={course.duration} certified={course.certified} size="lg" />
        </div>
      ))}
    </div>
  </Box>
</Stack>

<Divider />

{/* Compact: fixed-width cards with ButtonArrow pagination */}
<Stack gap="lg">
  <Heading size="headline">Saved Courses</Heading>
  <Stack gap="md">
    <Box overflow="hidden">
      <div
        style={{
          display: 'flex',
          gap: 'var(--ds-grid-gutter)',
          transform: \`translateX(calc(-\${carousel.offset} * (\${CARD_WIDTH}px + var(--ds-grid-gutter))))\`,
          transition: 'transform 300ms ease',
        }}
      >
        {courses.map((course) => (
          <div key={course.title} style={{ flexShrink: 0, width: \`\${CARD_WIDTH}px\` }}>
            <CardVertical title={course.title} duration={course.duration} certified={course.certified} progress={course.progress} size="sm" />
          </div>
        ))}
      </div>
    </Box>
    <Inline gap="sm" justify="end">
      <ButtonArrow direction="left" disabled={!carousel.canPrev} onClick={carousel.prev} />
      <ButtonArrow direction="right" disabled={!carousel.canNext} onClick={carousel.next} />
    </Inline>
  </Stack>
</Stack>
`.trim(),
      },
    },
  },
}
