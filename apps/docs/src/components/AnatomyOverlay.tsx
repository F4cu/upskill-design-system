import { useLayoutEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import '../../../../packages/components/src/styles/tokens.css'
import { StoryRender, pascal } from './stories'

// Anatomy diagram (ADR-030 Phase A2): renders the real component from source
// for each anatomyExamples entry, then numbers every part it can find by its
// data-part marker, the same lookup anatomy.test.tsx uses. Markers are drawn
// in the browser from measured positions, so they follow theme, brand and
// layout; without JavaScript the examples still render, unnumbered.
type Part = { name: string; parent?: string; builtOnPart?: string; notRendered?: string }
type Example = { props?: Record<string, unknown>; pattern?: string }

const components = import.meta.glob<Record<string, ComponentType<Record<string, unknown>>>>(
  '../../../../packages/components/src/components/*/index.tsx',
  { eager: true },
)

function locate(root: Element, part: Part, parts: Part[]): Element | null {
  const parent = part.parent ? parts.find((p) => p.name === part.parent) : undefined
  const scope = parent ? locate(root, parent, parts) : root
  return scope?.querySelector(`[data-part="${part.builtOnPart ?? part.name}"]`) ?? null
}

// A pattern example renders the story named after it in PascalCase, with its
// decorators, the same way the Usage page renders it.
function exampleElement(name: string, example: Example) {
  if (example.pattern) return <StoryRender name={name} file="patterns.stories" exportName={pascal(example.pattern)} />
  const Component = components[`../../../../packages/components/src/components/${name}/index.tsx`][name]
  return <Component {...example.props} />
}

type Marker = { n: number; name: string; x: number; y: number; w: number; h: number; bx?: number }

type FrameProps = { name: string; example: Example; parts: Part[]; marked: string[]; numbers: Map<string, number> }

function Frame({ name, example, parts, marked, numbers }: FrameProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [markers, setMarkers] = useState<Marker[]>([])

  useLayoutEffect(() => {
    const frame = ref.current!
    const measure = () => {
      const origin = frame.getBoundingClientRect()
      const next: Marker[] = []
      for (const part of parts) {
        if (!marked.includes(part.name)) continue
        const el = locate(frame, part, parts)
        if (!el) continue
        const r = el.getBoundingClientRect()
        next.push({ n: numbers.get(part.name)!, name: part.name, x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height })
      }
      // Nested parts often share a top-left corner (Root, Media, Thumbnail):
      // step a colliding badge right until it sits clear of the others.
      const placed: { x: number; y: number }[] = []
      for (const m of next) {
        let bx = m.x
        while (placed.some((p) => Math.abs(p.x - bx) < 20 && Math.abs(p.y - m.y) < 20)) bx += 22
        placed.push({ x: bx, y: m.y })
        Object.assign(m, { bx })
      }
      setMarkers(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [parts, marked, numbers])

  const label = example.pattern ? `Pattern ${example.pattern}` : `Example with ${Object.keys(example.props ?? {}).join(', ')}`
  return (
    <figure className="anatomy-example">
      <div className="anatomy-stage">
        <div ref={ref} className="ds-example" data-component={name}>
          {exampleElement(name, example)}
        </div>
        <svg className="anatomy-svg" aria-hidden="true">
          {markers.map((m) => (
            <g key={m.name}>
              <rect x={m.x} y={m.y} width={m.w} height={m.h} />
              <circle cx={m.bx} cy={m.y} r={10} />
              <text x={m.bx} y={m.y}>{m.n}</text>
            </g>
          ))}
        </svg>
      </div>
      <figcaption>
        {label}: parts {markers.length ? markers.map((m) => m.n).sort((a, b) => a - b).join(', ') : 'measured in the browser'}
      </figcaption>
    </figure>
  )
}

// parts is the full anatomy in legend order (it numbers the markers and
// resolves parent chains); marked is the subset that gets a marker.
export default function AnatomyOverlay({ name, parts, marked, examples }: { name: string; parts: Part[]; marked: string[]; examples: Example[] }) {
  const numbers = new Map(parts.map((p, i) => [p.name, i + 1]))
  return (
    <div className="anatomy">
      <div className="anatomy-examples">
        {examples.map((example, i) => (
          <Frame key={i} name={name} example={example} parts={parts} marked={marked} numbers={numbers} />
        ))}
      </div>
    </div>
  )
}
