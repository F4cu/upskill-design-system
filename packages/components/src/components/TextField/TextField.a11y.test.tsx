import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { TextField } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic ARIA contract from the
// metadata (role: textbox; aria-invalid + aria-describedby on error) that the
// static jsx-a11y lint can't see: the label-to-input association (including when
// hidden), typing updates the value, and the error state wires aria-invalid and
// aria-describedby to a role=alert message.

describe('TextField — a11y behavior', () => {
  it('exposes the textbox role with the label as the accessible name', () => {
    render(<TextField label="Email" />)
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument()
  })

  it('keeps the accessible name when the label is visually hidden (hideLabel)', () => {
    render(<TextField label="Search" hideLabel />)
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument()
  })

  it('focuses on Tab and updates the value as the user types', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TextField label="Email" onChange={onChange} />)

    const input = screen.getByRole('textbox', { name: 'Email' })
    await user.tab()
    expect(input).toHaveFocus()

    await user.type(input, 'hi')
    expect(onChange).toHaveBeenCalled()
    expect(input).toHaveValue('hi')
  })

  it('sets aria-invalid and aria-describedby to a role=alert message in the error state', () => {
    render(<TextField label="Email" error="Email is required" />)

    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input).toHaveAttribute('aria-invalid', 'true')

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Email is required')
    expect(input).toHaveAttribute('aria-describedby', alert.id)
  })

  it('has no axe violations in default and error states', async () => {
    const { container } = render(
      <>
        <TextField label="Email" />
        <TextField label="Password" error="Password is required" />
      </>,
    )
    // color-contrast is disabled: jsdom can't compute layout/colors, so it's
    // not judgeable here (contrast stays with visual review + the addon-a11y panel).
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
