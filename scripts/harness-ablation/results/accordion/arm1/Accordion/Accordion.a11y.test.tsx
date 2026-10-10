import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Accordion } from './index'

// Tier-2 behavioral a11y (ADR-008). APG Accordion/Disclosure contract: each
// title is a heading wrapping a native button whose aria-expanded tracks the
// section, aria-controls points at a region labelled by that button, and the
// region is hidden while collapsed. Sections toggle independently.

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

const ITEMS = [
  { title: 'The Anthropologist', subtitle: '4 hours, 30min', content: 'Observes people.' },
  { title: 'The Experimenter', subtitle: '4 hours, 30min', content: 'Tests ideas.', defaultOpen: true },
]

describe('Accordion — a11y behavior', () => {
  it('renders titles as level-3 headings by default and honours headingLevel', () => {
    const { rerender } = render(<Accordion items={ITEMS} />)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)

    rerender(<Accordion items={ITEMS} headingLevel={2} />)
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2)
  })

  it('wires aria-expanded, aria-controls and a labelled region', () => {
    render(<Accordion items={ITEMS} />)
    const closed = screen.getByRole('button', { name: /The Anthropologist/ })
    const open = screen.getByRole('button', { name: /The Experimenter/ })

    expect(closed).toHaveAttribute('aria-expanded', 'false')
    expect(open).toHaveAttribute('aria-expanded', 'true')

    const region = screen.getByRole('region', { name: /The Experimenter/ })
    expect(open).toHaveAttribute('aria-controls', region.id)
    expect(region).toHaveTextContent('Tests ideas.')
    expect(screen.queryByText('Observes people.')).not.toBeVisible()
  })

  it('toggles a section with Enter and Space, independently of the others', async () => {
    const user = userEvent.setup()
    render(<Accordion items={ITEMS} />)
    const first = screen.getByRole('button', { name: /The Anthropologist/ })
    const second = screen.getByRole('button', { name: /The Experimenter/ })

    await user.tab()
    expect(first).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(second).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Observes people.')).toBeVisible()

    await user.keyboard(' ')
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(first).toHaveFocus()

    await user.tab()
    expect(second).toHaveFocus()
  })

  it('reports changes and follows the app in controlled mode', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const items = [{ title: 'Module', content: 'Body', open: false, onOpenChange }]
    const { rerender } = render(<Accordion items={items} />)
    const button = screen.getByRole('button', { name: 'Module' })

    await user.click(button)
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(button).toHaveAttribute('aria-expanded', 'false')

    rerender(<Accordion items={[{ ...items[0], open: true }]} />)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await user.click(button)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('has no axe violations', async () => {
    const { container } = render(<Accordion items={ITEMS} />)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })
})
