import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Checkbox } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the contract from the metadata
// (role: checkbox, named by its label) that static lint can't see: clicking the
// label toggles, Space toggles, disabled blocks toggling, and the checked value
// submits with a native form.

describe('Checkbox — a11y behavior', () => {
  it('exposes the checkbox role with the label as the accessible name', () => {
    render(<Checkbox label="Email updates" />)
    expect(screen.getByRole('checkbox', { name: 'Email updates' })).not.toBeChecked()
  })

  it('toggles when the label text is clicked and reports the change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox label="Email updates" onChange={onChange} />)

    await user.click(screen.getByText('Email updates'))
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].target.checked).toBe(true)
  })

  it('focuses on Tab and toggles with Space', async () => {
    const user = userEvent.setup()
    render(<Checkbox label="Email updates" defaultChecked />)

    const checkbox = screen.getByRole('checkbox')
    await user.tab()
    expect(checkbox).toHaveFocus()
    await user.keyboard(' ')
    expect(checkbox).not.toBeChecked()
  })

  it('does not toggle when disabled, checked or unchecked', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Checkbox label="Off" disabled />
        <Checkbox label="On" disabled defaultChecked />
      </>,
    )

    await user.click(screen.getByText('Off'))
    await user.click(screen.getByText('On'))
    expect(screen.getByRole('checkbox', { name: 'Off' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'On' })).toBeChecked()
  })

  it('submits its value with a native form when checked', () => {
    render(
      <form aria-label="Preferences">
        <Checkbox name="notify" value="email" label="Email" defaultChecked />
        <Checkbox name="notify" value="sms" label="SMS" />
      </form>,
    )
    const form = screen.getByRole('form', { name: 'Preferences' }) as HTMLFormElement
    expect(new FormData(form).getAll('notify')).toEqual(['email'])
  })

  it('has no axe violations in unchecked, checked, and disabled states', async () => {
    const { container } = render(
      <>
        <Checkbox label="Unchecked" />
        <Checkbox label="Checked" defaultChecked />
        <Checkbox label="Disabled" disabled />
      </>,
    )
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
