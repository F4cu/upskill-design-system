import type { Meta, StoryObj } from '@storybook/react'
import { TextField } from './index'
import { Box } from '../Box'
import { Card } from '../Card'
import { Heading } from '../Heading'
import { Inline } from '../Inline'
import { Select } from '../Select'
import { Stack } from '../Stack'

const TIMEZONE_OPTIONS = [
  { value: 'utc', label: 'UTC' },
  { value: 'us-east', label: 'US Eastern (UTC−5)' },
  { value: 'eu-central', label: 'EU Central (UTC+1)' },
]

const meta: Meta<typeof TextField> = {
  title: 'Components/TextField/Patterns',
  component: TextField,
}

export default meta
type Story = StoryObj<typeof TextField>

export const FormFieldStack: Story = {
  render: () => (
    <Card>
      <Stack gap="lg">
        <Heading as="h3" size="title-small">Profile</Heading>
        <TextField label="Display name" defaultValue="Jane Smith" />
        <TextField label="Email" type="email" defaultValue="jane.smith@example.com" />
        <Select label="Time zone" options={TIMEZONE_OPTIONS} defaultValue="us-east" />
      </Stack>
    </Card>
  ),
}

export const InlineNameRow: Story = {
  render: () => (
    <Inline gap="md" align="start">
      <Box grow={1}>
        <TextField label="First name" />
      </Box>
      <Box grow={1}>
        <TextField label="Last name" />
      </Box>
    </Inline>
  ),
}
