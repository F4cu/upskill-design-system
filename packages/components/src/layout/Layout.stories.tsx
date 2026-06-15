import type { Meta, StoryObj } from '@storybook/react'
import { Box } from '../components/Box'
import { Stack } from '../components/Stack'
import { Inline } from '../components/Inline'
import '../styles/grid.css'

const meta = {
  title: 'Layout/Grid',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const PlaceholderCard = ({ title, body }: { title: string; body: string }) => (
  <Box
    padding="lg"
    style={{ background: 'var(--ds-color-background-container-elevated)', borderRadius: '8px', height: '100%' }}
  >
    <Stack gap="xs">
      <div style={{ fontFamily: 'var(--ds-font-family-headline-default)', fontWeight: 'var(--ds-font-weight-semibold)', fontSize: 'var(--ds-font-size-title-small)' }}>
        {title}
      </div>
      <div style={{ fontSize: 'var(--ds-font-size-body-default)', color: 'var(--ds-color-text-subtle)', lineHeight: 'var(--ds-font-line-height-body-default)' }}>
        {body}
      </div>
    </Stack>
  </Box>
)

export const PageSection: Story = {
  render: () => (
    <Box style={{ background: 'var(--ds-color-background-container-page)', minHeight: '100vh' }}>
      {/* Page header */}
      <Box
        style={{ background: 'var(--ds-color-background-container-default)', borderBottom: '1px solid var(--ds-color-background-neutral-subtle)' }}
        paddingY="md"
      >
        <div className="container">
          <Inline justify="space-between" align="center">
            <span style={{ fontFamily: 'var(--ds-font-family-headline-default)', fontWeight: 'var(--ds-font-weight-bold)', fontSize: 'var(--ds-font-size-subheader)', color: 'var(--ds-color-text-brand)' }}>
              UpSkill
            </span>
            <Inline gap="md">
              <span style={{ fontSize: 'var(--ds-font-size-body-default)', color: 'var(--ds-color-text-subtle)' }}>Dashboard</span>
              <span style={{ fontSize: 'var(--ds-font-size-body-default)', color: 'var(--ds-color-text-subtle)' }}>Courses</span>
              <span style={{ fontSize: 'var(--ds-font-size-body-default)', color: 'var(--ds-color-text-subtle)' }}>Profile</span>
            </Inline>
          </Inline>
        </div>
      </Box>

      {/* Hero */}
      <Box paddingY="xxl">
        <div className="container">
          <Stack gap="md" align="center" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--ds-font-family-headline-serif)', fontWeight: 'var(--ds-font-weight-bold)', fontSize: 'var(--ds-font-size-display)', lineHeight: 'var(--ds-font-line-height-display-default)' }}>
              Learn by building real things
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-subheader)', color: 'var(--ds-color-text-subtle)', lineHeight: 'var(--ds-font-line-height-subheader-default)', maxWidth: '40ch' }}>
              Hands-on courses for product teams. Ship faster, build better.
            </div>
            <Inline gap="sm" justify="center">
              <div style={{ background: 'var(--ds-color-background-button-default)', color: '#fff', padding: 'var(--ds-space-inset-sm) var(--ds-space-inset-xl)', borderRadius: '6px', fontSize: 'var(--ds-font-size-label)', cursor: 'pointer' }}>
                Start learning
              </div>
              <div style={{ border: '1px solid var(--ds-color-background-button-default)', color: 'var(--ds-color-text-brand)', padding: 'var(--ds-space-inset-sm) var(--ds-space-inset-xl)', borderRadius: '6px', fontSize: 'var(--ds-font-size-label)', cursor: 'pointer' }}>
                Browse courses
              </div>
            </Inline>
          </Stack>
        </div>
      </Box>

      {/* Feature grid */}
      <Box paddingY="xl">
        <div className="container">
          <Stack gap="lg">
            <div style={{ fontFamily: 'var(--ds-font-family-headline-default)', fontWeight: 'var(--ds-font-weight-bold)', fontSize: 'var(--ds-font-size-headline)' }}>
              What you'll build
            </div>
            <div className="grid" style={{ rowGap: 'var(--ds-space-stack-md)' }}>
              <div style={{ gridColumn: 'span 4' }}>
                <PlaceholderCard title="Design Systems" body="Token architecture, component APIs, and documentation strategies." />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <PlaceholderCard title="Frontend Architecture" body="Monorepos, build pipelines, and scalable CSS patterns." />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <PlaceholderCard title="Product Thinking" body="Scope, trade-offs, and shipping with confidence." />
              </div>
            </div>
          </Stack>
        </div>
      </Box>
    </Box>
  ),
}
