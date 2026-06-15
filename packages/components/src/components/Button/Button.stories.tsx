import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './index'

const meta = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: { control: 'radio', options: ['default', 'outlined'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    shape: { control: 'radio', options: [undefined, 'square', 'round'] },
    icon: {
      control: 'select',
      options: [
        undefined,
        'search', 'plus', 'download', 'bookmark', 'heart',
        'chevron-right', 'chevron-left', 'zap', 'lightbulb',
      ],
    },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    variant: 'default',
    size: 'md',
    children: 'Button',
  },
}

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Button variant="default">Default</Button>
      <Button variant="outlined">Outlined</Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <Button icon="search">Search</Button>
      <Button icon="download">Download</Button>
      <Button icon="plus">Add item</Button>
      <Button variant="outlined" icon="bookmark">Save</Button>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Button disabled>Default disabled</Button>
      <Button variant="outlined" disabled>Outlined disabled</Button>
    </div>
  ),
}

export const IconOnly: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {(['square', 'round'] as const).map((shape) => (
        <div key={shape} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {(['default', 'outlined'] as const).map((variant) =>
            (['sm', 'md', 'lg'] as const).map((size) => (
              <Button
                key={`${shape}-${variant}-${size}`}
                shape={shape}
                variant={variant}
                size={size}
                icon="search"
                aria-label="Search"
              />
            ))
          )}
        </div>
      ))}
    </div>
  ),
}

export const AllCombinations: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {(['default', 'outlined'] as const).map((variant) => (
        <div key={variant} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Button key={size} variant={variant} size={size} icon="search">
              {size}
            </Button>
          ))}
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Button key={`${size}-disabled`} variant={variant} size={size} disabled>
              {size}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
}
