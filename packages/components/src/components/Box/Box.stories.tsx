import type { Meta, StoryObj } from '@storybook/react'
import { Box } from './index'
import { Stack } from '../Stack'

const meta = {
  title: 'Layout/Box',
  component: Box,
  argTypes: {
    as: { control: 'text' },
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
    overflow: {
      control: 'select',
      options: [undefined, 'hidden', 'auto', 'scroll', 'visible', 'clip'],
    },
    minWidth: { control: 'text' },
    maxWidth: { control: 'text' },
    background: {
      control: 'select',
      options: [undefined, 'default', 'inverted', 'transparent', 'elevated'],
    },
    borderTop: {
      control: 'select',
      options: [undefined, 'default', 'inverted'],
    },
  },
} satisfies Meta<typeof Box>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    padding: 'md',
    background: 'elevated',
    children: 'Box with md padding',
  },
}

export const PaddingScale: Story = {
  render: () => (
    <Stack gap="sm">
      {(['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'] as const).map((size) => (
        <Box key={size} padding={size} background="elevated">
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>padding="{size}"</span>
        </Box>
      ))}
    </Stack>
  ),
}

export const MaxWidthContainer: Story = {
  render: () => (
    <Box maxWidth="32rem" padding="md" background="elevated">
      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>maxWidth="32rem" — content measure constraint</span>
    </Box>
  ),
}

export const AsSection: Story = {
  args: {
    as: 'section',
    padding: 'lg',
    background: 'elevated',
    children: 'Rendered as <section>',
  },
}

export const FooterSeparator: Story = {
  args: {
    as: 'footer',
    padding: 'md',
    background: 'inverted',
    borderTop: 'inverted',
    children: 'Inverted footer with a top border separating it from the section above',
  },
}
