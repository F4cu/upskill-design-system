import '../../../../packages/components/src/styles/tokens.css'
import { STAGED, StoryRender } from './stories'
import type { StoryFile } from './stories'

// A live, interactive example on a component page (ADR-030 Phase A2): the
// real component rendered from one of its stories, inside the scoped reset.
// A staged overlay renders as a static picture of its open window.
export default function LiveExample({ name, file, exportName, args }: { name: string; file: StoryFile; exportName: string; args?: Record<string, unknown> }) {
  return (
    <div className={STAGED[name] ? 'live-example is-staged' : 'live-example'}>
      <div className="ds-example" data-component={name}>
        <StoryRender name={name} file={file} exportName={exportName} args={args} />
      </div>
    </div>
  )
}
