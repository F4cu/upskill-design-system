import type { Meta, StoryObj } from '@storybook/react'
import { TextLink } from './index'
import { Text } from '../Text'

const meta: Meta<typeof TextLink> = {
  title: 'Components/TextLink/Patterns',
  component: TextLink,
}

export default meta
type Story = StoryObj<typeof TextLink>

export const AuthorCredit: Story = {
  render: () => (
    <Text size="body-default" color="subtle">
      <TextLink href="#">Ellen Lupton</TextLink>, Author and educator, MICA
    </Text>
  ),
}
