import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { AppHeader } from './index'

// Tier-2 behavioral a11y (ADR-008). AppHeader composes DropdownMenu
// (listRole=menu) for its user menu, and DropdownMenu deliberately doesn't
// own trigger focus management (it doesn't render its own trigger) — so the
// composing component is responsible for it (AppHeader.metadata.json →
// accessibility.keyboardInteractions). These tests assert that contract:
// the user button exposes aria-haspopup/aria-expanded, activating it opens
// the menu and moves focus to the first item, and Escape closes the menu and
// returns focus to the user button.

const USER_MENU_ITEMS = [
  { value: 'profile', label: 'My Profile' },
  { value: 'settings', label: 'Settings' },
  { value: 'logout', label: 'Log out' },
]

function renderHeader(onUserMenuSelect = vi.fn()) {
  return render(
    <AppHeader
      logoSrc="/logo.svg"
      logoAlt="UpSkill"
      userAvatarSrc="/avatar.png"
      userName="Sarah"
      userMenuItems={USER_MENU_ITEMS}
      onUserMenuSelect={onUserMenuSelect}
    />,
  )
}

describe('AppHeader — a11y behavior', () => {
  it('exposes aria-haspopup and aria-expanded on the user button', () => {
    renderHeader()
    const userButton = screen.getByRole('button', { name: /Sarah/ })
    expect(userButton).toHaveAttribute('aria-haspopup', 'menu')
    expect(userButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens the user menu on click and moves focus to the first item', async () => {
    const user = userEvent.setup()
    renderHeader()

    const userButton = screen.getByRole('button', { name: /Sarah/ })
    await user.click(userButton)

    expect(userButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'My Profile' })).toHaveFocus()
  })

  it('Escape closes the user menu and returns focus to the user button', async () => {
    const user = userEvent.setup()
    renderHeader()

    const userButton = screen.getByRole('button', { name: /Sarah/ })
    await user.click(userButton)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(userButton).toHaveFocus()
  })

  it('selecting a menu item calls onUserMenuSelect and closes the menu', async () => {
    const user = userEvent.setup()
    const onUserMenuSelect = vi.fn()
    renderHeader(onUserMenuSelect)

    await user.click(screen.getByRole('button', { name: /Sarah/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Settings' }))

    expect(onUserMenuSelect).toHaveBeenCalledWith('settings')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('has no axe violations with the user menu open', async () => {
    const user = userEvent.setup()
    const { container } = renderHeader()

    await user.click(screen.getByRole('button', { name: /Sarah/ }))
    // color-contrast is disabled: jsdom can't compute layout/colors, so it's
    // not judgeable here (contrast stays with visual review + the addon-a11y panel).
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
