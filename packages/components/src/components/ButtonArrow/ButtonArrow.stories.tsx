import type { Meta, StoryObj } from '@storybook/react'
import { ButtonArrow } from './index'
import { Inline } from '../Inline'

const meta: Meta<typeof ButtonArrow> = {
  title: 'Components/ButtonArrow',
  component: ButtonArrow,
  argTypes: {
    direction: { control: 'radio', options: ['left', 'right'] },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof ButtonArrow>

export const Default: Story = {
  args: {
    direction: 'right',
  },
}

export const Left: Story = {
  args: {
    direction: 'left',
  },
}

export const Disabled: Story = {
  args: {
    direction: 'right',
    disabled: true,
  },
}

export const Pair: Story = {
  render: () => (
    <Inline gap="sm">
      <ButtonArrow direction="left" disabled />
      <ButtonArrow direction="right" />
    </Inline>
  ),
}
