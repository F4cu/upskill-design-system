import type { Meta, StoryObj } from '@storybook/react'
import { ProgressBar } from './index'
import { Stack } from '../Stack'

const meta = {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
} satisfies Meta<typeof ProgressBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { value: 40 },
}

export const Empty: Story = {
  args: { value: 0 },
}

export const Full: Story = {
  args: { value: 100 },
}

export const Scale: Story = {
  args: { value: 50 },
  render: () => (
    <Stack gap="md" style={{ width: 300 }}>
      <ProgressBar value={0} />
      <ProgressBar value={25} />
      <ProgressBar value={50} />
      <ProgressBar value={75} />
      <ProgressBar value={100} />
    </Stack>
  ),
}
