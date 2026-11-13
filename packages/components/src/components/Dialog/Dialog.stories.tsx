import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../Button'
import { Stack } from '../Stack'
import { Text } from '../Text'
import { Dialog } from './index'
import type { DialogProps } from './index'

const meta: Meta<typeof Dialog> = {
  title: 'Components/Dialog',
  component: Dialog,
  argTypes: {
    open: { control: 'boolean', description: 'Initial open state; the story keeps it in state after that.' },
    title: { control: 'text' },
    description: { control: 'text' },
    headingLevel: { control: 'select', options: [2, 3, 4, 5, 6] },
    nonModal: { control: 'boolean' },
    onOpenChange: { action: 'openChange' },
  },
}

export default meta
type Story = StoryObj<typeof Dialog>

// Dialog is controlled: the story owns open state and a trigger, so closing
// and reopening (and focus returning to the trigger) can be tried by hand.
function Controlled({ open: initialOpen, onOpenChange, ...args }: DialogProps) {
  const [open, setOpen] = useState(initialOpen)
  function handleOpenChange(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }
  return (
    <Stack gap="md" align="start">
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog {...args} open={open} onOpenChange={handleOpenChange} />
    </Stack>
  )
}

export const Default: Story = {
  args: {
    open: true,
    title: 'Save your changes?',
    headingLevel: 2,
    nonModal: false,
    children: (
      <Text color="subtle">
        You changed your profile details. Save them to update your profile and your certificates,
        or cancel to keep the details you had before.
      </Text>
    ),
    actions: (
      <>
        <Button variant="neutral">Cancel</Button>
        <Button variant="accent">Save</Button>
      </>
    ),
  },
  render: (args) => <Controlled {...args} />,
}

export const NonModal: Story = {
  args: {
    open: true,
    title: 'Token build',
    nonModal: true,
    children: (
      <Text color="subtle">
        Style Dictionary turns the DTCG source into CSS custom properties and JS constants.
      </Text>
    ),
  },
  render: (args) => <Controlled {...args} />,
}

export const LongContent: Story = {
  args: {
    open: true,
    title: 'Course terms',
    description: 'Read the terms before you enrol.',
    children: (
      <Stack gap="md">
        {Array.from({ length: 12 }, (_, i) => (
          <Text key={i} color="subtle">
            Section {i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc elementum
            nulla eu justo iaculis, a condimentum sapien lobortis. Duis tincidunt, libero sit amet
            eleifend consectetur.
          </Text>
        ))}
      </Stack>
    ),
    actions: <Button variant="accent">Accept</Button>,
  },
  render: (args) => <Controlled {...args} />,
}

export const Closed: Story = {
  args: {
    open: false,
    title: 'Edit profile',
    description: 'Your name appears on your certificates.',
  },
  render: (args) => <Controlled {...args} />,
}
