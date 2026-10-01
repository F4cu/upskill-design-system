import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { CardVertical } from './index'

// Tier-2 behavioral a11y (ADR-008). The card itself is display-only; its
// Action slot makes it interactive. Favorite is a toggle button (aria-pressed)
// named "Save <title>". Menu composes DropdownMenu, which leaves trigger focus
// management to its owner, so these tests assert the AppHeader-style contract:
// open moves focus into the menu; Escape and selection close it and return
// focus to the trigger; outside click and Tab close it without moving focus.

const TITLE = 'Creative Acts for Curious People'

const MENU_ITEMS = [
  { value: 'share', label: 'Share' },
  { value: 'hide', label: 'Hide course' },
]

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

function renderMenuCard(onSelect = vi.fn()) {
  return render(
    <>
      <CardVertical
        title={TITLE}
        action={<CardVertical.Menu items={MENU_ITEMS} onSelect={onSelect} />}
      />
      <button type="button">Outside</button>
    </>,
  )
}

describe('CardVertical — a11y behavior', () => {
  it('names the article by its title', () => {
    render(<CardVertical title={TITLE} />)
    expect(screen.getByRole('article', { name: TITLE })).toBeInTheDocument()
  })

  it('names the progress bar by the title', () => {
    render(<CardVertical title={TITLE} progress={40} />)
    const bar = screen.getByRole('progressbar', { name: TITLE })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
  })

  describe('Favorite', () => {
    it('is named "Save" plus the title and toggles aria-pressed (uncontrolled)', async () => {
      const user = userEvent.setup()
      const onPressedChange = vi.fn()
      render(<CardVertical title={TITLE} action={<CardVertical.Favorite onPressedChange={onPressedChange} />} />)

      const favorite = screen.getByRole('button', { name: `Save ${TITLE}` })
      expect(favorite).toHaveAttribute('aria-pressed', 'false')

      await user.tab()
      expect(favorite).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(favorite).toHaveAttribute('aria-pressed', 'true')
      await user.keyboard(' ')
      expect(favorite).toHaveAttribute('aria-pressed', 'false')
      expect(onPressedChange.mock.calls).toEqual([[true], [false]])
    })

    it('reflects the controlled pressed prop without changing on its own', async () => {
      const user = userEvent.setup()
      const onPressedChange = vi.fn()
      const { rerender } = render(
        <CardVertical title={TITLE} action={<CardVertical.Favorite pressed onPressedChange={onPressedChange} />} />,
      )

      const favorite = screen.getByRole('button', { name: `Save ${TITLE}` })
      await user.click(favorite)
      expect(onPressedChange).toHaveBeenCalledWith(false)
      expect(favorite).toHaveAttribute('aria-pressed', 'true')

      rerender(<CardVertical title={TITLE} action={<CardVertical.Favorite pressed={false} onPressedChange={onPressedChange} />} />)
      expect(favorite).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Menu', () => {
    it('exposes aria-haspopup and aria-expanded on the trigger', () => {
      renderMenuCard()
      const trigger = screen.getByRole('button', { name: `More options ${TITLE}` })
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it.each(['{Enter}', ' '])('opens with %s and focuses the first item', async key => {
      const user = userEvent.setup()
      renderMenuCard()
      const trigger = screen.getByRole('button', { name: `More options ${TITLE}` })

      await user.tab()
      expect(trigger).toHaveFocus()
      await user.keyboard(key)

      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Share' })).toHaveFocus()
    })

    it('names the open menu by its trigger and points aria-controls at it', async () => {
      const user = userEvent.setup()
      renderMenuCard()
      const trigger = screen.getByRole('button', { name: `More options ${TITLE}` })

      await user.click(trigger)
      const menu = screen.getByRole('menu', { name: `More options ${TITLE}` })
      expect(trigger).toHaveAttribute('aria-controls', menu.id)
    })

    it('moves between items with ArrowDown / ArrowUp', async () => {
      const user = userEvent.setup()
      renderMenuCard()

      await user.click(screen.getByRole('button', { name: `More options ${TITLE}` }))
      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('menuitem', { name: 'Hide course' })).toHaveFocus()
      await user.keyboard('{ArrowUp}')
      expect(screen.getByRole('menuitem', { name: 'Share' })).toHaveFocus()
    })

    it.each(['{Enter}', ' '])('selects the focused item with %s, closes and returns focus to the trigger', async key => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      renderMenuCard(onSelect)
      const trigger = screen.getByRole('button', { name: `More options ${TITLE}` })

      await user.click(trigger)
      await user.keyboard('{ArrowDown}')
      await user.keyboard(key)

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect).toHaveBeenCalledWith('hide')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveFocus()
    })

    it('closes on Escape and returns focus to the trigger', async () => {
      const user = userEvent.setup()
      renderMenuCard()
      const trigger = screen.getByRole('button', { name: `More options ${TITLE}` })

      await user.click(trigger)
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveFocus()
    })

    it('closes on an outside click without pulling focus back to the trigger', async () => {
      const user = userEvent.setup()
      renderMenuCard()
      const trigger = screen.getByRole('button', { name: `More options ${TITLE}` })

      await user.click(trigger)
      expect(screen.getByRole('menu')).toBeInTheDocument()

      const outside = screen.getByRole('button', { name: 'Outside' })
      await user.click(outside)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(outside).toHaveFocus()
    })

    it('closes when Tab moves focus out of the menu', async () => {
      const user = userEvent.setup()
      renderMenuCard()
      const trigger = screen.getByRole('button', { name: `More options ${TITLE}` })

      await user.click(trigger)
      await user.tab()

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus()
    })

    it('renders no trigger when there are no items', () => {
      render(<CardVertical title={TITLE} action={<CardVertical.Menu items={[]} onSelect={vi.fn()} />} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('context guard', () => {
    it('throws when a part renders outside Root', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => render(<CardVertical.Title>{TITLE}</CardVertical.Title>)).toThrow(
        'CardVertical.Title must be rendered inside CardVertical.Root',
      )
      vi.restoreAllMocks()
    })

    it('throws when Action holds anything but one Favorite or Menu', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() =>
        render(
          <CardVertical.Root>
            <CardVertical.Media>
              {/* @ts-expect-error — Action takes one Favorite or Menu */}
              <CardVertical.Action>
                <CardVertical.Favorite />
                <CardVertical.Favorite />
              </CardVertical.Action>
            </CardVertical.Media>
          </CardVertical.Root>,
        ),
      ).toThrow('CardVertical.Action accepts exactly one CardVertical.Favorite or CardVertical.Menu')
      vi.restoreAllMocks()
    })

    it('throws when Media holds anything but one Action', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() =>
        render(
          <CardVertical.Root>
            <CardVertical.Media>
              <span>overlay</span>
            </CardVertical.Media>
          </CardVertical.Root>,
        ),
      ).toThrow('CardVertical.Media accepts at most one CardVertical.Action')
      vi.restoreAllMocks()
    })
  })

  it('has no axe violations with a favorite, and with the menu open', async () => {
    const user = userEvent.setup()
    const { container, unmount } = render(
      <CardVertical title={TITLE} progress={20} certified duration="12 Hours" action={<CardVertical.Favorite defaultPressed />} />,
    )
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
    unmount()

    const menu = renderMenuCard()
    await user.click(screen.getByRole('button', { name: `More options ${TITLE}` }))
    expect(await axe(menu.container, AXE_OPTIONS)).toHaveNoViolations()
  })
})
