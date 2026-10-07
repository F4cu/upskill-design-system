import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Chip } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic contract the static
// jsx-a11y lint can't see (Chip.metadata.json accessibility block): button
// semantics with the label as accessible name, aria-pressed reflecting the
// caller-controlled pressed state, and Enter/Space activation firing onClick
// so the caller can flip the pressed state.

describe('Chip — a11y behavior', () => {
  it('exposes the button role with its label as the accessible name', () => {
    render(<Chip>Design</Chip>)
    expect(screen.getByRole('button', { name: 'Design' })).toBeInTheDocument()
  })

  it('reflects the pressed state via aria-pressed (defaults to false)', () => {
    render(<Chip>Design</Chip>)
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('sets aria-pressed=true when pressed', () => {
    render(<Chip pressed>Design</Chip>)
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('activates on Enter and Space so the caller can toggle the pressed state', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Chip onClick={onClick}>Design</Chip>)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Design' })).toHaveFocus()

    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('updates aria-pressed when re-rendered as pressed', () => {
    const { rerender } = render(<Chip>Design</Chip>)
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'false')

    rerender(<Chip pressed>Design</Chip>)
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onPressedChange with the next state after onClick', async () => {
    const user = userEvent.setup()
    const calls: string[] = []
    const onClick = vi.fn(() => calls.push('click'))
    const onPressedChange = vi.fn((next: boolean) => calls.push(`pressed:${next}`))
    const { rerender } = render(<Chip onClick={onClick} onPressedChange={onPressedChange}>Design</Chip>)

    await user.click(screen.getByRole('button', { name: 'Design' }))
    expect(calls).toEqual(['click', 'pressed:true'])

    rerender(<Chip pressed onClick={onClick} onPressedChange={onPressedChange}>Design</Chip>)
    await user.click(screen.getByRole('button', { name: 'Design' }))
    expect(onPressedChange).toHaveBeenLastCalledWith(false)
  })

  it('excludes disabled chips from the tab order and blocks activation', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Chip disabled onClick={onClick}>Design</Chip>)

    const chip = screen.getByRole('button', { name: 'Design' })
    expect(chip).toBeDisabled()

    await user.tab()
    expect(chip).not.toHaveFocus()

    await user.click(chip)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('has no axe violations when unpressed and pressed', async () => {
    const { container } = render(
      <>
        <Chip>Design</Chip>
        <Chip pressed>Development</Chip>
      </>,
    )
    // color-contrast is disabled: jsdom can't compute layout/colors, so it's
    // not judgeable here (contrast stays with visual review + the addon-a11y panel).
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
