import type { Meta, StoryObj } from '@storybook/react'
import { Icon } from './index'
import type { IconName } from './index'

const allIcons: IconName[] = [
  'chevron-right',
  'chevron-left',
  'chevron-down',
  'chevron-up',
  'badge-check',
  'award',
  'bookmark',
  'search',
  'plus',
  'minus',
  'heart',
  'menu',
  'sun',
  'moon-star',
  'download',
  'file-down',
  'zap',
  'lightbulb',
  'pen-tool',
  'image',
]

const meta = {
  title: 'Components/Icon',
  component: Icon,
  argTypes: {
    name: {
      control: 'select',
      options: allIcons,
    },
    size: {
      control: 'radio',
      options: ['sm', 'md'],
    },
    label: { control: 'text' },
  },
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'search',
    size: 'md',
  },
}

export const AllIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
      {allIcons.map((name) => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <Icon name={name} size="md" />
          <span style={{ fontFamily: 'monospace', fontSize: '0.625rem', color: 'var(--ds-color-text-subtle)' }}>
            {name}
          </span>
        </div>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
      {(['sm', 'md'] as const).map((size) => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Icon name="search" size={size} />
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--ds-color-text-subtle)' }}>
            {size}
          </span>
        </div>
      ))}
    </div>
  ),
}

export const InheritColor: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <span style={{ color: 'var(--ds-color-text-default)' }}><Icon name="heart" size="md" /></span>
      <span style={{ color: 'var(--ds-color-text-brand)' }}><Icon name="heart" size="md" /></span>
      <span style={{ color: 'var(--ds-color-text-subtle)' }}><Icon name="heart" size="md" /></span>
      <span style={{ color: 'var(--ds-color-text-disabled)' }}><Icon name="heart" size="md" /></span>
    </div>
  ),
}
