import type { Meta, StoryObj } from '@storybook/react'
import { Icon } from './index'
import type { IconName } from './index'
import { Text } from '../Text'

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
  args: {
    name: 'search',
  },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
      {allIcons.map((name) => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <Icon name={name} size="md" />
          <Text as="span" color="subtle" style={{ fontFamily: 'monospace', fontSize: '0.625rem' }}>
            {name}
          </Text>
        </div>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  args: {
    name: 'search',
  },
  render: () => (
    <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
      {(['sm', 'md'] as const).map((size) => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Icon name="search" size={size} />
          <Text as="span" color="subtle" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {size}
          </Text>
        </div>
      ))}
    </div>
  ),
}

export const InheritColor: Story = {
  args: {
    name: 'heart',
  },
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Text as="span" color="default"><Icon name="heart" size="md" /></Text>
      <Text as="span" color="brand"><Icon name="heart" size="md" /></Text>
      <Text as="span" color="subtle"><Icon name="heart" size="md" /></Text>
      <Text as="span" color="disabled"><Icon name="heart" size="md" /></Text>
    </div>
  ),
}
