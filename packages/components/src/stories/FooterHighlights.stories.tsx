import type { Meta, StoryObj } from '@storybook/react'
import { Box } from '../components/Box'
import { Stack } from '../components/Stack'
import { Inline } from '../components/Inline'
import { Heading } from '../components/Heading'
import { Text } from '../components/Text'
import { Button } from '../components/Button'
import { CardHorizontal } from '../components/CardHorizontal'
import { Divider } from '../components/Divider'

function FooterHighlights() {
  return (
    <Box
      paddingX="xxl"
      paddingY="xl"
      style={{ background: 'var(--ds-color-background-container-inverted)' }}
    >
      <Stack gap="xl" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Inline gap="xxl" align="start" wrap={false}>
          <Stack gap="lg" style={{ flex: 1 }}>
            <Stack gap="md">
              <Heading
                size="display"
                style={{ color: 'var(--ds-color-text-inverted-default)' }}
              >
                Discover the Power of{' '}
                <span style={{ color: 'var(--ds-color-text-accent-inverted)' }}>
                  Beginner's Mind
                </span>
              </Heading>
              <Text style={{ color: 'var(--ds-color-text-inverted-default)' }}>
                Beginner's mind means approaching life with openness and curiosity, free from
                fixed ideas. Embrace learning with fresh eyes—explore how our courses nurture
                this mindset and unlock new possibilities for your growth.
              </Text>
            </Stack>
            <Box>
              <Button>See collection</Button>
            </Box>
          </Stack>

          <Stack gap="sm" style={{ flex: 1 }}>
            <CardHorizontal
              variant="inverted"
              title="Zen Mind, Beginner's Mind"
              duration="Shunryu Suzuki · 4 hours, 30min"
            />
            <CardHorizontal
              variant="inverted"
              title="Wherever You Go, There You Are"
              duration="Jon Kabat-Zinn · 2 hours, 15min"
            />
            <CardHorizontal
              variant="inverted"
              title="The Miracle of Mindfulness"
              duration="Thich Nhat Hanh · 1 hour, 10min"
            />
          </Stack>
        </Inline>

        <Divider style={{ borderColor: 'var(--ds-color-border-inverted)' }} />
        <Text size="body-small" style={{ color: 'var(--ds-color-text-inverted-subtle)' }}>
          Course descriptions are curated for learning purposes. Durations are approximate.
          All content is subject to availability.
        </Text>
      </Stack>
    </Box>
  )
}

const meta = {
  title: 'Layout/Examples/Footer Highlights',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Editorial highlight surface for showcasing a curated group of courses united by a theme or mindset. Uses the inverted (dark) background to create visual contrast against surrounding light-mode page content. The left column carries the editorial voice (headline + CTA); the right column lists the featured courses as CardHorizontal items.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = { render: () => <FooterHighlights />, tags: ['!dev'] }
