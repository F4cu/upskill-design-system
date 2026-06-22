import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Chip } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic contract the static
// jsx-a11y lint can't see (Chip.metadata.json accessibility block): button
// semantics with the label as accessible name, aria-pressed reflecting the
// caller-controlled selected state, and Enter/Space activation firing onClick
// so the caller can flip selection.

describe('Chip — a11y behavior', () => {
  it('exposes the button role with its label as the accessible name', () => {
    render(<Chip>Design</Chip>)
    expect(screen.getByRole('button', { name: 'Design' })).toBeInTheDocument()
  })

  it('reflects the selected state via aria-pressed (defaults to false)', () => {
    render(<Chip>Design</Chip>)
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('sets aria-pressed=true when selected', () => {
    render(<Chip selected>Design</Chip>)
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('activates on Enter and Space so the caller can toggle selection', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Chip onClick={onClick}>Design</Chip>)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Design' })).toHaveFocus()

    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('updates aria-pressed when re-rendered as selected', () => {
    const { rerender } = render(<Chip>Design</Chip>)
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'false')

    rerender(<Chip selected>Design</Chip>)
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('has no axe violations when unselected and selected', async () => {
    const { container } = render(
      <>
        <Chip>Design</Chip>
        <Chip selected>Development</Chip>
      </>,
    )
    // color-contrast is disabled: jsdom can't compute layout/colors, so it's
    // not judgeable here (contrast stays with visual review + the addon-a11y panel).
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
