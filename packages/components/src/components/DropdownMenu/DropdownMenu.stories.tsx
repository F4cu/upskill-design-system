import type { Meta, StoryObj } from '@storybook/react'
import { DropdownMenu } from './index'

const ITEMS = [
  { value: 'english', label: 'English' },
  { value: 'german', label: 'German' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
]

const meta = {
  title: 'Components/DropdownMenu',
  component: DropdownMenu,
  parameters: { layout: 'padded' },
  argTypes: {
    selectedValue: { control: 'text' },
    listRole: {
      control: 'radio',
      options: ['menu', 'listbox'],
    },
  },
} satisfies Meta<typeof DropdownMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    items: ITEMS,
    onSelect: () => {},
    onClose: () => {},
  },
}

export const WithSelection: Story = {
  args: {
    items: ITEMS,
    selectedValue: 'spanish',
    listRole: 'listbox',
    'aria-label': 'Language',
    onSelect: () => {},
    onClose: () => {},
  },
}
