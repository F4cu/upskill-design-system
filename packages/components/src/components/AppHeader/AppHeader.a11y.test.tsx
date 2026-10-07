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
// the APG menu-button pattern via useMenuButton — aria-haspopup/expanded/
// controls on the user button, a menu named by it, focus to the first item on
// open, focus back to the button after Escape or a selection, and a close
// without focus theft on Tab-out or an outside click.

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

  it.each(['{Enter}', ' '])('%s on an item selects it, closes the menu, and returns focus to the user button', async key => {
    const user = userEvent.setup()
    const onUserMenuSelect = vi.fn()
    renderHeader(onUserMenuSelect)

    const userButton = screen.getByRole('button', { name: /Sarah/ })
    await user.click(userButton)
    await user.keyboard('{ArrowDown}')
    await user.keyboard(key)

    expect(onUserMenuSelect).toHaveBeenCalledWith('settings')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(userButton).toHaveFocus()
  })

  it('names the open menu after the user button and links it with aria-controls', async () => {
    const user = userEvent.setup()
    renderHeader()

    const userButton = screen.getByRole('button', { name: /Sarah/ })
    expect(userButton).not.toHaveAttribute('aria-controls')
    await user.click(userButton)

    const menu = screen.getByRole('menu', { name: 'Sarah' })
    expect(userButton).toHaveAttribute('aria-controls', menu.id)
  })

  it('Tab out of the open menu closes it and lets focus move on', async () => {
    const user = userEvent.setup()
    render(
      <>
        <AppHeader
          logoSrc="/logo.svg"
          userName="Sarah"
          userMenuItems={USER_MENU_ITEMS}
          onUserMenuSelect={vi.fn()}
        />
        <button type="button">After</button>
      </>,
    )

    const userButton = screen.getByRole('button', { name: /Sarah/ })
    await user.click(userButton)
    expect(screen.getByRole('menuitem', { name: 'My Profile' })).toHaveFocus()

    await user.tab()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(userButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  it('an outside click closes the menu without pulling focus back to the user button', async () => {
    const user = userEvent.setup()
    render(
      <>
        <AppHeader
          logoSrc="/logo.svg"
          userName="Sarah"
          userMenuItems={USER_MENU_ITEMS}
          onUserMenuSelect={vi.fn()}
        />
        <button type="button">Outside</button>
      </>,
    )

    const userButton = screen.getByRole('button', { name: /Sarah/ })
    await user.click(userButton)
    await user.click(screen.getByRole('button', { name: 'Outside' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(userButton).toHaveAttribute('aria-expanded', 'false')
    expect(userButton).not.toHaveFocus()
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
