import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Checkbox } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic contract the static
// jsx-a11y lint can't see (Checkbox.metadata.json accessibility block): native
// checkbox semantics named by its label, label click and Space toggling,
// controlled use through checked + onChange, disabled blocking interaction,
// and native form submission.

describe('Checkbox — a11y behavior', () => {
  it('exposes the checkbox role with its label as the accessible name', () => {
    render(<Checkbox label="New courses" />)
    expect(screen.getByRole('checkbox', { name: 'New courses' })).not.toBeChecked()
  })

  it('starts checked with defaultChecked', () => {
    render(<Checkbox label="New courses" defaultChecked />)
    expect(screen.getByRole('checkbox', { name: 'New courses' })).toBeChecked()
  })

  it('toggles when the label text is clicked', async () => {
    const user = userEvent.setup()
    render(<Checkbox label="New courses" />)
    await user.click(screen.getByText('New courses'))
    expect(screen.getByRole('checkbox', { name: 'New courses' })).toBeChecked()
  })

  it('toggles on Space and reports the change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox label="New courses" onChange={onChange} />)

    await user.tab()
    const checkbox = screen.getByRole('checkbox', { name: 'New courses' })
    expect(checkbox).toHaveFocus()

    await user.keyboard(' ')
    expect(checkbox).toBeChecked()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].target.checked).toBe(true)
  })

  it('follows the checked prop when controlled', async () => {
    const user = userEvent.setup()
    function Controlled() {
      const [checked, setChecked] = useState(true)
      return <Checkbox label="Digest" checked={checked} onChange={e => setChecked(e.target.checked)} />
    }
    render(<Controlled />)
    const checkbox = screen.getByRole('checkbox', { name: 'Digest' })
    expect(checkbox).toBeChecked()
    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('blocks focus and toggling when disabled, in both states', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <>
        <Checkbox label="Off" disabled onChange={onChange} />
        <Checkbox label="On" disabled defaultChecked onChange={onChange} />
      </>,
    )
    const off = screen.getByRole('checkbox', { name: 'Off' })
    const on = screen.getByRole('checkbox', { name: 'On' })
    expect(off).toBeDisabled()
    expect(on).toBeDisabled()

    await user.tab()
    expect(off).not.toHaveFocus()
    expect(on).not.toHaveFocus()

    await user.click(screen.getByText('Off'))
    await user.click(on)
    expect(off).not.toBeChecked()
    expect(on).toBeChecked()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('submits its name/value with a native form when checked', () => {
    render(
      <form aria-label="Preferences">
        <Checkbox label="New courses" name="notify" value="courses" defaultChecked />
        <Checkbox label="Digest" name="notify" value="digest" />
      </form>,
    )
    const form = screen.getByRole('form', { name: 'Preferences' }) as HTMLFormElement
    expect(new FormData(form).getAll('notify')).toEqual(['courses'])
  })

  it('has no axe violations unchecked, checked and disabled', async () => {
    const { container } = render(
      <>
        <Checkbox label="One" />
        <Checkbox label="Two" defaultChecked />
        <Checkbox label="Three" disabled />
        <Checkbox label="Four" disabled defaultChecked />
      </>,
    )
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
