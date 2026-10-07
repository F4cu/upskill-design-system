import type { Meta, StoryObj } from '@storybook/react'
import { Heading } from './index'
import { Stack } from '../Stack'
import { Text } from '../Text'

const meta = {
  title: 'Typography/Heading',
  component: Heading,
  argTypes: {
    size: {
      control: 'select',
      options: ['title-small', 'subheader', 'headline', 'headline-serif', 'display'],
    },
    color: {
      control: 'select',
      options: [undefined, 'default', 'subtle', 'brand'],
    },
    as: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    },
  },
} satisfies Meta<typeof Heading>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    size: 'headline',
    children: 'Design systems that scale',
  },
}

export const SizeScale: Story = {
  render: () => (
    <Stack gap="lg">
      {(['display', 'headline-serif', 'headline', 'subheader', 'title-small'] as const).map((size) => (
        <div key={size}>
          <Text as="span" color="subtle" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{size}</Text>
          <Heading size={size}>Design systems that scale</Heading>
        </div>
      ))}
    </Stack>
  ),
}

export const Colors: Story = {
  render: () => (
    <Stack gap="md">
      {(['default', 'subtle', 'brand'] as const).map((color) => (
        <Heading key={color} color={color} size="headline">
          color=&quot;{color}&quot; heading
        </Heading>
      ))}
    </Stack>
  ),
}
