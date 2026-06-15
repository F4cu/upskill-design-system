import type { Meta, StoryObj } from '@storybook/react'
import { Text } from './index'

const meta = {
  title: 'Typography/Text',
  component: Text,
  argTypes: {
    size: {
      control: 'select',
      options: ['body-default', 'body-small', 'metadata', 'label'],
    },
    color: {
      control: 'select',
      options: [undefined, 'default', 'subtle', 'brand', 'disabled'],
    },
    as: { control: 'text' },
  },
} satisfies Meta<typeof Text>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    size: 'body-default',
    children: 'The quick brown fox jumps over the lazy dog.',
  },
}

export const SizeScale: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {(['body-default', 'body-small', 'metadata', 'label'] as const).map((size) => (
        <div key={size}>
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--ds-color-text-subtle)' }}>{size}</span>
          <Text size={size}>The quick brown fox jumps over the lazy dog.</Text>
        </div>
      ))}
    </div>
  ),
}

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {(['default', 'subtle', 'brand', 'disabled'] as const).map((color) => (
        <Text key={color} color={color}>
          color=&quot;{color}&quot; — The quick brown fox jumps over the lazy dog.
        </Text>
      ))}
    </div>
  ),
}
