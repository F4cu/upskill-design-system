import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './index'
import { Card } from '../Card'
import { Heading } from '../Heading'
import { Stack } from '../Stack'

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox/Patterns',
  component: Checkbox,
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const NotificationPreferences: Story = {
  render: () => (
    <Card>
      <Stack gap="lg">
        <Heading as="h3" size="title-small">Notifications</Heading>
        <Stack gap="md">
          <Checkbox label="Email me when a course is updated" defaultChecked />
          <Checkbox label="Send weekly progress digests" defaultChecked />
          <Checkbox label="Notify me about new content in enrolled tracks" />
        </Stack>
      </Stack>
    </Card>
  ),
}
