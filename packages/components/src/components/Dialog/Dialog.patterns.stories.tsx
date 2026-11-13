import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from '../Badge'
import { Button } from '../Button'
import { Inline } from '../Inline'
import { Stack } from '../Stack'
import { Text } from '../Text'
import { TextField } from '../TextField'
import { TextLink } from '../TextLink'
import { Dialog } from './index'

const meta: Meta<typeof Dialog> = {
  title: 'Components/Dialog/Patterns',
  component: Dialog,
}

export default meta
type Story = StoryObj<typeof Dialog>

// The Dialog renders before its trigger: the anatomy test (ADR-030) locates
// the first data-part="Root", and Button marks its own root that way too.
function ConfirmActionExample() {
  const [open, setOpen] = useState(true)
  return (
    <Stack gap="md" align="start">
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Remove this course?"
        description="Your progress in Color Theory II will be deleted. This can't be undone."
        actions={
          <>
            <Button variant="neutral" data-autofocus onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => setOpen(false)}>Remove</Button>
          </>
        }
      />
      <Button variant="danger" onClick={() => setOpen(true)}>Remove course</Button>
    </Stack>
  )
}

export const ConfirmAction: Story = {
  render: () => <ConfirmActionExample />,
}

function EditFormExample() {
  const [open, setOpen] = useState(true)
  return (
    <Stack gap="md" align="start">
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Edit profile"
        description="Your name appears on your certificates."
        actions={
          <>
            <Button variant="neutral" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={() => setOpen(false)}>Save</Button>
          </>
        }
      >
        <Stack gap="md" align="stretch">
          <TextField label="Name" defaultValue="Sarah" data-autofocus />
          <TextField label="Surname" defaultValue="Jones" />
        </Stack>
      </Dialog>
      <Button onClick={() => setOpen(true)}>Edit profile</Button>
    </Stack>
  )
}

export const EditForm: Story = {
  render: () => <EditFormExample />,
}

function DetailPanelExample() {
  const [open, setOpen] = useState(true)
  return (
    <Inline gap="lg" align="start" wrap={false}>
      <Dialog nonModal open={open} onOpenChange={setOpen} title="Token build" headingLevel={3}>
        <Stack gap="sm" align="start">
          <Text color="subtle">
            Style Dictionary turns the DTCG source into CSS custom properties and JS constants.
          </Text>
          <Badge variant="filled">Passing</Badge>
          <TextLink href="#">View run on GitHub</TextLink>
        </Stack>
      </Dialog>
      <Button variant="neutral" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Token build
      </Button>
    </Inline>
  )
}

export const DetailPanel: Story = {
  render: () => <DetailPanelExample />,
}
