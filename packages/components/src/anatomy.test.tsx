import { expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { composeStories } from '@storybook/react-vite'
import type { ComponentType } from 'react'

// Anatomy render test (ADR-030). For every spec with anatomyExamples, each
// anatomy part must carry data-part="<name>" in at least one example's render,
// unless the spec says why no example can render it (notRendered). A props
// example renders the component; a pattern example renders the story named
// after the pattern in <Name>.patterns.stories.tsx (overflow-menu →
// OverflowMenu). A part inside its parent's
// builtOn component is found by that component's own marker (builtOnPart).
type Part = { name: string; parent?: string; builtOnPart?: string; notRendered?: string }
type Example = { props?: Record<string, unknown>; pattern?: string }
type Spec = { component: string; anatomy: Part[]; anatomyExamples?: Example[] }

const specs = import.meta.glob<Spec>('./components/*/*.spec.json', { eager: true, import: 'default' })
const components = import.meta.glob<Record<string, ComponentType<Record<string, unknown>>>>(
  './components/*/index.tsx',
  { eager: true },
)
const stories = import.meta.glob<Record<string, unknown>>('./components/*/*.stories.tsx', { eager: true })

const pascal = (kebab: string) => kebab.replace(/(?:^|-)([a-z0-9])/g, (_, c: string) => c.toUpperCase())

function locate(container: Element, part: Part, parts: Part[]): Element | null {
  const parent = part.parent ? parts.find((p) => p.name === part.parent) : undefined
  const scope = parent ? locate(container, parent, parts) : container
  return scope?.querySelector(`[data-part="${part.builtOnPart ?? part.name}"]`) ?? null
}

for (const [file, spec] of Object.entries(specs)) {
  const examples = spec.anatomyExamples
  if (!examples) continue
  const dir = file.slice(0, file.lastIndexOf('/'))

  it(`${spec.component}: every anatomy part carries data-part in an example`, () => {
    const found = new Set<string>()
    for (const example of examples) {
      let Example: ComponentType | undefined
      if (example.pattern) {
        const composed = composeStories(stories[`${dir}/${spec.component}.patterns.stories.tsx`] as never) as Record<string, ComponentType>
        Example = composed[pascal(example.pattern)]
        expect(Example, `story ${pascal(example.pattern)} for pattern "${example.pattern}"`).toBeDefined()
      } else {
        const Component = components[`${dir}/index.tsx`][spec.component]
        Example = () => <Component {...example.props} />
      }
      if (!Example) continue
      const { container } = render(<Example />)
      for (const part of spec.anatomy) if (locate(container, part, spec.anatomy)) found.add(part.name)
      cleanup()
    }
    const missing = spec.anatomy.filter((p) => !p.notRendered && !found.has(p.name)).map((p) => p.name)
    expect(missing, 'anatomy parts with no data-part in any example').toEqual([])
  })
}
