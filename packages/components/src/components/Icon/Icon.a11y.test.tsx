import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { Icon } from './index'

// Icon is decorative by default; label is the only way to name it. Colour comes
// from the ancestor via currentColor. The prop type omits every attribute that
// would override either contract (issue #152).

describe('Icon — a11y behavior', () => {
  it('is hidden from assistive technology without a label', async () => {
    const { container } = render(<Icon name="search" />)
    const svg = container.querySelector('svg')!

    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).not.toHaveAttribute('role')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('is exposed as a named image when label is set', async () => {
    const { container } = render(<Icon name="search" label="Search" />)

    const img = screen.getByRole('img', { name: 'Search' })
    expect(img).not.toHaveAttribute('aria-hidden')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('rejects colour and accessibility overrides at the type level', () => {
    const invalid = [
      // @ts-expect-error colour comes from the ancestor
      <Icon key="color" name="search" color="red" />,
      // @ts-expect-error colour comes from the ancestor
      <Icon key="fill" name="search" fill="red" />,
      // @ts-expect-error colour comes from the ancestor
      <Icon key="stroke" name="search" stroke="red" />,
      // @ts-expect-error no inline style on Icon
      <Icon key="style" name="search" style={{ color: 'red' }} />,
      // @ts-expect-error role is derived from label
      <Icon key="role" name="search" role="button" />,
      // @ts-expect-error aria-hidden is derived from label
      <Icon key="hidden" name="search" aria-hidden={false} />,
      // @ts-expect-error label is the only way to name an icon
      <Icon key="name" name="search" aria-label="Search" />,
    ]
    expect(invalid).toHaveLength(7)
  })
})
