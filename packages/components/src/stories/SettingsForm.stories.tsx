import type { Meta, StoryObj } from '@storybook/react'
import { Box } from '../components/Box'
import { Stack } from '../components/Stack'
import { Inline } from '../components/Inline'
import { Heading } from '../components/Heading'
import { Text } from '../components/Text'
import { Card } from '../components/Card'
import { TextField } from '../components/TextField'
import { Select } from '../components/Select'
import { Checkbox } from '../components/Checkbox'
import { Button } from '../components/Button'

const TIMEZONE_OPTIONS = [
  { value: 'utc', label: 'UTC' },
  { value: 'us-east', label: 'US Eastern (UTC−5)' },
  { value: 'us-west', label: 'US Pacific (UTC−8)' },
  { value: 'eu-central', label: 'EU Central (UTC+1)' },
  { value: 'asia-tokyo', label: 'Asia/Tokyo (UTC+9)' },
]

function SettingsForm() {
  return (
    <Box
      padding="xl"
      style={{
        background: 'var(--ds-color-background-container-page)',
        minHeight: '100vh',
      }}
    >
      <Stack gap="xl" style={{ maxWidth: '640px', margin: '0 auto' }}>
        <Stack gap="xs">
          <Heading size="headline">Account Settings</Heading>
          <Text color="subtle">Manage your profile and notification preferences.</Text>
        </Stack>

        <Card>
          <Stack gap="lg">
            <Heading as="h3" size="title-small">Profile</Heading>
            <Inline gap="md" align="start">
              <Box style={{ flex: 1 }}>
                <TextField label="First name" placeholder="Jane" />
              </Box>
              <Box style={{ flex: 1 }}>
                <TextField label="Last name" placeholder="Smith" />
              </Box>
            </Inline>
            <TextField
              label="Email"
              type="email"
              placeholder="jane@example.com"
              defaultValue="jane.smith@example.com"
            />
            <Select
              label="Time zone"
              options={TIMEZONE_OPTIONS}
              defaultValue="us-east"
            />
          </Stack>
        </Card>

        <Card>
          <Stack gap="lg">
            <Stack gap="xs">
              <Heading as="h3" size="title-small">Notifications</Heading>
              <Text size="body-small" color="subtle">
                Choose which emails you receive. You can change these at any time.
              </Text>
            </Stack>
            <Stack gap="md">
              <Checkbox label="Email me when a course is updated" defaultChecked />
              <Checkbox label="Send weekly progress digests" defaultChecked />
              <Checkbox label="Notify me about new content in enrolled tracks" />
              <Checkbox label="Managed by your organisation" disabled defaultChecked />
            </Stack>
          </Stack>
        </Card>

        <Inline gap="md" justify="end">
          <Button variant="outlined">Cancel</Button>
          <Button>Save changes</Button>
        </Inline>
      </Stack>
    </Box>
  )
}

function SettingsFormWithErrors() {
  return (
    <Box
      padding="xl"
      style={{
        background: 'var(--ds-color-background-container-page)',
        minHeight: '100vh',
      }}
    >
      <Stack gap="xl" style={{ maxWidth: '640px', margin: '0 auto' }}>
        <Stack gap="xs">
          <Heading size="headline">Account Settings</Heading>
          <Text color="subtle">Manage your profile and notification preferences.</Text>
        </Stack>

        <Card>
          <Stack gap="lg">
            <Heading as="h3" size="title-small">Profile</Heading>
            <Inline gap="md" align="start">
              <Box style={{ flex: 1 }}>
                <TextField label="First name" placeholder="Jane" error="First name is required." />
              </Box>
              <Box style={{ flex: 1 }}>
                <TextField label="Last name" placeholder="Smith" />
              </Box>
            </Inline>
            <TextField
              label="Email"
              type="email"
              defaultValue="not-an-email"
              error="Enter a valid email address."
            />
            <Select
              label="Time zone"
              options={TIMEZONE_OPTIONS}
              placeholder="Select a time zone"
              error="Please select a time zone."
            />
          </Stack>
        </Card>

        <Inline gap="md" justify="end">
          <Button variant="outlined">Cancel</Button>
          <Button>Save changes</Button>
        </Inline>
      </Stack>
    </Box>
  )
}

const meta = {
  title: 'Layout/Examples/Settings Form',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => <SettingsForm />,
  tags: ['!dev'],
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `
<Stack gap="xl" style={{ maxWidth: '640px', margin: '0 auto' }}>
  <Stack gap="xs">
    <Heading size="headline">Account Settings</Heading>
    <Text color="subtle">Manage your profile and notification preferences.</Text>
  </Stack>

  <Card>
    <Stack gap="lg">
      <Heading as="h3" size="title-small">Profile</Heading>
      <Inline gap="md" align="start">
        <Box style={{ flex: 1 }}>
          <TextField label="First name" placeholder="Jane" />
        </Box>
        <Box style={{ flex: 1 }}>
          <TextField label="Last name" placeholder="Smith" />
        </Box>
      </Inline>
      <TextField label="Email" type="email" placeholder="jane@example.com" defaultValue="jane.smith@example.com" />
      <Select label="Time zone" options={TIMEZONE_OPTIONS} defaultValue="us-east" />
    </Stack>
  </Card>

  <Card>
    <Stack gap="lg">
      <Stack gap="xs">
        <Heading as="h3" size="title-small">Notifications</Heading>
        <Text size="body-small" color="subtle">
          Choose which emails you receive. You can change these at any time.
        </Text>
      </Stack>
      <Stack gap="md">
        <Checkbox label="Email me when a course is updated" defaultChecked />
        <Checkbox label="Send weekly progress digests" defaultChecked />
        <Checkbox label="Notify me about new content in enrolled tracks" />
        <Checkbox label="Managed by your organisation" disabled defaultChecked />
      </Stack>
    </Stack>
  </Card>

  <Inline gap="md" justify="end">
    <Button variant="outlined">Cancel</Button>
    <Button>Save changes</Button>
  </Inline>
</Stack>
`.trim(),
      },
    },
  },
}

export const WithValidationErrors: Story = {
  render: () => <SettingsFormWithErrors />,
  tags: ['!dev'],
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `
<Card>
  <Stack gap="lg">
    <Heading as="h3" size="title-small">Profile</Heading>
    <Inline gap="md" align="start">
      <Box style={{ flex: 1 }}>
        <TextField label="First name" placeholder="Jane" error="First name is required." />
      </Box>
      <Box style={{ flex: 1 }}>
        <TextField label="Last name" placeholder="Smith" />
      </Box>
    </Inline>
    <TextField
      label="Email"
      type="email"
      defaultValue="not-an-email"
      error="Enter a valid email address."
    />
    <Select
      label="Time zone"
      options={TIMEZONE_OPTIONS}
      placeholder="Select a time zone"
      error="Please select a time zone."
    />
  </Stack>
</Card>
`.trim(),
      },
    },
  },
}
