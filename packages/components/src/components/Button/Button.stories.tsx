import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './index'
import { Inline } from '../Inline'
import { Stack } from '../Stack'

const meta = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'radio',
      options: ['accent', 'neutral', 'transparent', 'danger'],
      table: { type: { summary: "'accent' | 'neutral' | 'transparent' | 'danger'" } },
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      table: { type: { summary: "'sm' | 'md' | 'lg'" } },
    },
    shape: {
      control: 'radio',
      options: [undefined, 'square', 'round'],
      table: { type: { summary: "'square' | 'round'" } },
    },
    icon: {
      control: 'select',
      options: [
        undefined,
        'search', 'plus', 'download', 'bookmark', 'heart', 'more-vertical',
        'chevron-right', 'chevron-left', 'zap', 'lightbulb',
      ],
      table: { type: { summary: 'IconName' } },
    },
    trailingIcon: {
      control: 'select',
      options: [
        undefined,
        'search', 'plus', 'download', 'bookmark', 'heart', 'more-vertical',
        'chevron-right', 'chevron-left', 'zap', 'lightbulb',
      ],
      table: { type: { summary: 'IconName' } },
    },
    children: {
      control: 'text',
      table: { type: { summary: 'React.ReactNode' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Prevents interaction and signals unavailability. Prefer guiding users toward a valid action over disabling when possible.',
      table: { type: { summary: 'boolean' } },
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    variant: 'neutral',
    size: 'md',
    children: 'Button',
  },
}

export const Variants: Story = {
  render: () => (
    <Inline gap="md" align="center">
      <Button variant="accent">Accent</Button>
      <Button variant="neutral">Neutral</Button>
      <Button variant="transparent">Transparent</Button>
      <Button variant="danger">Danger</Button>
    </Inline>
  ),
}

export const ByContext: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Variants name a fixed weight; the container decides which weight an action gets (ADR-024). The same "lead" action is `accent` in a decision region but `neutral` inside a repeated card.',
      },
    },
  },
  render: () => (
    <Stack gap="md">
      <Inline gap="md" align="center">
        <Button variant="neutral">Cancel</Button>
        <Button variant="accent">Save changes</Button>
      </Inline>
      <Inline gap="md" align="center">
        <Button variant="neutral" size="sm">Resume</Button>
        <Button variant="transparent" size="sm">Details</Button>
      </Inline>
      <Inline gap="md" align="center">
        <Button variant="neutral">Cancel</Button>
        <Button variant="danger">Delete account</Button>
      </Inline>
    </Stack>
  ),
}

export const Sizes: Story = {
  render: () => (
    <Inline gap="md" align="center">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </Inline>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <Inline gap="md" align="center">
      <Button icon="search">Search</Button>
      <Button icon="download">Download</Button>
      <Button icon="plus">Add item</Button>
      <Button variant="accent" icon="bookmark">Save</Button>
    </Inline>
  ),
}

export const TransparentToggle: Story = {
  render: () => (
    <Inline gap="xs" align="center">
      <Button variant="transparent" size="sm" trailingIcon="chevron-down">Show more</Button>
      <Button variant="transparent" size="sm" trailingIcon="chevron-up">Show less</Button>
    </Inline>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Inline gap="md" align="center">
      <Button variant="accent" disabled>Accent disabled</Button>
      <Button variant="neutral" disabled>Neutral disabled</Button>
      <Button variant="transparent" disabled>Transparent disabled</Button>
      <Button variant="danger" disabled>Danger disabled</Button>
    </Inline>
  ),
}

export const IconOnly: Story = {
  render: () => (
    <Stack gap="md">
      {(['square', 'round'] as const).map((shape) => (
        <Inline key={shape} gap="md" align="center">
          {(['accent', 'neutral'] as const).map((variant) =>
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
        </Inline>
      ))}
    </Stack>
  ),
}

export const AllCombinations: Story = {
  render: () => (
    <Stack gap="md">
      {(['accent', 'neutral', 'transparent', 'danger'] as const).map((variant) => (
        <Inline key={variant} gap="md" align="center">
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
        </Inline>
      ))}
    </Stack>
  ),
}
