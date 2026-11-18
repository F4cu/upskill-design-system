import '../../../../packages/components/src/styles/tokens.css'
import { Text } from '../../../../packages/components/src/components/Text'
import { StoryRender } from './stories'

// Usage "Content" section (ADR-030 amendment 2026-11-18, R1): for a component
// with no variant axis but optional content props, the Default story once per
// option, with that option's args, each named by a badge under it as in the
// variant overview. `text` replaces the body with a subtle Text paragraph
// (options are data in components.mjs, which can't hold JSX). A staged
// overlay renders as its static picture.
type Option = { label: string; args: Record<string, unknown>; text?: string }

export default function ContentOverview({ name, options }: { name: string; options: Option[] }) {
  return (
    <div className="variant-overview is-stacked">
      <div className="variant-overview-stage">
        {options.map(({ label, args, text }) => (
          <div key={label} className="variant-callout">
            <div className="ds-example" data-component={name}>
              <StoryRender
                name={name}
                file="stories"
                exportName="Default"
                args={text ? { ...args, children: <Text color="subtle">{text}</Text> } : args}
              />
            </div>
            <span className="variant-badge">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
