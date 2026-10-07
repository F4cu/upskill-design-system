import type { Meta, StoryObj } from '@storybook/react'
import { Icon } from './index'
import { Stack } from '../Stack'
import { Inline } from '../Inline'
import type { IconName } from './index'
import { Text } from '../Text'

const allIcons: IconName[] = [
  'chevron-right',
  'chevron-left',
  'chevron-down',
  'chevron-up',
  'badge-check',
  'check',
  'award',
  'bookmark',
  'search',
  'plus',
  'minus',
  'heart',
  'menu',
  'more-vertical',
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
    <Inline gap="lg" align="center">
      {allIcons.map((name) => (
        <Stack key={name} gap="xs" align="center">
          <Icon name={name} size="md" />
          <Text as="span" color="subtle" style={{ fontFamily: 'monospace', fontSize: '0.625rem' }}>
            {name}
          </Text>
        </Stack>
      ))}
    </Inline>
  ),
}

export const Sizes: Story = {
  args: {
    name: 'search',
  },
  render: () => (
    <Inline gap="xl" align="center">
      {(['sm', 'md'] as const).map((size) => (
        <Stack key={size} gap="sm" align="center">
          <Icon name="search" size={size} />
          <Text as="span" color="subtle" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {size}
          </Text>
        </Stack>
      ))}
    </Inline>
  ),
}

export const InheritColor: Story = {
  args: {
    name: 'heart',
  },
  render: () => (
    <Inline gap="md" align="center">
      <Text as="span" color="default"><Icon name="heart" size="md" /></Text>
      <Text as="span" color="brand"><Icon name="heart" size="md" /></Text>
      <Text as="span" color="subtle"><Icon name="heart" size="md" /></Text>
      <Text as="span" color="disabled"><Icon name="heart" size="md" /></Text>
    </Inline>
  ),
}
