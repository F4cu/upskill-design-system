import type { Meta, StoryObj } from '@storybook/react'
import { AppHeader } from './index'
import logoLight from '../../assets/logos/brand-logo-light-theme.svg'
import logoDark from '../../assets/logos/brand-logo-dark-theme.svg'

const AVATAR = 'https://placehold.co/24x24/D15D50/ffffff?text=U'

const NAV_ITEMS = [
  { label: 'All Courses', href: '/courses' },
  { label: 'My Courses', href: '/my-courses', active: true },
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
    logoSrc: logoLight,
    logoSrcDark: logoDark,
    logoAlt: 'UpSkill',
    navItems: NAV_ITEMS,
    userAvatarSrc: AVATAR,
    userName: 'Sarah',
  },
}

export const NoUser: Story = {
  args: {
    logoSrc: logoLight,
    logoSrcDark: logoDark,
    logoAlt: 'UpSkill',
    navItems: NAV_ITEMS,
  },
}

export const Minimal: Story = {
  args: {
    logoSrc: logoLight,
    logoSrcDark: logoDark,
    logoAlt: 'UpSkill',
  },
}
