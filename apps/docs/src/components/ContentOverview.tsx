import '../../../../packages/components/src/styles/tokens.css'
import { StoryRender } from './stories'

// Usage "Content" section (ADR-030 amendment 2026-11-18, R1): for a component
// with no variant axis but optional content props, the Default story once per
// option, with that option's args, each named by a badge under it as in the
// variant overview. A staged overlay renders as its static picture.
export default function ContentOverview({ name, options }: { name: string; options: { label: string; args: Record<string, unknown> }[] }) {
  return (
    <div className="variant-overview is-stacked">
      <div className="variant-overview-stage">
        {options.map(({ label, args }) => (
          <div key={label} className="variant-callout">
            <div className="ds-example" data-component={name}>
              <StoryRender name={name} file="stories" exportName="Default" args={args} />
            </div>
            <span className="variant-badge">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
