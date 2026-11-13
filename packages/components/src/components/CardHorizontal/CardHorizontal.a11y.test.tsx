import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { CardHorizontal } from './index'

// Tier-2 behavioral a11y (ADR-008). With href the card is a stretched link:
// the <a> sits inside the heading, is named by the title, and is the card's
// only tab stop. Without href the card is static.

const TITLE = 'Introduction to UX Design'
const HREF = '/courses/intro-ux'

const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

describe('CardHorizontal — a11y behavior', () => {
  it('names the article by the title', () => {
    render(<CardHorizontal title={TITLE} />)
    expect(screen.getByRole('article', { name: TITLE })).toBeInTheDocument()
  })

  it('links through the title, inside the heading, named by the title', () => {
    render(<CardHorizontal title={TITLE} href={HREF} />)
    const link = screen.getByRole('link', { name: TITLE })
    expect(link).toHaveAttribute('href', HREF)
    expect(screen.getByRole('heading', { name: TITLE })).toContainElement(link)
  })

  it('makes the link its only tab stop', async () => {
    const user = userEvent.setup()
    render(
      <>
        <CardHorizontal title={TITLE} href={HREF} progress={40} />
        <button type="button">After</button>
      </>,
    )
    await user.tab()
    expect(screen.getByRole('link', { name: TITLE })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  it('renders no link and no tab stop without href', async () => {
    const user = userEvent.setup()
    render(<CardHorizontal title={TITLE} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    await user.tab()
    expect(document.body).toHaveFocus()
  })

  it('has no axe violations, linked and static, default and inverted', async () => {
    const { container } = render(
      <>
        <CardHorizontal title={TITLE} href={HREF} progress={40} duration="3h 20m" certified />
        <CardHorizontal title="Zen Mind" href="/courses/zen" variant="inverted" author="Shunryu Suzuki" duration="4 hours" />
        <CardHorizontal title="Static course" duration="1 hour" />
      </>,
    )
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })
})
