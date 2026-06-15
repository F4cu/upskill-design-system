import type { Meta, StoryObj } from '@storybook/react'
import { Heading } from './index'

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {(['display', 'headline-serif', 'headline', 'subheader', 'title-small'] as const).map((size) => (
        <div key={size}>
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--ds-color-text-subtle)' }}>{size}</span>
          <Heading size={size}>Design systems that scale</Heading>
        </div>
      ))}
    </div>
  ),
}

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {(['default', 'subtle', 'brand'] as const).map((color) => (
        <Heading key={color} color={color} size="headline">
          color=&quot;{color}&quot; heading
        </Heading>
      ))}
    </div>
  ),
}
