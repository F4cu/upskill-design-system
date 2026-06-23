import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Accordion, AccordionItem } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic ARIA contract:
// aria-expanded toggling, aria-controls/aria-labelledby wiring, region role,
// keyboard activation, and an axe scan.

describe('AccordionItem — a11y behavior', () => {
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
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('sets aria-expanded=true and shows region when opened', async () => {
    const user = userEvent.setup()
    render(
      <AccordionItem title="Module 1" subtitle="2 hours">
        <p>Panel content</p>
      </AccordionItem>,
    )

    const trigger = screen.getByRole('button', { name: /Module 1/i })
    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('region')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent('Panel content')
  })

  it('aria-controls on trigger matches id of the region panel in both collapsed and expanded states', async () => {
    const user = userEvent.setup()
    render(
      <AccordionItem title="Module 1">
        <p>Content</p>
      </AccordionItem>,
    )

    const trigger = screen.getByRole('button', { name: /Module 1/i })
    // Panel is always in the DOM (hidden attribute), so aria-controls is always valid.
    const panel = screen.getByRole('region', { hidden: true })
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id)

    await user.click(trigger)
    expect(trigger.getAttribute('aria-controls')).toBe(screen.getByRole('region').id)
  })

  it('panel aria-labelledby points back to the trigger', async () => {
    const user = userEvent.setup()
    render(
      <AccordionItem title="Module 1">
        <p>Content</p>
      </AccordionItem>,
    )

    await user.click(screen.getByRole('button', { name: /Module 1/i }))

    const trigger = screen.getByRole('button', { name: /Module 1/i })
    const panel = screen.getByRole('region')
    expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id)
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

  it('Tab moves through focusable panel content then to the next trigger (keyboardInteractions: Tab)', async () => {
    const user = userEvent.setup()
    render(
      <Accordion>
        <AccordionItem title="Module 1" defaultOpen>
          <a href="#">Lesson link</a>
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
