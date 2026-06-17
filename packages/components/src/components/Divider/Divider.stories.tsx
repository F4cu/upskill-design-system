import type { Meta, StoryObj } from '@storybook/react'
import { Divider } from './index'
import { Stack } from '../Stack'
import { Text } from '../Text'

const meta = {
  title: 'Components/Divider',
  component: Divider,
} satisfies Meta<typeof Divider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const BetweenContent: Story = {
  render: () => (
    <Stack gap="md">
      <Text>Section above</Text>
      <Divider />
      <Text>Section below</Text>
    </Stack>
  ),
  args: {},
}
