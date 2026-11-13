import { StrictMode, useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Button } from '../Button'
import { Dialog } from './index'

// Tier-2 behavioral a11y (ADR-008). jsdom has no showModal()/inert, so
// vitest.setup.ts stubs the dialog methods: these tests cover naming, focus
// transfer and Escape. Background inertness is browser behaviour, checked in
// Storybook at the visual checkpoint, not asserted here.

function Harness({ nonModal = false, withMarker = false }: { nonModal?: boolean; withMarker?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        nonModal={nonModal}
        title="Remove course?"
        description="Your progress will be deleted."
        actions={
          <>
            <Button data-autofocus={withMarker || undefined} onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger">Remove</Button>
          </>
        }
      />
    </>
  )
}

describe('Dialog — a11y behavior', () => {
  it('is a dialog named by its title and described by its description', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    const dialog = screen.getByRole('dialog', { name: 'Remove course?' })
    expect(dialog).toHaveAccessibleDescription('Your progress will be deleted.')
    expect(screen.getByRole('heading', { name: 'Remove course?', level: 2 })).toBeInTheDocument()
  })

  it('moves focus to the title on open when nothing is marked data-autofocus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(screen.getByRole('heading', { name: 'Remove course?' })).toHaveFocus()
  })

  it('moves focus to the data-autofocus element on open, even though the title comes first', async () => {
    const user = userEvent.setup()
    render(<Harness withMarker />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('keeps the title out of the Tab order', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    await user.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    expect(screen.getByRole('heading', { name: 'Remove course?' })).toHaveAttribute('tabindex', '-1')
  })

  it('returns focus to the trigger when closed with the Close button', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes on Escape in a modal dialog through the cancel event, preventing the native close', () => {
    const onOpenChange = vi.fn()
    render(<Dialog open onOpenChange={onOpenChange} title="Remove course?" />)
    const dialog = screen.getByRole('dialog')

    const cancel = createEvent('cancel', dialog, { cancelable: true })
    fireEvent(dialog, cancel)
    expect(cancel.defaultPrevented).toBe(true)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on Escape in a non-modal dialog and returns focus', async () => {
    const user = userEvent.setup()
    render(<Harness nonModal />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('resyncs open when the browser closes the dialog itself', () => {
    const onOpenChange = vi.fn()
    render(<Dialog open onOpenChange={onOpenChange} title="Remove course?" />)
    const dialog = screen.getByRole('dialog')

    dialog.removeAttribute('open')
    fireEvent(dialog, new Event('close'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('stays open when its open effect re-runs (StrictMode, toggling nonModal)', async () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <StrictMode>
        <Dialog open onOpenChange={onOpenChange} title="Remove course?" />
      </StrictMode>,
    )
    rerender(
      <StrictMode>
        <Dialog open nonModal onOpenChange={onOpenChange} title="Remove course?" />
      </StrictMode>,
    )
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveAttribute('open')
  })

  it('moves Tab and Shift+Tab through the controls in DOM order', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    await user.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Remove' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it('returns focus to the trigger after a modal Escape (cancel)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)

    fireEvent(screen.getByRole('dialog'), createEvent('cancel', screen.getByRole('dialog'), { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes a modal once per Escape: through cancel, never through keydown', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<Dialog open onOpenChange={onOpenChange} title="Remove course?" />)

    await user.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, createEvent('cancel', dialog, { cancelable: true }))
    expect(onOpenChange).toHaveBeenCalledTimes(1)
  })

  it('has no aria-describedby without a description, and honours headingLevel', () => {
    render(<Dialog open onOpenChange={() => {}} title="Remove course?" headingLevel={3} />)

    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby')
    expect(screen.getByRole('heading', { name: 'Remove course?', level: 3 })).toBeInTheDocument()
  })

  it('does not take focus back when the consumer moved it in onOpenChange', async () => {
    const user = userEvent.setup()
    function MovesFocus() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open</Button>
          <Button id="elsewhere">Elsewhere</Button>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              document.getElementById('elsewhere')?.focus()
              setOpen(next)
            }}
            title="Remove course?"
          />
        </>
      )
    }
    render(<MovesFocus />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()
  })

  it('does not throw or steal focus when the trigger is gone by the time it closes', async () => {
    const user = userEvent.setup()
    function RemovesTrigger() {
      const [open, setOpen] = useState(false)
      const [showTrigger, setShowTrigger] = useState(true)
      return (
        <>
          {showTrigger && <Button onClick={() => { setOpen(true); }}>Open</Button>}
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setShowTrigger(false)
              setOpen(next)
            }}
            title="Remove course?"
          />
        </>
      )
    }
    render(<RemovesTrigger />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(document.body)
  })

  it('makes the attributes Dialog owns a type error', () => {
    // Checked by typecheck, not at runtime: each line must stay a compile error.
    const noop = () => {}
    const invalid = [
      // @ts-expect-error onOpenChange is required
      <Dialog key="a" open title="T" />,
      // @ts-expect-error title is required
      <Dialog key="b" open onOpenChange={noop} />,
      // @ts-expect-error role is owned by Dialog
      <Dialog key="c" open onOpenChange={noop} title="T" role="alertdialog" />,
      // @ts-expect-error the accessible name comes from title
      <Dialog key="d" open onOpenChange={noop} title="T" aria-label="Other" />,
      // @ts-expect-error cancel is owned by Dialog
      <Dialog key="e" open onOpenChange={noop} title="T" onCancel={noop} />,
      // @ts-expect-error close is owned by Dialog
      <Dialog key="f" open onOpenChange={noop} title="T" onClose={noop} />,
      // @ts-expect-error the name comes from title
      <Dialog key="g" open onOpenChange={noop} title="T" aria-labelledby="x" />,
      // @ts-expect-error the description comes from description
      <Dialog key="h" open onOpenChange={noop} title="T" aria-describedby="x" />,
      // @ts-expect-error the browser sets aria-modal
      <Dialog key="i" open onOpenChange={noop} title="T" aria-modal />,
    ]
    expect(invalid).toHaveLength(9)
  })

  it('has no axe violations while open', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
