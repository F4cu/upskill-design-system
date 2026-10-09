import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Checkbox } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic contract from the
// metadata (role: checkbox): the label is the accessible name and a click
// target, Space toggles, controlled use reports changes, disabled blocks
// toggling, and the native input submits with its form.

describe('Checkbox — a11y behavior', () => {
  it('exposes the checkbox role with the label as the accessible name', () => {
    render(<Checkbox label="Email updates" />)
    expect(screen.getByRole('checkbox', { name: 'Email updates' })).not.toBeChecked()
  })

  it('keeps the accessible name when the label is visually hidden (hideLabel)', () => {
    render(<Checkbox label="Select row" hideLabel />)
    expect(screen.getByRole('checkbox', { name: 'Select row' })).toBeInTheDocument()
  })

  it('starts checked with defaultChecked and toggles when the label text is clicked', async () => {
    const user = userEvent.setup()
    render(<Checkbox label="Email updates" defaultChecked />)
    const box = screen.getByRole('checkbox', { name: 'Email updates' })
    expect(box).toBeChecked()

    await user.click(screen.getByText('Email updates'))
    expect(box).not.toBeChecked()
  })

  it('focuses on Tab and toggles both ways with Space, but not with Enter', async () => {
    const user = userEvent.setup()
    render(<Checkbox label="Email updates" />)
    const box = screen.getByRole('checkbox', { name: 'Email updates' })

    await user.tab()
    expect(box).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(box).not.toBeChecked()
    await user.keyboard(' ')
    expect(box).toBeChecked()
    await user.keyboard(' ')
    expect(box).not.toBeChecked()
  })

  it('is skipped in the Tab order when disabled', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Checkbox label="First" />
        <Checkbox label="Disabled" disabled />
        <Checkbox label="Last" />
      </>,
    )
    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'First' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'Last' })).toHaveFocus()
  })

  it('stays unchanged when controlled and the app does not update it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn((event: React.ChangeEvent<HTMLInputElement>) => event.target.checked)
    render(<Checkbox label="Email updates" checked={false} onChange={onChange} />)
    const box = screen.getByRole('checkbox', { name: 'Email updates' })

    await user.click(box)
    expect(onChange).toHaveReturnedWith(true)
    expect(box).not.toBeChecked()
  })

  it('reports changes when controlled', async () => {
    const user = userEvent.setup()
    const spy = vi.fn()
    function Controlled() {
      const [checked, setChecked] = useState(false)
      return (
        <Checkbox
          label="Email updates"
          checked={checked}
          onChange={(event) => {
            spy(event.target.checked)
            setChecked(event.target.checked)
          }}
        />
      )
    }
    render(<Controlled />)
    const box = screen.getByRole('checkbox', { name: 'Email updates' })

    await user.click(box)
    expect(spy).toHaveBeenLastCalledWith(true)
    expect(box).toBeChecked()
  })

  it('does not toggle when disabled, checked or unchecked', async () => {
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

    await user.click(screen.getByText('Off'))
    await user.click(on)
    expect(off).not.toBeChecked()
    expect(on).toBeChecked()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('submits its name and value with an ordinary form', () => {
    render(
      <form aria-label="Preferences">
        <Checkbox label="Email updates" name="email" value="yes" defaultChecked />
        <Checkbox label="SMS updates" name="sms" />
      </form>,
    )
    const data = new FormData(screen.getByRole('form', { name: 'Preferences' }) as HTMLFormElement)
    expect(data.get('email')).toBe('yes')
    expect(data.has('sms')).toBe(false)
  })

  it('has no axe violations across states', async () => {
    const { container } = render(
      <>
        <Checkbox label="Unchecked" />
        <Checkbox label="Checked" defaultChecked />
        <Checkbox label="Disabled" disabled />
        <Checkbox label="Disabled checked" disabled defaultChecked />
      </>,
    )
    // color-contrast is disabled: jsdom can't compute layout/colors.
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
