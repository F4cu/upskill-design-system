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

  it('carries an accessible name as a transparent icon-only menu trigger', () => {
    render(<Button variant="transparent" shape="round" icon="more-vertical" aria-label="More actions" aria-haspopup="menu" />)
    expect(screen.getByRole('button', { name: 'More actions' })).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('makes an icon-only button without an icon or accessible name a type error', () => {
    // Checked by typecheck, not at runtime: each line must stay a compile error.
    const invalid = [
      // @ts-expect-error shape requires aria-label
      <Button key="no-name" shape="round" icon="search" />,
      // @ts-expect-error shape requires icon
      <Button key="no-icon" shape="square" aria-label="Search" />,
      // @ts-expect-error icon-only buttons take no label
      <Button key="label" shape="round" icon="search" aria-label="Search">Search</Button>,
    ]
    expect(invalid).toHaveLength(3)
  })

  it('has no axe violations across variants and icon-only modes', async () => {
    const { container } = render(
      <>
        <Button>Save</Button>
        <Button variant="accent">Confirm</Button>
        <Button variant="danger">Delete</Button>
        <Button shape="round" icon="search" aria-label="Search" />
        <Button variant="transparent" shape="round" icon="heart" aria-label="Favorite" />
      </>,
    )
    // color-contrast is disabled: jsdom can't compute layout/colors, so it's
    // not judgeable here (contrast stays with visual review + the addon-a11y panel).
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
