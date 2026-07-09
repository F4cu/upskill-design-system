import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { DropdownMenu } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic ARIA contract from
// DropdownMenu.metadata.json that static jsx-a11y lint can't see: the panel
// exposes role=menu|listbox via listRole; items get menuitem|option; option
// items carry aria-selected reflecting selectedValue; items use a single
// roving focus target (tabIndex=-1, moved via Arrow keys, not one Tab stop
// per item); and Enter/Space on a focused item fires onSelect. Initial item
// focus and trigger focus-return on close are owner-controlled (the
// component doesn't render its own trigger) and asserted in each consumer's
// own a11y test (see Select.a11y.test.tsx, AppHeader.a11y.test.tsx).

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

  it('makes every item a single roving focus target (tabIndex=-1) in menu mode', () => {
    render(<DropdownMenu items={items} listRole="menu" onSelect={vi.fn()} onClose={vi.fn()} />)

    for (const item of screen.getAllByRole('menuitem')) {
      expect(item).toHaveAttribute('tabindex', '-1')
    }
  })

  it('listbox options have tabIndex=-1 (focusable via arrow keys, not Tab)', () => {
    render(
      <DropdownMenu
        items={items}
        listRole="listbox"
        aria-label="Greek letters"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    for (const option of screen.getAllByRole('option')) {
      expect(option).toHaveAttribute('tabindex', '-1')
    }
  })

  it('ArrowDown / ArrowUp navigate focus between options in listbox mode', async () => {
    const user = userEvent.setup()
    render(
      <DropdownMenu
        items={items}
        listRole="listbox"
        aria-label="Greek letters"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    const [alpha, beta, gamma] = screen.getAllByRole('option')

    alpha.focus()
    expect(alpha).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(beta).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(gamma).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    expect(beta).toHaveFocus()
  })

  it('ArrowDown / ArrowUp navigate focus between items in menu mode (WAI-ARIA APG menu pattern)', async () => {
    const user = userEvent.setup()
    render(<DropdownMenu items={items} listRole="menu" onSelect={vi.fn()} onClose={vi.fn()} />)

    const [alpha, beta, gamma] = screen.getAllByRole('menuitem')

    alpha.focus()
    expect(alpha).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(beta).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(gamma).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    expect(beta).toHaveFocus()
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
