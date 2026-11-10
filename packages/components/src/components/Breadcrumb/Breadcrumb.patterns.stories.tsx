import type { Meta, StoryObj } from '@storybook/react'
import { Breadcrumb } from './index'
import { Heading } from '../Heading'
import { Stack } from '../Stack'

const meta: Meta<typeof Breadcrumb> = {
  title: 'Components/Breadcrumb/Patterns',
  component: Breadcrumb,
}

export default meta
type Story = StoryObj<typeof Breadcrumb>

export const PageHeaderTrail: Story = {
  render: () => (
    <Stack gap="sm">
      <Breadcrumb
        items={[
          { label: 'Home', href: '#' },
          { label: 'Design', href: '#' },
          { label: 'Creative Acts for Curious People' },
        ]}
      />
      <Heading as="h1" size="headline">Creative Acts for Curious People</Heading>
    </Stack>
  ),
}
