import type { Meta, StoryObj } from '@storybook/react'
import { Stack } from './index'

const Swatch = ({ label }: { label: string }) => (
  <div
    style={{
      background: 'var(--ds-color-background-container-elevated)',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontFamily: 'monospace',
    }}
  >
    {label}
  </div>
)

const meta = {
  title: 'Layout/Stack',
  component: Stack,
  argTypes: {
    gap: {
      control: 'select',
      options: [undefined, 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
    },
    align: {
      control: 'select',
      options: [undefined, 'start', 'center', 'end', 'stretch', 'baseline'],
    },
    justify: {
      control: 'select',
      options: [undefined, 'start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'],
    },
  },
} satisfies Meta<typeof Stack>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    gap: 'md',
    children: (
      <>
        <Swatch label="Item 1" />
        <Swatch label="Item 2" />
        <Swatch label="Item 3" />
      </>
    ),
  },
}

export const GapScale: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '32px' }}>
      {(['xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const).map((gap) => (
        <div key={gap}>
          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '8px' }}>gap="{gap}"</div>
          <Stack gap={gap}>
            <Swatch label="A" />
            <Swatch label="B" />
            <Swatch label="C" />
          </Stack>
        </div>
      ))}
    </div>
  ),
}

export const AlignCenter: Story = {
  args: {
    gap: 'sm',
    align: 'center',
    children: (
      <>
        <Swatch label="Short" />
        <div style={{ background: 'var(--ds-color-background-container-elevated)', padding: '8px 48px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
          Wider item
        </div>
        <Swatch label="Short" />
      </>
    ),
  },
}
