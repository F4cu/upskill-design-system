import type { Meta, StoryObj } from '@storybook/react'
import { Box } from './index'

const meta = {
  title: 'Layout/Box',
  component: Box,
  argTypes: {
    padding: {
      control: 'select',
      options: [undefined, 'xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'],
    },
    paddingX: {
      control: 'select',
      options: [undefined, 'xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'],
    },
    paddingY: {
      control: 'select',
      options: [undefined, 'xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'],
    },
    as: { control: 'text' },
  },
} satisfies Meta<typeof Box>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    padding: 'md',
    children: 'Box with md padding',
  },
  render: (args) => (
    <Box {...args} style={{ background: 'var(--ds-color-background-container-elevated)', borderRadius: '4px' }} />
  ),
}

export const PaddingScale: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {(['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'] as const).map((size) => (
        <Box
          key={size}
          padding={size}
          style={{ background: 'var(--ds-color-background-container-elevated)', borderRadius: '4px' }}
        >
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>padding="{size}"</span>
        </Box>
      ))}
    </div>
  ),
}

export const AsSection: Story = {
  args: {
    as: 'section',
    padding: 'lg',
    children: 'Rendered as <section>',
  },
  render: (args) => (
    <Box {...args} style={{ background: 'var(--ds-color-background-container-elevated)', borderRadius: '4px' }} />
  ),
}
