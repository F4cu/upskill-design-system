import type { Meta, StoryObj } from '@storybook/react'
import { Box } from '../Box'
import { Stack } from './index'
import styles from './Stack.stories.module.css'

const Swatch = ({ label }: { label: string }) => (
  <Box
    background="elevated"
    paddingX="sm"
    paddingY="xs"
    style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}
  >
    {label}
  </Box>
)

const meta = {
  title: 'Layout/Stack',
  component: Stack,
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
    fullWidth: { control: 'boolean' },
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

export const AsOrderedList: Story = {
  render: () => (
    <Stack as="ol" gap="sm" style={{ paddingLeft: '1.25rem' }}>
      <li><Swatch label="First item" /></li>
      <li><Swatch label="Second item" /></li>
      <li><Swatch label="Third item" /></li>
    </Stack>
  ),
}

export const FullWidth: Story = {
  render: () => (
    <Box className={styles.demoSurface} padding="md">
      <Stack gap="sm" fullWidth align="end">
        <Swatch label="Aligned to right edge" />
        <Swatch label="Also right" />
      </Stack>
    </Box>
  ),
}

export const AlignCenter: Story = {
  args: {
    gap: 'sm',
    align: 'center',
    children: (
      <>
        <Swatch label="Short" />
        <Box
          background="elevated"
          paddingY="xs"
          style={{ paddingLeft: '48px', paddingRight: '48px', fontSize: '0.75rem', fontFamily: 'monospace' }}
        >
          Wider item
        </Box>
        <Swatch label="Short" />
      </>
    ),
  },
}
