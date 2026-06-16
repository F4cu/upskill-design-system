import type { Meta, StoryObj } from '@storybook/react'
import { Card } from './index'
import { Stack } from '../Stack'
import { Heading } from '../Heading'
import { Text } from '../Text'
import { Button } from '../Button'

const meta = {
  title: 'Components/Card',
  component: Card,
  argTypes: {
    variant: {
      control: 'radio',
      options: ['default', 'elevated'],
    },
    padding: {
      control: 'radio',
      options: ['none', 'sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    variant: 'default',
    padding: 'md',
    children: (
      <Stack gap="sm">
        <Heading as="h3" size="title-small">Card title</Heading>
        <Text color="subtle">Supporting text that describes the card content.</Text>
      </Stack>
    ),
  },
}

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    padding: 'md',
    children: (
      <Stack gap="sm">
        <Heading as="h3" size="title-small">Elevated card</Heading>
        <Text color="subtle">Raised surface for featured or selected content.</Text>
      </Stack>
    ),
  },
}

export const WithAction: Story = {
  render: () => (
    <Card>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading as="h3" size="title-small">Introduction to UX Design</Heading>
          <Text size="body-small" color="subtle">12 lessons · 3 hours</Text>
        </Stack>
        <Text>Learn the core principles of user experience design, from research to wireframing and prototyping.</Text>
        <Button size="sm">Start course</Button>
      </Stack>
    </Card>
  ),
}

export const PaddingVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {(['none', 'sm', 'md', 'lg'] as const).map((padding) => (
        <Card key={padding} padding={padding}>
          <Text size="body-small" color="subtle">padding="{padding}"</Text>
        </Card>
      ))}
    </div>
  ),
}

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <Card style={{ flex: 1 }}>
        <Stack gap="xs">
          <Heading as="h3" size="title-small">Default</Heading>
          <Text color="subtle">Flat surface for grouping content.</Text>
        </Stack>
      </Card>
      <Card variant="elevated" style={{ flex: 1 }}>
        <Stack gap="xs">
          <Heading as="h3" size="title-small">Elevated</Heading>
          <Text color="subtle">Raised surface for featured content.</Text>
        </Stack>
      </Card>
    </div>
  ),
}
