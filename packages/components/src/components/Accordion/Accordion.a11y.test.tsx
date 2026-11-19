import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Accordion, AccordionItem } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic ARIA contract:
// aria-expanded toggling, aria-controls/aria-labelledby wiring, the panel's
// group role, title-only naming with the meta as description, find-in-page
// (hidden=until-found + beforematch), keyboard activation, and an axe scan.
// jsdom exposes onbeforematch, so these run the until-found path; the
// inert + aria-hidden fallback has its own block at the end.

describe('AccordionItem — a11y behavior', () => {
  it('does not submit an enclosing form when the trigger is clicked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    render(
      <form onSubmit={(e) => onSubmit(e.nativeEvent)}>
        <AccordionItem title="Module 1">
          <p>Content</p>
        </AccordionItem>
      </form>,
    )

    await user.click(screen.getByRole('button', { name: /Module 1/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('moves focus to the trigger when a controlled close happens with focus inside the panel', async () => {
    const user = userEvent.setup()
    function Controlled() {
      const [open, setOpen] = useState(true)
      return (
        <AccordionItem title="Module 1" open={open} onOpenChange={setOpen}>
          <button onClick={() => setOpen(false)}>Done</button>
        </AccordionItem>
      )
    }
    render(<Controlled />)

    await user.click(screen.getByRole('button', { name: 'Done' }))

    const trigger = screen.getByRole('button', { name: /Module 1/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('starts collapsed with aria-expanded=false', () => {
    render(
      <AccordionItem title="Module 1" subtitle="2 hours">
        <p>Content</p>
      </AccordionItem>,
    )
    expect(screen.getByRole('button', { name: /Module 1/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByRole('group')).toBeNull()
  })

  it('sets aria-expanded=true and shows the group when opened', async () => {
    const user = userEvent.setup()
    render(
      <AccordionItem title="Module 1" subtitle="2 hours">
        <p>Panel content</p>
      </AccordionItem>,
    )

    const trigger = screen.getByRole('button', { name: /Module 1/i })
    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('group')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent('Panel content')
  })

  it('aria-controls on trigger matches id of the group panel in both collapsed and expanded states', async () => {
    const user = userEvent.setup()
    render(
      <AccordionItem title="Module 1">
        <p>Content</p>
      </AccordionItem>,
    )

    const trigger = screen.getByRole('button', { name: /Module 1/i })
    // Panel is always in the DOM (hidden=until-found when collapsed), so aria-controls is always valid.
    const panel = screen.getByRole('group', { hidden: true })
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id)

    await user.click(trigger)
    expect(trigger.getAttribute('aria-controls')).toBe(screen.getByRole('group').id)
  })

  it('names the trigger and the panel by the title only, and describes the trigger with the meta', async () => {
    const user = userEvent.setup()
    render(
      <AccordionItem title="Module 1" subtitle="2 hours">
        <p>Content</p>
      </AccordionItem>,
    )

    const trigger = screen.getByRole('button', { name: 'Module 1' })
    expect(trigger).toHaveAccessibleName('Module 1')
    expect(trigger).toHaveAccessibleDescription('2 hours')

    await user.click(trigger)
    expect(screen.getByRole('group')).toHaveAccessibleName('Module 1')
  })

  it('has no description when there is no subtitle', () => {
    render(
      <AccordionItem title="Module 1">
        <p>Content</p>
      </AccordionItem>,
    )
    expect(screen.getByRole('button', { name: 'Module 1' })).not.toHaveAttribute('aria-describedby')
  })

  it('toggles on Enter (keyboardInteractions: Enter)', async () => {
    const user = userEvent.setup()
    render(
      <AccordionItem title="Module 1">
        <p>Content</p>
      </AccordionItem>,
    )

    await user.tab()
    const trigger = screen.getByRole('button', { name: /Module 1/i })
    expect(trigger).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggles on Space (keyboardInteractions: Space)', async () => {
    const user = userEvent.setup()
    render(
      <AccordionItem title="Module 1">
        <p>Content</p>
      </AccordionItem>,
    )

    await user.tab()
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: /Module 1/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('respects controlled open prop', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <AccordionItem title="Module 1" open={false} onOpenChange={onOpenChange}>
        <p>Content</p>
      </AccordionItem>,
    )

    const trigger = screen.getByRole('button', { name: /Module 1/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)
    expect(onOpenChange).toHaveBeenCalledWith(true)

    rerender(
      <AccordionItem title="Module 1" open={true} onOpenChange={onOpenChange}>
        <p>Content</p>
      </AccordionItem>,
    )
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('makes passing both open and defaultOpen a type error', () => {
    // Checked by typecheck, not at runtime: the line must stay a compile error.
    const invalid = [
      // @ts-expect-error controlled open and defaultOpen are mutually exclusive
      <AccordionItem key="both" title="Module 1" open defaultOpen>
        <p>Content</p>
      </AccordionItem>,
    ]
    expect(invalid).toHaveLength(1)
  })

  it('Tab moves through focusable panel content then to the next trigger (keyboardInteractions: Tab)', async () => {
    const user = userEvent.setup()
    render(
      <Accordion>
        <AccordionItem title="Module 1" defaultOpen>
          <a href="/lessons/1">Lesson link</a>
        </AccordionItem>
        <AccordionItem title="Module 2">
          <p>Content</p>
        </AccordionItem>
      </Accordion>,
    )

    // Tab into the first trigger
    await user.tab()
    expect(screen.getByRole('button', { name: /Module 1/i })).toHaveFocus()

    // Tab into the panel's focusable child (the link inside the open panel)
    await user.tab()
    expect(screen.getByRole('link', { name: /Lesson link/i })).toHaveFocus()

    // Tab to the second trigger
    await user.tab()
    expect(screen.getByRole('button', { name: /Module 2/i })).toHaveFocus()
  })

  it('hides a collapsed panel with hidden=until-found so find-in-page can reach it', async () => {
    // jsdom + user-event's tab() don't implement until-found's focus and
    // rendering semantics, so assert the attribute itself; Tab-skip was
    // checked in Chromium (Phase 1 of the accordion handoff).
    const user = userEvent.setup()
    render(
      <AccordionItem title="Module 1">
        <a href="/lessons/1">Lesson link</a>
      </AccordionItem>,
    )

    const panel = screen.getByRole('group', { hidden: true })
    expect(panel).toHaveAttribute('hidden', 'until-found')
    expect(panel.inert).toBe(false)

    const trigger = screen.getByRole('button', { name: 'Module 1' })
    await user.click(trigger)
    expect(panel).not.toHaveAttribute('hidden')

    await user.click(trigger)
    expect(panel).toHaveAttribute('hidden', 'until-found')
  })

  it('opens an uncontrolled item on beforematch (find-in-page)', () => {
    render(
      <AccordionItem title="Module 1">
        <p>Findable text</p>
      </AccordionItem>,
    )

    const panel = screen.getByRole('group', { hidden: true })
    act(() => {
      panel.dispatchEvent(new Event('beforematch', { bubbles: true }))
    })
    expect(screen.getByRole('button', { name: 'Module 1' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('asks a controlled item to open on beforematch instead of opening itself', () => {
    const onOpenChange = vi.fn()
    render(
      <AccordionItem title="Module 1" open={false} onOpenChange={onOpenChange}>
        <p>Findable text</p>
      </AccordionItem>,
    )

    const panel = screen.getByRole('group', { hidden: true })
    act(() => {
      panel.dispatchEvent(new Event('beforematch', { bubbles: true }))
    })
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: 'Module 1' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('has no axe violations with a focusable descendant in a collapsed panel', async () => {
    const { container } = render(
      <Accordion>
        <AccordionItem title="Module 1">
          <a href="/lessons/1">Lesson link</a>
        </AccordionItem>
      </Accordion>,
    )

    expect(
      await axe(container, { rules: { 'color-contrast': { enabled: false } } }),
    ).toHaveNoViolations()
  })

  it('has no axe violations in collapsed and expanded states', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Accordion>
        <AccordionItem title="Module 1" subtitle="2 hours">
          <p>Panel one</p>
        </AccordionItem>
        <AccordionItem title="Module 2" defaultOpen>
          <p>Panel two</p>
        </AccordionItem>
      </Accordion>,
    )

    // color-contrast disabled: jsdom cannot compute layout/colors.
    expect(
      await axe(container, { rules: { 'color-contrast': { enabled: false } } }),
    ).toHaveNoViolations()

    await user.click(screen.getByRole('button', { name: /Module 1/i }))
    expect(
      await axe(container, { rules: { 'color-contrast': { enabled: false } } }),
    ).toHaveNoViolations()
  })
})

describe('AccordionItem — a11y behavior without beforematch support', () => {
  it('falls back to inert + aria-hidden while collapsed', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'onbeforematch')
    // @ts-expect-error removing the handler to simulate a browser without until-found
    delete Document.prototype.onbeforematch
    vi.resetModules()
    try {
      const { AccordionItem: FallbackItem } = await import('./index')
      const user = userEvent.setup()
      render(
        <FallbackItem title="Module 1">
          <a href="/lessons/1">Lesson link</a>
        </FallbackItem>,
      )

      const panel = screen.getByRole('group', { hidden: true })
      expect(panel).not.toHaveAttribute('hidden')
      expect(panel.inert).toBe(true)
      expect(panel).toHaveAttribute('aria-hidden', 'true')

      await user.click(screen.getByRole('button', { name: 'Module 1' }))
      expect(panel.inert).toBe(false)
      expect(panel).not.toHaveAttribute('aria-hidden')
    } finally {
      if (descriptor) Object.defineProperty(Document.prototype, 'onbeforematch', descriptor)
      vi.resetModules()
    }
  })
})
