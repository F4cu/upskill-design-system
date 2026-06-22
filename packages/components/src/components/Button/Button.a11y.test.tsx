import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Button } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic contract the static
// jsx-a11y lint can't see: button semantics, keyboard activation, disabled
// removing the control from the interaction model, and an accessible name on
// the icon-only shape.

describe('Button — a11y behavior', () => {
  it('exposes the button role with its label as the accessible name', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('activates on Enter and Space (keyboardInteractions: Enter / Space)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()

    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('is removed from the tab order and ignores activation when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()

    await user.tab()
    expect(button).not.toHaveFocus()

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('carries an accessible name in icon-only (shape) mode', () => {
    render(<Button shape="round" icon="search" aria-label="Search" />)
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
  })

  it('has no axe violations in default and icon-only modes', async () => {
    const { container } = render(
      <>
        <Button>Save</Button>
        <Button shape="round" icon="search" aria-label="Search" />
      </>,
    )
    // color-contrast is disabled: jsdom can't compute layout/colors, so it's
    // not judgeable here (contrast stays with visual review + the addon-a11y panel).
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
