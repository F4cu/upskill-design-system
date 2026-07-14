import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { composeStories } from '@storybook/react-vite'

// Automatic axe sweep over every CSF story (issue #72). Portable stories apply
// the preview decorators (theme/brand data attributes), so each story renders
// as it does in Storybook. Respects addon-a11y story parameters: a story with
// `parameters.a11y.test: 'off'` (or the deprecated `disable: true`) is
// skipped, and `parameters.a11y.config.rules` entries override rule defaults.
const modules = import.meta.glob<Record<string, unknown>>('./**/*.stories.tsx', {
  eager: true,
})

type A11yParam = {
  disable?: boolean
  test?: 'off' | 'todo' | 'error'
  config?: { rules?: { id: string; enabled?: boolean }[] }
}

for (const [path, mod] of Object.entries(modules)) {
  const stories = composeStories(mod as never) as Record<
    string,
    React.ComponentType & { parameters?: { a11y?: A11yParam } }
  >
  describe(path.replace(/^\.\//, ''), () => {
    for (const [name, Story] of Object.entries(stories)) {
      const a11y = Story.parameters?.a11y
      const skipped = a11y?.disable === true || a11y?.test === 'off'
      it.skipIf(skipped)(name, async () => {
        const { container } = render(<Story />)
        // color-contrast needs real layout — jsdom can't compute it; that gap
        // is covered by tokens:contrast-check (ADR-008 amendment).
        const rules: Record<string, { enabled: boolean }> = {
          'color-contrast': { enabled: false },
        }
        for (const rule of a11y?.config?.rules ?? []) {
          rules[rule.id] = { enabled: rule.enabled !== false }
        }
        expect(await axe(container, { rules })).toHaveNoViolations()
      })
    }
  })
}
