import type { ComponentType } from 'react'
import '../../../../packages/components/src/styles/tokens.css'
import { argOption, storyArgs } from './stories'

// Usage overview (prototype): the component once per option of one variant
// axis, built from the Default story's args with only that axis changed. A
// spec constraint the option triggers is honoured: its `ignore` props are
// dropped and its `require` props filled (aria-label with the option name,
// anything else with the first option the story's controls offer). Each
// sample is named by a badge under it, with no leader: it labels the whole sample, not a part.
type Constraint = { if: Record<string, unknown>; require?: string[]; ignore?: string[] }

const components = import.meta.glob<Record<string, ComponentType<Record<string, unknown>>>>(
  '../../../../packages/components/src/components/*/index.tsx',
  { eager: true },
)

function sampleProps(name: string, axis: string, option: string, constraints: Constraint[]) {
  const props: Record<string, unknown> = { ...storyArgs(name, 'stories', 'Default'), [axis]: option }
  for (const c of constraints) {
    const applies = Object.entries(c.if).every(([k, v]) => (v === '*' ? props[k] !== undefined : props[k] === v))
    if (!applies) continue
    for (const p of c.ignore ?? []) delete props[p]
    for (const p of c.require ?? []) props[p] ??= p === 'aria-label' ? option : argOption(name, p)
  }
  return props
}

export default function VariantOverview({ name, axis, options, constraints = [] }: { name: string; axis: string; options: string[]; constraints?: Constraint[] }) {
  const Component = components[`../../../../packages/components/src/components/${name}/index.tsx`][name]
  return (
    <div className="variant-overview">
      <div className="variant-overview-stage">
        {options.map((option) => (
          <div key={option} className="variant-callout">
            <div className="ds-example" data-component={name}>
              <Component {...sampleProps(name, axis, option, constraints)} />
            </div>
            <span className="variant-badge">{option}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
