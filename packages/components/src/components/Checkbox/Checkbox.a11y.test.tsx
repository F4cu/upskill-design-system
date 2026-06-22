import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Checkbox } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic contract the static
// jsx-a11y lint can't see: native checkbox semantics, the label associating to
// the input via id/htmlFor (accessible name), Space toggling checked state and
// firing onChange, the checked prop reflected in the control, and disabled
// removing the control from the interaction model. Contract per
// Checkbox.metadata.json (role: checkbox; keyboard: Tab focuses, Space toggles).

describe('Checkbox — a11y behavior', () => {
  it('exposes the checkbox role with its label as the accessible name', () => {
    render(<Checkbox label="Email me updates" />)
    expect(screen.getByRole('checkbox', { name: 'Email me updates' })).toBeInTheDocument()
  })

  it('toggles checked state and fires onChange on Space (keyboardInteractions: Space)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox label="Email me updates" onChange={onChange} />)

    const checkbox = screen.getByRole('checkbox', { name: 'Email me updates' })
    expect(checkbox).not.toBeChecked()

    await user.tab()
    expect(checkbox).toHaveFocus()

    await user.keyboard(' ')
    expect(checkbox).toBeChecked()
    expect(onChange).toHaveBeenCalledTimes(1)

    await user.keyboard(' ')
    expect(checkbox).not.toBeChecked()
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('reflects the checked prop in the control state', () => {
    render(<Checkbox label="Email me updates" checked readOnly />)
    expect(screen.getByRole('checkbox', { name: 'Email me updates' })).toBeChecked()
  })

  it('is removed from the tab order and ignores activation when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox label="Email me updates" disabled onChange={onChange} />)

    const checkbox = screen.getByRole('checkbox', { name: 'Email me updates' })
    expect(checkbox).toBeDisabled()
    expect(checkbox).not.toBeChecked()

    await user.tab()
    expect(checkbox).not.toHaveFocus()

    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps the checkmark visible in the disabled-checked state', () => {
    render(<Checkbox label="Email me updates" disabled checked readOnly />)
    const checkbox = screen.getByRole('checkbox', { name: 'Email me updates' })
    expect(checkbox).toBeDisabled()
    expect(checkbox).toBeChecked()
  })

  it('has no axe violations across unchecked, checked, and disabled states', async () => {
    const { container } = render(
      <>
        <Checkbox label="Unchecked" />
        <Checkbox label="Checked" checked readOnly />
        <Checkbox label="Disabled" disabled />
        <Checkbox label="Disabled checked" disabled checked readOnly />
      </>,
    )
    // color-contrast is disabled: jsdom can't compute layout/colors, so it's
    // not judgeable here (contrast stays with visual review + the addon-a11y panel).
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
