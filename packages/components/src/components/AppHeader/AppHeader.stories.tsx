import type { Meta, StoryObj } from '@storybook/react'
import { AppHeader } from './index'

const LOGO = 'https://placehold.co/120x32/D15D50/ffffff?text=UpSkill'
const AVATAR = 'https://placehold.co/24x24/D15D50/ffffff?text=U'

const NAV_ITEMS = [
  { label: 'Discover', href: '/discover' },
  { label: 'My Courses', href: '/courses', active: true },
  { label: 'Saved', href: '/saved' },
]

const meta = {
  title: 'Components/AppHeader',
  component: AppHeader,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    logoSrc: LOGO,
    logoAlt: 'UpSkill',
    navItems: NAV_ITEMS,
    userAvatarSrc: AVATAR,
    userName: 'Jane Smith',
  },
}

export const NoUser: Story = {
  args: {
    logoSrc: LOGO,
    logoAlt: 'UpSkill',
    navItems: NAV_ITEMS,
  },
}

export const Minimal: Story = {
  args: {
    logoSrc: LOGO,
    logoAlt: 'UpSkill',
  },
}
