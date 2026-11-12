import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { composeStories } from '@storybook/react-vite'
import * as patterns from '../components/CardVertical/CardVertical.patterns.stories'

// Tier-2 a11y for the useCarousel pattern (ADR-006 amendment 2026-11-12, #160),
// driven through its reference consumer, the CardCarousel story.
const { CardCarousel } = composeStories(patterns)

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

function track() {
  return screen.getByRole('list', { name: 'Saved courses' })
}

describe('useCarousel — CardCarousel pattern a11y', () => {
  it('exposes the track as a list named by the heading, one item per card', () => {
    render(<CardCarousel />)
    expect(within(track()).getAllByRole('listitem')).toHaveLength(6)
  })

  it('names the arrows after the carousel', () => {
    render(<CardCarousel />)
    expect(screen.getByRole('button', { name: 'Previous saved courses' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next saved courses' })).toBeEnabled()
  })

  it('announces the visible range politely after an arrow press, not on load', async () => {
    const user = userEvent.setup()
    const { container } = render(<CardCarousel />)
    const live = container.querySelector('[aria-live="polite"]')!
    expect(live).toHaveTextContent('')
    await user.click(screen.getByRole('button', { name: 'Next saved courses' }))
    expect(live).toHaveTextContent('Showing 2 to 4 of 6')
    await user.click(screen.getByRole('button', { name: 'Previous saved courses' }))
    expect(live).toHaveTextContent('Showing 1 to 3 of 6')
  })

  it('moves the window to a clipped card when Tab focuses it', async () => {
    const user = userEvent.setup()
    render(<CardCarousel />)
    const saveButtons = within(track()).getAllByRole('button')
    for (let i = 0; i < 5; i++) await user.tab()
    expect(saveButtons[4]).toHaveFocus()
    expect(track().style.transform).toContain('-2 *')
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(saveButtons[0]).toHaveFocus()
    expect(track().style.transform).toContain('-0 *')
  })

  it('has no axe violations', async () => {
    const { container } = render(<CardCarousel />)
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })
})
