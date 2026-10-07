import type { Meta, StoryObj } from '@storybook/react'
import { Text } from './index'
import { Stack } from '../Stack'

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
    <Stack gap="md">
      {(['body-default', 'body-small', 'metadata', 'label'] as const).map((size) => (
        <div key={size}>
          <Text as="span" color="subtle" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{size}</Text>
          <Text size={size}>The quick brown fox jumps over the lazy dog.</Text>
        </div>
      ))}
    </Stack>
  ),
}

export const Colors: Story = {
  render: () => (
    <Stack gap="sm">
      {(['default', 'subtle', 'brand', 'disabled'] as const).map((color) => (
        <Text key={color} color={color}>
          color=&quot;{color}&quot; — The quick brown fox jumps over the lazy dog.
        </Text>
      ))}
    </Stack>
  ),
}
