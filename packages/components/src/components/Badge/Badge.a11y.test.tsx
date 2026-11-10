import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Badge } from './index'

// Badge is non-interactive (spec accessibility.notes). The prop type omits the
// handlers and focus attributes that would make it a fake button (issue #152).

describe('Badge — a11y behavior', () => {
  it('renders its label as inline text and stays out of the tab order', async () => {
    const user = userEvent.setup()
    const { container } = render(<Badge>New</Badge>)

    expect(screen.getByText('New')).toBeInTheDocument()
    await user.tab()
    expect(document.body).toHaveFocus()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('rejects interactive props at the type level', () => {
    const invalid = [
      // @ts-expect-error Badge is not clickable
      <Badge key="click" onClick={() => {}}>New</Badge>,
      // @ts-expect-error Badge takes no keyboard handler
      <Badge key="keydown" onKeyDown={() => {}}>New</Badge>,
      // @ts-expect-error Badge takes no keyboard handler
      <Badge key="keyup" onKeyUp={() => {}}>New</Badge>,
      // @ts-expect-error Badge is not focusable
      <Badge key="tab" tabIndex={0}>New</Badge>,
      // @ts-expect-error Badge has no role
      <Badge key="role" role="button">New</Badge>,
    ]
    expect(invalid).toHaveLength(5)
  })
})
