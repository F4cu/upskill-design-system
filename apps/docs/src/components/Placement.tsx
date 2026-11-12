import '../../../../packages/components/src/styles/tokens.css'
import type { PlacementEntry } from '../placement/types'
import { StoryRender, pascal } from './stories'

// Placement (prototype): Do / Don't example boxes in pairs, as in Material's
// usage guidance. Each box renders the real components with a short caption
// under it; boxes side by side share one canvas height (subgrid rows).
const files = import.meta.glob<{ placement: PlacementEntry[] }>('../placement/*.tsx', { eager: true })

const MAX_CAPTION = 120

export default function Placement({ name }: { name: string }) {
  const entries = files[`../placement/${name}.tsx`].placement
  const long = entries.find((e) => e.caption.length > MAX_CAPTION)
  if (long) throw new Error(`placement/${name}.tsx: caption over ${MAX_CAPTION} characters: "${long.caption}"`)
  return (
    <div className="placement-grid">
      {entries.map((entry, i) => {
        const pattern = 'patterns' in entry.source ? entry.source.patterns : null
        return (
          <figure key={i} className={`placement-card is-${entry.kind}`}>
            <div className="placement-canvas">
              <div className="ds-example" data-component={name}>
                {entry.render ? entry.render() : pattern && <StoryRender name={name} file="patterns.stories" exportName={pascal(pattern)} />}
              </div>
            </div>
            <figcaption>
              <span className="placement-verdict">{entry.kind === 'do' ? 'Do' : "Don't"}</span>
              <p>{entry.caption}</p>
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}
