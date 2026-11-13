import { useLayoutEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import '../../../../packages/components/src/styles/tokens.css'
import { StoryRender, pascal, storyArgs } from './stories'

// Anatomy diagram (ADR-030 Phase A2, refined in A3). Renders the real component
// from source for each anatomyExamples entry and labels the parts the entry
// lists in `mark` by name, found by their data-part markers (the lookup
// anatomy.test.tsx uses). Unfocused entries are the overview of the main parts;
// a `focus` entry is cropped, at its real size, to one overview part and labels
// its descendants. Callouts sit in the gutters with horizontal or vertical
// hairline leaders only. Positions are measured in the browser; without
// JavaScript the examples still render, unlabelled.
type Part = { name: string; parent?: string; builtOn?: string; builtOnPart?: string; notRendered?: string }
type Example = { props?: Record<string, unknown>; pattern?: string; mark?: string[]; focus?: string }

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

// Each example's marks in anatomy order. An example without mark (a
// single-example spec) marks every renderable part.
function sortMarks(parts: Part[], examples: Example[]) {
  const order = (n: string) => parts.findIndex((p) => p.name === n)
  return examples.map((e) => [...(e.mark ?? parts.filter((p) => !p.notRendered).map((p) => p.name))].sort((a, b) => order(a) - order(b)))
}

// Badges carry the part's name, so a side gutter is as wide as its longest
// badge plus room for a leader.
export const LEADER = 36
export const BOTTOM = 64
export const H = 18
export const GAP = 10
export const PAD = 8
export const OUTSET = 6
export const badgeW = (label: string) => Math.max(H, label.length * 7 + 8)
export const gutterFor = (items: { label: string }[]) => Math.max(0, ...items.map((i) => badgeW(i.label))) + LEADER

export type Rect = { x: number; y: number; w: number; h: number }
export type Callout = { name: string; label: string; visible?: boolean; rect: Rect; bx: number; by: number; path: string; tx: number; ty: number; outline?: boolean }
export type Hit = Omit<Callout, 'bx' | 'by' | 'path' | 'tx' | 'ty'> & { side?: 'left' | 'right' }

const near = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

// Every leader is one straight line, so a badge must sit level with (or under)
// its part: each item may move only within [lo, hi]. Items keep the order of
// their preferred positions and are pushed apart by their sizes plus GAP, first
// forward, then back; returns the positions and whether any still overlap.
export type Slot = { pref: number; lo: number; hi: number; size: number }
export function place(slots: Slot[]) {
  const pos = slots.map((s) => near(s.pref, s.lo, s.hi))
  const need = (i: number) => (slots[i - 1].size + slots[i].size) / 2 + GAP
  for (let i = 1; i < pos.length; i++) pos[i] = near(Math.max(pos[i], pos[i - 1] + need(i)), slots[i].lo, slots[i].hi)
  for (let i = pos.length - 2; i >= 0; i--) pos[i] = Math.max(slots[i].lo, Math.min(pos[i], pos[i + 1] - need(i + 1)))
  const clash = pos.findIndex((p, i) => i > 0 && p - pos[i - 1] < need(i) - 0.5)
  return { pos, clash }
}

// Overview: badges in the left or right gutter (wide parts on the left, where
// their content starts), each level with a point on its part's edge. A part
// that can't fit on its side moves to the other one.
export function sideLayout(hits: Hit[], width: number): Callout[] {
  const items = hits.map((hit) => {
    const { x, y, w, h } = hit.rect
    const others = hits.filter((o) => o !== hit)
    const inside = (o: Hit) => o.rect.x >= x && o.rect.y >= y && o.rect.x + o.rect.w <= x + w && o.rect.y + o.rect.h <= y + h
    // The outermost part (Root) often has no visible edge: outline it and
    // point at its top corner.
    const outline = others.length > 0 && others.every(inside) && !hit.visible
    const out = outline ? OUTSET : 0
    const slot = { pref: outline ? y + PAD : y + h / 2, lo: y - out + 2, hi: y + h + out - 2, size: H }
    const side: 'left' | 'right' = hit.side ?? (w > (width - 2 * gutterFor(hits)) * 0.6 || x + w / 2 < width / 2 ? 'left' : 'right')
    return { hit, outline, out, slot, side }
  })
  const run = (side: 'left' | 'right') => {
    const list = items.filter((i) => i.side === side).sort((a, b) => a.slot.pref - b.slot.pref)
    return { list, ...place(list.map((i) => i.slot)) }
  }
  for (const side of ['left', 'right'] as const) {
    const { list, clash } = run(side)
    if (clash > 0) list[clash].side = side === 'left' ? 'right' : 'left'
  }
  return (['left', 'right'] as const).flatMap((side) => {
    const { list, pos } = run(side)
    return list.map(({ hit, outline, out }, i) => {
      const half = badgeW(hit.label) / 2
      const bx = side === 'left' ? half + 2 : width - half - 2
      const tx = side === 'left' ? hit.rect.x - out : hit.rect.x + hit.rect.w + out
      const by = pos[i]
      return { ...hit, outline, bx, by, tx, ty: by, path: `M${side === 'left' ? bx + half : bx - half},${by}H${tx}` }
    })
  })
}

// Focus images and short components: badges alternate, left to right, between
// the bottom and top gutters, so neighbouring names don't crowd one row. Each
// sits directly under (or over) its part, with a vertical leader from the
// part's edge. A single part keeps the bottom gutter only. Badges may spill
// past the stage into the surrounding box, [left, right] in stage coordinates,
// so a badge wider than a narrow stage (Button) still centres on its part.
export function bottomLayout(hits: Hit[], left: number, right: number, height: number, floor: number): Callout[] {
  // A part that holds every other marked part (Button's Root) leads from near
  // its left edge, so it reads first and clear of its children.
  const holdsAll = (hit: Hit) =>
    hits.length > 1 && hits.every((o) => o === hit || (o.rect.x >= hit.rect.x && o.rect.x + o.rect.w <= hit.rect.x + hit.rect.w))
  const list = hits
    .map((hit) => {
      const { x, w } = hit.rect
      const half = badgeW(hit.label) / 2
      return { hit, slot: { pref: holdsAll(hit) ? x + 12 : x + w / 2, lo: Math.max(x + 4, left + half), hi: Math.min(x + w - 4, right - half), size: badgeW(hit.label) } }
    })
    .sort((a, b) => a.slot.pref - b.slot.pref)
  const ceiling = height - floor
  return [0, 1].flatMap((row) => {
    const items = list.filter((_, i) => i % 2 === row)
    const { pos } = place(items.map((i) => i.slot))
    const top = row === 1
    const by = top ? BOTTOM / 2 : height - BOTTOM / 2
    return items.map(({ hit }, i) => {
      const ty = top ? Math.max(hit.rect.y, ceiling) : Math.min(hit.rect.y + hit.rect.h, floor)
      return { ...hit, bx: pos[i], by, tx: pos[i], ty, path: `M${pos[i]},${ty}V${top ? by + H / 2 : by - H / 2}` }
    })
  })
}

type StageProps = {
  name: string
  example: Example
  parts: Part[]
  marks: string[]
  active: string | null
  setActive: (name: string | null) => void
}

type Crop = { x: number; y: number; w: number; h: number; s: number; natural: number }

function Stage({ name, example, parts, marks, active, setActive }: StageProps) {
  const stage = useRef<HTMLDivElement>(null)
  const exampleRef = useRef<HTMLDivElement>(null)
  const [crop, setCrop] = useState<Crop | null>(null)
  const [callouts, setCallouts] = useState<Callout[]>([])
  // A component too short to stack its badges in the side gutters (Button)
  // takes them below, like a focus image.
  const [compact, setCompact] = useState(false)
  const below = Boolean(example.focus) || compact
  const focus = example.focus ? parts.find((p) => p.name === example.focus) : undefined

  useLayoutEffect(() => {
    const el = stage.current!
    const measure = () => {
      const origin = el.getBoundingClientRect()
      const box = (el.closest('.anatomy-example') ?? el).getBoundingClientRect()
      const ex = exampleRef.current!.getBoundingClientRect()
      const scale = crop?.s ?? 1
      if (focus) {
        const node = locate(el, focus, parts)
        if (node) {
          // Crop to the focus part's height but only the width its labelled
          // parts span: Meta is a full-width row with its items on the left,
          // and the detail should centre what it shows.
          const r = node.getBoundingClientRect()
          const marked = marks.flatMap((n) => {
            const m = locate(el, parts.find((p) => p.name === n)!, parts)
            return m ? [m.getBoundingClientRect()] : []
          })
          const left = marked.length ? Math.min(...marked.map((m) => m.left)) : r.left
          const right = marked.length ? Math.max(...marked.map((m) => m.right)) : r.right
          const x = (left - ex.left) / scale - PAD
          const y = (r.top - ex.top) / scale - PAD
          const w = (right - left) / scale + 2 * PAD
          const h = r.height / scale + 2 * PAD
          const next = { x, y, w, h, s: 1, natural: ex.width / scale }
          if (!crop || Math.abs(crop.x - x) + Math.abs(crop.y - y) + Math.abs(crop.w - w) + Math.abs(crop.h - h) > 1) {
            setCrop(next)
            return
          }
        }
      }
      const hits = marks.flatMap((n) => {
        const part = parts.find((p) => p.name === n)!
        const node = locate(el, part, parts)
        if (!node) return []
        const r = node.getBoundingClientRect()
        const style = getComputedStyle(node)
        const visible = style.borderTopWidth !== '0px' || style.boxShadow !== 'none' || !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(style.backgroundColor)
        return [{ name: n, label: n, visible, rect: { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height } }]
      })
      if (!focus && !compact && ex.height < hits.length * (H + GAP)) {
        setCompact(true)
        return
      }
      const next = below
        ? bottomLayout(hits, box.left - origin.left + PAD, box.right - origin.left - PAD, origin.height, origin.height - BOTTOM)
        : sideLayout(hits, origin.width)
      setCallouts((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }
    measure()
    // Web fonts and images can move parts without resizing the stage.
    let live = true
    document.fonts.ready.then(() => live && measure())
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    observer.observe(exampleRef.current!)
    return () => {
      live = false
      observer.disconnect()
    }
  }, [parts, marks, focus, crop, compact, below])

  const highlighted = callouts.find((c) => c.name === active)
  const inner = (
    <div
      ref={exampleRef}
      className="ds-example"
      data-component={name}
      style={crop ? { position: 'absolute', width: crop.natural, transform: `translate(${-crop.x * crop.s}px, ${-crop.y * crop.s}px) scale(${crop.s})`, transformOrigin: '0 0' } : undefined}
    >
      {exampleElement(name, example)}
    </div>
  )
  return (
    <div ref={stage} className="anatomy-stage" style={below ? { paddingBottom: BOTTOM, paddingTop: marks.length > 1 ? BOTTOM : undefined } : { paddingInline: gutterFor(marks.map((label) => ({ label }))) }}>
      {focus ? (
        <div className="anatomy-viewport" style={crop ? { width: crop.w * crop.s, height: crop.h * crop.s } : undefined}>
          {inner}
        </div>
      ) : (
        inner
      )}
      <svg className="anatomy-svg" aria-hidden="true">
        {callouts.filter((c) => c.outline).map((c) => (
          <rect key={c.name} className="anatomy-outline" x={c.rect.x - OUTSET} y={c.rect.y - OUTSET} width={c.rect.w + 2 * OUTSET} height={c.rect.h + 2 * OUTSET} rx={4} />
        ))}
        {highlighted && <rect className="anatomy-focus" x={highlighted.rect.x} y={highlighted.rect.y} width={highlighted.rect.w} height={highlighted.rect.h} />}
        {callouts.map((c) => (
          <g key={c.name} className={c.name === active ? 'is-active' : undefined} onMouseEnter={() => setActive(c.name)} onMouseLeave={() => setActive(null)}>
            <g className="anatomy-leader">
              <path d={c.path} />
              <circle className="anatomy-dot" cx={c.tx} cy={c.ty} r={2} />
            </g>
            <rect className="anatomy-badge" x={c.bx - badgeW(c.label) / 2} y={c.by - H / 2} width={badgeW(c.label)} height={H} rx={H / 2} />
            <text x={c.bx} y={c.by}>{c.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// The variant an example shows, from its props or its pattern story's args,
// falling back to each axis default; an axis with no default and no value is
// left out (Button's shape).
function variantOf(name: string, example: Example, variants: Record<string, unknown>) {
  const args = example.pattern ? storyArgs(name, 'patterns.stories', pascal(example.pattern)) : (example.props ?? {})
  return Object.entries(variants)
    .map(([axis, fallback]) => [axis, args[axis] ?? fallback] as const)
    .filter(([, value]) => value !== null && value !== undefined)
}

// parts is the full anatomy in depth-first order; variants maps each usage
// variant axis to its default. One figure for the overview examples, then one
// per focus part holding every example that zooms into it (CardVertical's
// Action: Favorite and Menu side by side). Each box holds the diagram; the
// caption under the box says what it shows in tags, as the state tiles do: a
// category (Pattern, Detail) as a plain tag, names and prop values as code.
export default function AnatomyOverlay({ name, parts, examples, variants }: { name: string; parts: Part[]; examples: Example[]; variants: Record<string, unknown> }) {
  const [marks] = useState(() => sortMarks(parts, examples))
  const [active, setActive] = useState<string | null>(null)
  const groups = new Map<string, number[]>()
  examples.forEach((e, i) => groups.set(e.focus ?? '', [...(groups.get(e.focus ?? '') ?? []), i]))
  return (
    <div className="anatomy-examples">
      {[...groups].map(([focus, indexes]) => (
          <figure key={focus} className={`anatomy-figure ${focus ? 'is-detail' : 'is-overview'}`}>
            <div className="anatomy-example">
              <div className="anatomy-stages">
                {indexes.map((i) => (
                  <Stage key={i} name={name} example={examples[i]} parts={parts} marks={marks[i]} active={active} setActive={setActive} />
                ))}
              </div>
            </div>
            <figcaption className="anatomy-caption">
              {focus ? (
                <span className="caption-tags"><span className="caption-tag">Detail</span><code>{focus}</code></span>
              ) : (
                indexes.map((i) => {
                  const example = examples[i]
                  return (
                    <span key={i} className="caption-tags">
                      {example.pattern && <><span className="caption-tag">Pattern</span><code>{example.pattern}</code></>}
                      {variantOf(name, example, variants).map(([axis, value]) => <code key={axis}>{`${axis}="${String(value)}"`}</code>)}
                    </span>
                  )
                })
              )}
            </figcaption>
          </figure>
      ))}
    </div>
  )
}
