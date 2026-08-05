import type { Meta, StoryObj } from '@storybook/react'
import { TextLink } from './index'
import { Text } from '../Text'

const meta: Meta<typeof TextLink> = {
  title: 'Components/TextLink',
  component: TextLink,
  argTypes: {
    size: {
      control: 'select',
      options: ['body-default', 'body-small', 'metadata', 'label'],
    },
    children: { control: 'text' },
    href: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof TextLink>

export const Default: Story = {
  args: {
    href: '#',
    children: 'Edward Clark',
    size: 'body-default',
  },
}

export const BodySmall: Story = {
  args: {
    href: '#',
    children: 'Edward Clark',
    size: 'body-small',
  },
}

export const Metadata: Story = {
  args: {
    href: '#',
    children: 'Edward Clark',
    size: 'metadata',
  },
}

export const InlineWithText: Story = {
  render: () => (
    <Text
      as="p"
      color="subtle"
      style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-body-default)', lineHeight: 'var(--ds-font-line-height-relaxed)', margin: 0 }}
    >
      <TextLink href="#">Edward Clark</TextLink>
      {', Author and educator, MICA'}
    </Text>
  ),
}
