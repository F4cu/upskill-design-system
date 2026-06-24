import type { Meta, StoryObj } from '@storybook/react'
import { AppHeader } from '../components/AppHeader'
import { Box } from '../components/Box'
import { Stack } from '../components/Stack'
import { Inline } from '../components/Inline'
import { Heading } from '../components/Heading'
import { Text } from '../components/Text'
import { Button } from '../components/Button'
import { CardHorizontal } from '../components/CardHorizontal'
import { Divider } from '../components/Divider'
import logoLight from '../assets/logos/brand-logo-light-theme.svg'
import logoDark from '../assets/logos/brand-logo-dark-theme.svg'
import '../styles/grid.css'

const NAV_ITEMS = [
  { label: 'All Courses', href: '/courses' },
  { label: 'My Courses', href: '/my-courses', active: true },
  { label: 'Browse', href: '/browse' },
]

const USER_MENU_ITEMS = [
  { value: 'profile', label: 'My Profile' },
  { value: 'settings', label: 'Settings' },
  { value: 'logout', label: 'Log out' },
]

const meta = {
  title: 'Layout/Examples/Landing Page',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  tags: ['!dev'],
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `
{/* Hero */}
<Box paddingY="xxl">
  <div className="container">
    <Stack gap="lg" style={{ maxWidth: '600px' }}>
      <Stack gap="md">
        <Heading size="display">
          Learn by building{' '}
          <span style={{ color: 'var(--ds-color-text-accent-default)' }}>real things</span>
        </Heading>
        <Text color="subtle">
          Hands-on courses for product teams. Ship faster, build better, and grow with intention.
        </Text>
      </Stack>
      <Inline gap="md">
        <Button>Start learning</Button>
        <Button variant="outlined">Browse courses</Button>
      </Inline>
    </Stack>
  </div>
</Box>

{/* Continue learning */}
<Box paddingY="xl">
  <div className="container">
    <Stack gap="lg">
      <Heading size="headline">Continue learning</Heading>
      <Inline gap="xl" align="start" wrap={false}>
        <Stack gap="md" style={{ flex: 1 }}>
          <CardHorizontal title="Design Systems in Practice" duration="Token architecture · 4 hours, 30min" progress={65} />
          <CardHorizontal title="Component-Driven Development" duration="React + Vite · 3 hours, 15min" progress={20} />
        </Stack>
        <Stack gap="md" style={{ flex: 1 }}>
          <CardHorizontal title="Accessibility in Design Systems" duration="ARIA & focus management · 2 hours, 45min" progress={80} />
          <CardHorizontal title="Typography & Spacing Tokens" duration="Style Dictionary · 1 hour, 50min" progress={10} />
        </Stack>
      </Inline>
    </Stack>
  </div>
</Box>

{/* Footer */}
<Box paddingY="lg">
  <div className="container">
    <Divider />
    <Box paddingY="md">
      <Text size="body-small" color="subtle">
        Course descriptions are curated for learning purposes. Durations are approximate.
        All content is subject to availability.
      </Text>
    </Box>
  </div>
</Box>
`.trim(),
      },
    },
  },
  render: () => (
    <Box style={{ background: 'var(--ds-color-background-container-page)', minHeight: '100vh' }}>
      <AppHeader
        logoSrc={logoLight}
        logoSrcDark={logoDark}
        logoAlt="UpSkill"
        navItems={NAV_ITEMS}
        userName="Alex M."
        userAvatarSrc="https://placehold.co/24x24/D15D50/ffffff?text=A"
        userMenuItems={USER_MENU_ITEMS}
      />

      {/* Hero */}
      <Box paddingY="xxl">
        <div className="container">
          <Stack gap="lg" style={{ maxWidth: '600px' }}>
            <Stack gap="md">
              <Heading size="display">
                Learn by building{' '}
                <span style={{ color: 'var(--ds-color-text-accent-default)' }}>
                  real things
                </span>
              </Heading>
              <Text color="subtle">
                Hands-on courses for product teams. Ship faster, build better, and grow with
                intention.
              </Text>
            </Stack>
            <Inline gap="md">
              <Button>Start learning</Button>
              <Button variant="outlined">Browse courses</Button>
            </Inline>
          </Stack>
        </div>
      </Box>

      {/* Continue learning */}
      <Box paddingY="xl">
        <div className="container">
          <Stack gap="lg">
            <Heading size="headline">Continue learning</Heading>
            <Inline gap="xl" align="start" wrap={false}>
              <Stack gap="md" style={{ flex: 1 }}>
                <CardHorizontal
                  title="Design Systems in Practice"
                  duration="Token architecture · 4 hours, 30min"
                  progress={65}
                />
                <CardHorizontal
                  title="Component-Driven Development"
                  duration="React + Vite · 3 hours, 15min"
                  progress={20}
                />
              </Stack>
              <Stack gap="md" style={{ flex: 1 }}>
                <CardHorizontal
                  title="Accessibility in Design Systems"
                  duration="ARIA & focus management · 2 hours, 45min"
                  progress={80}
                />
                <CardHorizontal
                  title="Typography & Spacing Tokens"
                  duration="Style Dictionary · 1 hour, 50min"
                  progress={10}
                />
              </Stack>
            </Inline>
          </Stack>
        </div>
      </Box>

      {/* Disclaimer */}
      <Box paddingY="lg">
        <div className="container">
          <Divider />
          <Box paddingY="md">
            <Text size="body-small" color="subtle">
              Course descriptions are curated for learning purposes. Durations are approximate.
              All content is subject to availability.
            </Text>
          </Box>
        </div>
      </Box>
    </Box>
  ),
}
