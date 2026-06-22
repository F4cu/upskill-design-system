import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { DropdownMenu } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic ARIA contract from
// DropdownMenu.metadata.json that static jsx-a11y lint can't see: the panel
// exposes role=menu|listbox via listRole; items get menuitem|option; option
// items carry aria-selected reflecting selectedValue; items are focusable
// (tabIndex=0); and Enter/Space on a focused item fires onSelect. Escape/focus
// return is owner-controlled (onClose) and not asserted as component-owned UI.

const items = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

describe('DropdownMenu — a11y behavior', () => {
  it('exposes role=menu with role=menuitem items (listRole=menu)', () => {
    render(<DropdownMenu items={items} listRole="menu" onSelect={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(items.length)
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).toBeInTheDocument()
  })

  it('exposes role=listbox with role=option items and aria-selected reflecting selectedValue (listRole=listbox)', () => {
    render(
      <DropdownMenu
        items={items}
        listRole="listbox"
        selectedValue="b"
        aria-label="Greek letters"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(items.length)

    expect(screen.getByRole('option', { name: 'Beta', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Alpha', selected: false })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Gamma', selected: false })).toBeInTheDocument()
  })

  it('makes every item focusable (tabIndex=0)', () => {
    render(<DropdownMenu items={items} listRole="menu" onSelect={vi.fn()} onClose={vi.fn()} />)

    for (const item of screen.getAllByRole('menuitem')) {
      expect(item).toHaveAttribute('tabindex', '0')
    }
  })

  it('fires onSelect with the item value on Enter and Space (keyboardInteractions: Enter / Space)', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<DropdownMenu items={items} listRole="menu" onSelect={onSelect} onClose={vi.fn()} />)

    const beta = screen.getByRole('menuitem', { name: 'Beta' })
    beta.focus()
    expect(beta).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenLastCalledWith('b')

    await user.keyboard(' ')
    expect(onSelect).toHaveBeenLastCalledWith('b')
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('has no axe violations in menu and listbox modes', async () => {
    const { container } = render(
      <>
        <DropdownMenu items={items} listRole="menu" onSelect={vi.fn()} onClose={vi.fn()} />
        <DropdownMenu
          items={items}
          listRole="listbox"
          selectedValue="b"
          aria-label="Greek letters"
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />
      </>,
    )
    // color-contrast is disabled: jsdom can't compute layout/colors, so it's
    // not judgeable here (contrast stays with visual review + the addon-a11y panel).
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
