import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './index'
import { Card } from '../Card'
import { Heading } from '../Heading'
import { Inline } from '../Inline'
import { Stack } from '../Stack'
import { Text } from '../Text'

const meta: Meta<typeof Button> = {
  title: 'Components/Button/Patterns',
  component: Button,
}

export default meta
type Story = StoryObj<typeof Button>

export const FormActions: Story = {
  render: () => (
    <Inline gap="sm" justify="end">
      <Button variant="neutral">Cancel</Button>
      <Button variant="accent">Save changes</Button>
    </Inline>
  ),
}

export const DestructiveConfirm: Story = {
  render: () => (
    <Inline gap="sm" justify="end">
      <Button variant="neutral">Cancel</Button>
      <Button variant="danger">Delete course</Button>
    </Inline>
  ),
}

export const CardActions: Story = {
  render: () => (
    <Card>
      <Stack gap="md">
        <Heading as="h3" size="title-small">Creative Acts for Curious People</Heading>
        <Text>Twelve hours of exercises for building a creative practice.</Text>
        <Inline gap="sm">
          <Button variant="neutral" size="sm">Continue</Button>
          <Button variant="transparent" size="sm">Details</Button>
        </Inline>
      </Stack>
    </Card>
  ),
}

export const HeroCta: Story = {
  render: () => (
    <Stack gap="lg">
      <Heading as="h1" size="display">Learn with a beginner's mind</Heading>
      <Text size="body-default">Courses that build a creative practice, one week at a time.</Text>
      <Inline>
        <Button variant="accent" size="lg">Browse courses</Button>
      </Inline>
    </Stack>
  ),
}
