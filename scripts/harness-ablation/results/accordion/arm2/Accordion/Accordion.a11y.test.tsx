import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Accordion } from './index'

// Tier-2 behavioral a11y (ADR-008). Asserts the dynamic ARIA contract from
// Accordion.metadata.json: each header is a button inside a heading of the
// chosen level, aria-expanded toggles with the panel's visibility, the panel
// is a region named by its header, Enter/Space toggle, and Arrow/Home/End
// move focus between headers.

function renderAccordion(props: { headingLevel?: 2 | 3 | 4 | 5 | 6 } = {}) {
  return render(
    <Accordion {...props}>
      <Accordion.Item title="One" subtitle="4 hours, 30min">
        First content
      </Accordion.Item>
      <Accordion.Item title="Two" defaultOpen>
        Second content
      </Accordion.Item>
      <Accordion.Item title="Three">Third content</Accordion.Item>
    </Accordion>,
  )
}

describe('Accordion — a11y behavior', () => {
  it('renders each header as a button inside an h3 by default', () => {
    renderAccordion()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3)
    expect(screen.getByRole('heading', { level: 3, name: /One/ })).toContainElement(
      screen.getByRole('button', { name: /One/ }),
    )
  })

  it('uses the headingLevel prop for the heading level', () => {
    renderAccordion({ headingLevel: 4 })
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(3)
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  it('reflects open state in aria-expanded and panel visibility, with aria-controls wired', () => {
    renderAccordion()
    const one = screen.getByRole('button', { name: /One/ })
    const two = screen.getByRole('button', { name: /Two/ })

    expect(one).toHaveAttribute('aria-expanded', 'false')
    expect(two).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('First content')).not.toBeVisible()
    expect(screen.getByText('Second content')).toBeVisible()

    const panel = screen.getByRole('region', { name: /Two/ })
    expect(two).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveTextContent('Second content')
  })

  it('toggles with Enter and Space and allows several open sections', async () => {
    const user = userEvent.setup()
    renderAccordion()
    const one = screen.getByRole('button', { name: /One/ })
    const two = screen.getByRole('button', { name: /Two/ })

    one.focus()
    await user.keyboard('{Enter}')
    expect(one).toHaveAttribute('aria-expanded', 'true')
    expect(two).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('First content')).toBeVisible()

    await user.keyboard(' ')
    expect(one).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('First content')).not.toBeVisible()
  })

  it('calls onOpenChange and follows the open prop when controlled', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <Accordion>
        <Accordion.Item title="One" open={false} onOpenChange={onOpenChange}>
          Content
        </Accordion.Item>
      </Accordion>,
    )
    const button = screen.getByRole('button', { name: /One/ })

    await user.click(button)
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(button).toHaveAttribute('aria-expanded', 'false')

    rerender(
      <Accordion>
        <Accordion.Item title="One" open onOpenChange={onOpenChange}>
          Content
        </Accordion.Item>
      </Accordion>,
    )
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await user.click(button)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('moves focus between headers with ArrowDown/ArrowUp (wrapping), Home and End', async () => {
    const user = userEvent.setup()
    renderAccordion()
    const [one, two, three] = screen.getAllByRole('button')

    one.focus()
    await user.keyboard('{ArrowDown}')
    expect(two).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(three).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(one).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(three).toHaveFocus()
    await user.keyboard('{Home}')
    expect(one).toHaveFocus()
    await user.keyboard('{End}')
    expect(three).toHaveFocus()
  })

  it('Tab / Shift+Tab move through headers and open-panel content, skipping closed panels', async () => {
    const user = userEvent.setup()
    render(
      <Accordion>
        <Accordion.Item title="One">
          <button type="button">Hidden action</button>
        </Accordion.Item>
        <Accordion.Item title="Two" defaultOpen>
          <button type="button">Visible action</button>
        </Accordion.Item>
        <Accordion.Item title="Three">Third content</Accordion.Item>
      </Accordion>,
    )
    const one = screen.getByRole('button', { name: 'One' })
    const two = screen.getByRole('button', { name: 'Two' })
    const three = screen.getByRole('button', { name: 'Three' })
    const visibleAction = screen.getByRole('button', { name: 'Visible action' })

    await user.tab()
    expect(one).toHaveFocus()
    await user.tab()
    expect(two).toHaveFocus()
    await user.tab()
    expect(visibleAction).toHaveFocus()
    await user.tab()
    expect(three).toHaveFocus()

    await user.tab({ shift: true })
    expect(visibleAction).toHaveFocus()
    await user.tab({ shift: true })
    expect(two).toHaveFocus()
    await user.tab({ shift: true })
    expect(one).toHaveFocus()
  })

  it('ignores Arrow/Home/End pressed inside panel content', async () => {
    const user = userEvent.setup()
    render(
      <Accordion>
        <Accordion.Item title="One" defaultOpen>
          <button type="button">Inner action</button>
        </Accordion.Item>
        <Accordion.Item title="Two">Second content</Accordion.Item>
      </Accordion>,
    )
    const inner = screen.getByRole('button', { name: 'Inner action' })

    inner.focus()
    await user.keyboard('{ArrowDown}')
    expect(inner).toHaveFocus()
    await user.keyboard('{Home}')
    expect(inner).toHaveFocus()
  })

  it('roves only within its own accordion when nested', async () => {
    const user = userEvent.setup()
    render(
      <Accordion>
        <Accordion.Item title="Outer one" defaultOpen>
          <Accordion headingLevel={4}>
            <Accordion.Item title="Inner one">a</Accordion.Item>
            <Accordion.Item title="Inner two">b</Accordion.Item>
          </Accordion>
        </Accordion.Item>
        <Accordion.Item title="Outer two">c</Accordion.Item>
      </Accordion>,
    )
    const outerOne = screen.getByRole('button', { name: 'Outer one' })
    const outerTwo = screen.getByRole('button', { name: 'Outer two' })
    const innerOne = screen.getByRole('button', { name: 'Inner one' })
    const innerTwo = screen.getByRole('button', { name: 'Inner two' })

    innerOne.focus()
    await user.keyboard('{ArrowDown}')
    expect(innerTwo).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(innerOne).toHaveFocus()

    outerOne.focus()
    await user.keyboard('{ArrowDown}')
    expect(outerTwo).toHaveFocus()
  })

  it('names the header by its title, describes it by the subtitle, and hides the chevron', () => {
    renderAccordion()
    const one = screen.getByRole('button', { name: 'One' })
    expect(one).toHaveAccessibleDescription('4 hours, 30min')
    expect(one.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('exposes a closed panel only once it opens, labelled by its header', async () => {
    const user = userEvent.setup()
    renderAccordion()
    const one = screen.getByRole('button', { name: 'One' })

    expect(screen.queryByRole('region', { name: 'One' })).not.toBeInTheDocument()
    await user.click(one)
    const panel = screen.getByRole('region', { name: 'One' })
    expect(one).toHaveAttribute('aria-labelledby', panel.getAttribute('aria-labelledby'))
    expect(one).toHaveAttribute('aria-controls', panel.id)
  })

  it('throws when Accordion.Item is rendered outside Accordion', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Accordion.Item title="Orphan" />)).toThrow(
      'Accordion.Item must be rendered inside Accordion',
    )
  })

  it('has no axe violations', async () => {
    const { container } = renderAccordion()
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
