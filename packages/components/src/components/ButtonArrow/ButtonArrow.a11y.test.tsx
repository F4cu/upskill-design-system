import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { ButtonArrow } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic contract the static
// jsx-a11y lint can't see: the accessible name auto-derived from direction
// ('Previous' / 'Next'), an aria-label override via rest props, keyboard
// activation, and disabled removing the control from the interaction model.

describe('ButtonArrow — a11y behavior', () => {
  it('names the left arrow "Previous" (aria-label from direction)', () => {
    render(<ButtonArrow direction="left" />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
  })

  it('names the right arrow "Next" (aria-label from direction)', () => {
    render(<ButtonArrow direction="right" />)
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('lets a more specific aria-label override the default via rest props', () => {
    render(<ButtonArrow direction="left" aria-label="Previous course" />)
    expect(screen.getByRole('button', { name: 'Previous course' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument()
  })

  it('activates on Enter and Space (keyboardInteractions: Enter / Space)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ButtonArrow direction="right" onClick={onClick} />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()

    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('is removed from the tab order and ignores activation when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<ButtonArrow direction="left" disabled onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Previous' })
    expect(button).toBeDisabled()

    await user.tab()
    expect(button).not.toHaveFocus()

    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('hides the chevron icon from the accessible name (icon SVG is aria-hidden)', () => {
    const { container } = render(<ButtonArrow direction="left" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('has no axe violations for both directions', async () => {
    const { container } = render(
      <>
        <ButtonArrow direction="left" />
        <ButtonArrow direction="right" />
      </>,
    )
    // color-contrast is disabled: jsdom can't compute layout/colors, so it's
    // not judgeable here (contrast stays with visual review + the addon-a11y panel).
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
