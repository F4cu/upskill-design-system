import type { Meta, StoryObj } from '@storybook/react'
import { Divider } from './index'
import { Card } from '../Card'
import { TextField } from '../TextField'
import { Stack } from '../Stack'

const meta: Meta<typeof Divider> = {
  title: 'Components/Divider/Patterns',
  component: Divider,
}

export default meta
type Story = StoryObj<typeof Divider>

export const SectionBreak: Story = {
  render: () => (
    <Card>
      <Stack gap="lg">
        <TextField label="Display name" defaultValue="Jane Smith" />
        <TextField label="Email" type="email" defaultValue="jane.smith@example.com" />
        <Divider />
        <TextField label="Current password" type="password" />
        <TextField label="New password" type="password" />
      </Stack>
    </Card>
  ),
}
