import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Select } from './index'

// Tier-2 behavioral a11y (ADR-008). Select is a custom combobox, so the static
// jsx-a11y lint can't see its dynamic contract (Select.metadata.json →
// accessibility.role "combobox", aria-describedby/aria-invalid on error,
// Space/Enter to open, Escape to close). These tests assert that contract:
// the trigger exposes role=combobox named by its label, aria-expanded toggles
// on click and keyboard, the error wiring points at the role=alert message,
// disabled removes the control from the interaction model, and selecting an
// option updates the value via onValueChange. Plus an axe scan in default and
// error states.

const OPTIONS = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'mx', label: 'Mexico' },
]

describe('Select — a11y behavior', () => {
  it('exposes the combobox role with its label as the accessible name', () => {
    render(<Select label="Country" options={OPTIONS} />)
    const trigger = screen.getByRole('combobox', { name: 'Country' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggles aria-expanded when opened and closed by click', async () => {
    const user = userEvent.setup()
    render(<Select label="Country" options={OPTIONS} />)

    const trigger = screen.getByRole('combobox', { name: 'Country' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens on Enter and closes on Escape (keyboard contract)', async () => {
    const user = userEvent.setup()
    render(<Select label="Country" options={OPTIONS} />)

    const trigger = screen.getByRole('combobox', { name: 'Country' })
    await user.tab()
    expect(trigger).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens on Space (keyboard contract: Space / Enter)', async () => {
    const user = userEvent.setup()
    render(<Select label="Country" options={OPTIONS} />)

    const trigger = screen.getByRole('combobox', { name: 'Country' })
    await user.tab()
    expect(trigger).toHaveFocus()

    await user.keyboard(' ')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('opens on ArrowDown and moves focus to the first option (keyboard contract: Arrow Up / Down)', async () => {
    const user = userEvent.setup()
    render(<Select label="Country" options={OPTIONS} />)

    const trigger = screen.getByRole('combobox', { name: 'Country' })
    await user.tab()
    expect(trigger).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('option', { name: 'United States' })).toHaveFocus()
  })

  it('moves focus to the selected option when it opens with a value', async () => {
    const user = userEvent.setup()
    render(<Select label="Country" options={OPTIONS} defaultValue="ca" />)

    const trigger = screen.getByRole('combobox', { name: 'Country' })
    await user.click(trigger)

    expect(screen.getByRole('option', { name: 'Canada', selected: true })).toHaveFocus()
  })

  it('ArrowDown / ArrowUp navigate between options in the open listbox', async () => {
    const user = userEvent.setup()
    render(<Select label="Country" options={OPTIONS} />)

    await user.click(screen.getByRole('combobox', { name: 'Country' }))

    const [us, ca, mx] = screen.getAllByRole('option')
    expect(us).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(ca).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(mx).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    expect(ca).toHaveFocus()
  })

  it('Escape closes the listbox and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<Select label="Country" options={OPTIONS} />)

    const trigger = screen.getByRole('combobox', { name: 'Country' })
    await user.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('controlled mode — displays the label for the externally provided value', () => {
    const { rerender } = render(<Select label="Country" options={OPTIONS} value="us" onValueChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('United States')

    rerender(<Select label="Country" options={OPTIONS} value="mx" onValueChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('Mexico')
  })

  it('wires the error state to the role=alert message via aria-describedby + aria-invalid', () => {
    render(<Select label="Country" options={OPTIONS} error="Pick a country" />)

    const trigger = screen.getByRole('combobox', { name: 'Country' })
    expect(trigger).toHaveAttribute('aria-invalid', 'true')

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Pick a country')
    expect(trigger).toHaveAttribute('aria-describedby', alert.id)
  })

  it('reflects required as aria-required on the trigger', () => {
    render(<Select label="Country" options={OPTIONS} required />)
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveAttribute('aria-required', 'true')
  })

  it('is disabled and does not open when disabled', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Select label="Country" options={OPTIONS} disabled onValueChange={onValueChange} />)

    const trigger = screen.getByRole('combobox', { name: 'Country' })
    expect(trigger).toBeDisabled()

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('selecting an option calls onValueChange and updates the displayed value', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Select label="Country" options={OPTIONS} onValueChange={onValueChange} />)

    const trigger = screen.getByRole('combobox', { name: 'Country' })
    await user.click(trigger)

    await user.click(screen.getByRole('option', { name: 'Canada' }))

    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('ca')
    expect(trigger).toHaveTextContent('Canada')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('has no axe violations in default and error states', async () => {
    const { container } = render(
      <>
        <Select label="Country" options={OPTIONS} />
        <Select label="Region" options={OPTIONS} error="Pick a region" required />
      </>,
    )
    // color-contrast is disabled: jsdom can't compute layout/colors, so it's
    // not judgeable here (contrast stays with visual review + the addon-a11y panel).
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
