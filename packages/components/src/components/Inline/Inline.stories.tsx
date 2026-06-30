import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { Inline } from './index'

const Chip = ({ label }: { label: string }) => (
  <div
    style={{
      background: 'var(--ds-color-background-container-elevated)',
      padding: '4px 12px',
      borderRadius: '100px',
      fontSize: '0.75rem',
      fontFamily: 'monospace',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </div>
)

const meta = {
  title: 'Layout/Inline',
  component: Inline,
  argTypes: {
    as: { control: 'text' },
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
    wrap: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
} satisfies Meta<typeof Inline>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    gap: 'sm',
    children: (
      <>
        <Chip label="First" />
        <Chip label="Second" />
        <Chip label="Third" />
      </>
    ),
  },
}

export const GapScale: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {(['xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const).map((gap) => (
        <div key={gap}>
          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '4px' }}>gap="{gap}"</div>
          <Inline gap={gap}>
            <Chip label="Alpha" />
            <Chip label="Beta" />
            <Chip label="Gamma" />
          </Inline>
        </div>
      ))}
    </div>
  ),
}

export const SpaceBetween: Story = {
  args: {
    gap: 'sm',
    justify: 'space-between',
    children: (
      <>
        <Chip label="Left" />
        <Chip label="Center" />
        <Chip label="Right" />
      </>
    ),
  },
}

export const JustifyEnd: Story = {
  render: () => (
    <div style={{ width: '400px', background: 'var(--ds-color-background-neutral-subtle)', padding: '16px', borderRadius: '4px' }}>
      <Inline fullWidth justify="end" gap="sm">
        <Button variant="outlined" shape="square" icon="bookmark" aria-label="Bookmark" />
        <Button variant="default">Add to your cart</Button>
      </Inline>
    </div>
  ),
}

export const Wrapping: Story = {
  render: () => (
    <div style={{ width: '300px', border: '1px dashed var(--ds-color-background-neutral-subtle)', padding: '8px' }}>
      <Inline gap="xs" wrap={true}>
        {Array.from({ length: 10 }, (_, i) => (
          <Chip key={i} label={`Tag ${i + 1}`} />
        ))}
      </Inline>
    </div>
  ),
}
