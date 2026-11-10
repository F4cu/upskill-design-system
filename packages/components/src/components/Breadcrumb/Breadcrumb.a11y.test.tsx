import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { Breadcrumb } from './index'

// Tier-2 behavioral a11y (ADR-008): the last item is the current page, so it
// renders as plain text with aria-current=page and never as a link, even when
// the caller passes an href for it (spec constraint last-item-no-href).

describe('Breadcrumb — a11y behavior', () => {
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Courses', href: '/courses' },
    { label: 'Design Systems', href: '/courses/design-systems' },
  ]

  it('names the landmark and links every item but the last', () => {
    render(<Breadcrumb items={items} />)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Home', 'Courses'])
  })

  it('renders the last item as the current page and ignores its href', () => {
    render(<Breadcrumb items={items} />)
    const current = screen.getByText('Design Systems')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current.closest('a')).toBeNull()
  })

  it('has no axe violations', async () => {
    const { container } = render(<Breadcrumb items={items} />)
    // color-contrast disabled: jsdom cannot compute layout/colors.
    expect(
      await axe(container, { rules: { 'color-contrast': { enabled: false } } }),
    ).toHaveNoViolations()
  })
})
