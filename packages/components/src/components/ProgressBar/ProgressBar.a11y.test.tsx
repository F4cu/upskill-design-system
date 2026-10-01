import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { ProgressBar } from './index'

// ProgressBar is a display component, so a11y-coverage doesn't require this
// test; it pins the naming contract: exactly one of label / aria-labelledby
// names the bar, and the value is exposed through the ARIA value attributes.

describe('ProgressBar — a11y contract', () => {
  it('is named by label, defaulting to "Progress"', () => {
    const { rerender } = render(<ProgressBar value={40} />)
    expect(screen.getByRole('progressbar', { name: 'Progress' })).toBeInTheDocument()

    rerender(<ProgressBar value={40} label="Design Basics progress" />)
    expect(screen.getByRole('progressbar', { name: 'Design Basics progress' })).toBeInTheDocument()
  })

  it('is named by aria-labelledby instead of aria-label when given', () => {
    render(
      <>
        <h3 id="course-title">Design Basics</h3>
        <ProgressBar value={40} aria-labelledby="course-title" />
      </>,
    )
    const bar = screen.getByRole('progressbar', { name: 'Design Basics' })
    expect(bar).not.toHaveAttribute('aria-label')
  })

  it('exposes the clamped value', () => {
    render(<ProgressBar value={140} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('has no axe violations', async () => {
    const { container } = render(<ProgressBar value={40} label="Design Basics progress" />)
    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(results).toHaveNoViolations()
  })
})
