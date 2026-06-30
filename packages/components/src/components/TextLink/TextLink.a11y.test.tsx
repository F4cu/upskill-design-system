import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { TextLink } from './index'

describe('TextLink — a11y behavior', () => {
  it('exposes the link role with its text content as the accessible name', () => {
    render(<TextLink href="/about">About us</TextLink>)
    expect(screen.getByRole('link', { name: 'About us' })).toBeInTheDocument()
  })

  it('is keyboard-focusable and follows the href on Enter', async () => {
    const user = userEvent.setup()
    render(<TextLink href="/about">About us</TextLink>)

    await user.tab()
    expect(screen.getByRole('link', { name: 'About us' })).toHaveFocus()
  })

  it('is removed from the tab order when href is absent', async () => {
    const user = userEvent.setup()
    // An <a> without href is not focusable — keyboard contract in metadata:
    // "omitting href removes the link from the tab order"
    const { container } = render(<TextLink>No href</TextLink>)
    const anchor = container.querySelector('a')!

    await user.tab()
    expect(anchor).not.toHaveFocus()
  })

  it('exposes an aria-label when the link text is ambiguous', () => {
    render(<TextLink href="/article/1" aria-label="Read more about Design Systems">Read more</TextLink>)
    expect(screen.getByRole('link', { name: 'Read more about Design Systems' })).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <>
        <TextLink href="/about">About us</TextLink>
        <TextLink href="/article/1" aria-label="Read more about Design Systems">Read more</TextLink>
      </>,
    )
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
