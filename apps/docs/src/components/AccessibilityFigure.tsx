import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { computeAccessibleName, getRole } from 'dom-accessibility-api'
import '../../../../packages/components/src/styles/tokens.css'
import type { AccessibilityEntry } from '../accessibility/types'
import { BOTTOM, GAP, H, OUTSET, PAD, badgeW, bottomLayout, gutterFor, place, sideLayout } from './AnatomyOverlay'
import type { Callout } from './AnatomyOverlay'

// Accessibility tab figures (prototype). `names` labels the labeling sample's
// marked elements with the Spec anatomy's badges and leaders, each badge its
// position in reading (DOM) order, then lists each one's markup and what a screen reader
// announces, both read from the
// rendered element so the table can't drift from the code. `focus` renders
// the keyboard sample with the shared focus ring (ADR-028) forced on.
const files = import.meta.glob<{ accessibility: AccessibilityEntry }>('../accessibility/*.tsx', { eager: true })

const FOCUSABLE = ':is(button, input, select, textarea):not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
// Disabled controls leave the Tab order but stay in the accessibility tree:
// the focus table lists them, unnumbered, where they sit.
const SKIPPED = ':is(button, input, select, textarea):disabled'
const ATTRS = ['href', 'role','aria-label', 'aria-labelledby', 'aria-describedby', 'aria-pressed', 'aria-expanded', 'aria-haspopup', 'aria-current', 'aria-valuenow', 'alt', 'disabled']
const ROLE_TEXT: Record<string, string> = { progressbar: 'progress bar', img: 'image' }

// An id reads as the variable the source would pass, named after the part
// that carries it (`{titleId}` for CardVertical's Title).
function idName(id: string) {
  const part = document.getElementById(id)?.getAttribute('data-part')
  return part ? `{${part[0].toLowerCase()}${part.slice(1)}Id}` : `{${id}}`
}

// An id shows only when another element points at it (the Title another
// element is labelled by), so the link reads both ways.
const isReferenced = (el: Element) =>
  Boolean(el.id) && [...document.querySelectorAll('[aria-labelledby], [aria-describedby]')].some(
    (o) => o !== el && `${o.getAttribute('aria-labelledby') ?? ''} ${o.getAttribute('aria-describedby') ?? ''}`.split(/\s+/).includes(el.id),
  )

// Content, as markup: text as is, an aria-hidden child as an empty tag (the
// Certified icon), so what's skipped shows too.
function content(el: Element): string {
  return [...el.childNodes]
    .map((n) => {
      if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? ''
      if (!(n instanceof Element)) return ''
      if (n.getAttribute('aria-hidden') === 'true') return `<${n.tagName.toLowerCase()} aria-hidden="true" />`
      return content(n)
    })
    .join('')
    .trim()
}

function markup(el: Element) {
  const attrs = [
    ...(isReferenced(el) ? [`id="${idName(el.id)}"`] : []),
    ...ATTRS.flatMap((a) => {
      const value = el.getAttribute(a)
      if (value === null) return []
      if (a === 'aria-labelledby' || a === 'aria-describedby') return [`${a}="${value.split(/\s+/).map(idName).join(' ')}"`]
      return [value === '' ? a : `${a}="${value}"`]
    }),
  ]
  const tag = el.tagName.toLowerCase()
  const open = attrs.length > 1 ? `<${tag}\n${attrs.map((a) => `  ${a}`).join('\n')}\n>` : `<${tag}${attrs.map((a) => ` ${a}`).join('')}>`
  // A name taken from the content shows that content; so does plain text, and
  // content that is only hidden markup (an icon-only button's glyph), to show
  // it isn't read. A container whose role takes no name from its content (an
  // unnamed article) shows as an empty wrapper.
  const inner = content(el)
  const role = getRole(el)
  const plain = !role || role === 'generic'
  const namedByContent =
    !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby') && (plain || computeAccessibleName(el) !== '')
  const onlyHidden = inner !== '' && !(el.textContent ?? '').trim()
  return inner && (namedByContent || onlyHidden) ? `${open}${inner}</${tag}>` : `${open}</${tag}>`
}

// Roughly what VoiceOver and NVDA say on reaching the element: name, role,
// then state; plain text is read as it is. Wording differs between screen
// readers.
function announce(el: Element) {
  const role = getRole(el) ?? ''
  if (!role || role === 'generic') return el.textContent?.trim() ?? ''
  const pressed = el.getAttribute('aria-pressed')
  const expanded = el.getAttribute('aria-expanded')
  const roleText = pressed !== null ? 'toggle button' : role === 'heading' ? `heading level ${el.tagName.slice(1)}` : (ROLE_TEXT[role] ?? role)
  const parts = [computeAccessibleName(el), roleText]
  if (pressed !== null) parts.push(pressed === 'true' ? 'pressed' : 'not pressed')
  if (expanded !== null) parts.push(expanded === 'true' ? 'expanded' : 'collapsed')
  if (role === 'progressbar') {
    const min = Number(el.getAttribute('aria-valuemin') ?? 0)
    const max = Number(el.getAttribute('aria-valuemax') ?? 100)
    parts.push(`${Math.round(((Number(el.getAttribute('aria-valuenow')) - min) / (max - min)) * 100)}%`)
  }
  if (el.matches(':disabled')) parts.push('dimmed')
  return parts.filter(Boolean).join(', ')
}

// The badge carries only the reading position (1st, 2nd…); the table names
// the part.
function ordinal(n: number) {
  const teen = n % 100 >= 11 && n % 100 <= 13
  return `${n}${teen ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

type Row = { label: string; code: string; says: string }

function Names({ name, entry }: { name: string; entry: AccessibilityEntry }) {
  const { marks } = entry.labeling
  // One element for the figure's life: a sample built with StoryRender makes
  // new component types each render, so re-rendering it on a measure would
  // remount it and drop the classes set on its DOM.
  const sample = useMemo(() => entry.labeling.render(), [entry])
  const stage = useRef<HTMLDivElement>(null)
  const exampleRef = useRef<HTMLDivElement>(null)
  const [callouts, setCallouts] = useState<Callout[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [compact, setCompact] = useState(false)

  useLayoutEffect(() => {
    const el = stage.current!
    const measure = () => {
      const origin = el.getBoundingClientRect()
      const box = (el.closest('.anatomy-example') ?? el).getBoundingClientRect()
      const found = marks.flatMap((m) => {
        const node = exampleRef.current!.querySelector(m.select)
        return node ? [{ mark: m, node }] : []
      })
      // Reading order is DOM order: a container comes before what it holds.
      found.sort((a, b) => (a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      const numbered = found.map(({ mark, node }, i) => ({ node, side: mark.side, badge: ordinal(i + 1), label: `${i + 1}. ${mark.label}` }))
      const hits = numbered.map(({ badge, node, side }) => {
        const r = node.getBoundingClientRect()
        const style = getComputedStyle(node)
        const visible = style.borderTopWidth !== '0px' || style.boxShadow !== 'none' || !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(style.backgroundColor)
        return { name: badge, label: badge, side, visible, rect: { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height } }
      })
      if (!compact && exampleRef.current!.getBoundingClientRect().height < hits.length * (H + GAP)) {
        setCompact(true)
        return
      }
      const next = compact
        ? bottomLayout(hits, box.left - origin.left + PAD, box.right - origin.left - PAD, origin.height, origin.height - BOTTOM)
        : sideLayout(hits, origin.width)
      setCallouts((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
      const nextRows = numbered.map(({ label, node }) => ({ label, code: markup(node), says: announce(node) }))
      setRows((prev) => (JSON.stringify(prev) === JSON.stringify(nextRows) ? prev : nextRows))
    }
    measure()
    let live = true
    document.fonts.ready.then(() => live && measure())
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    observer.observe(exampleRef.current!)
    return () => {
      live = false
      observer.disconnect()
    }
  }, [marks, compact])

  return (
    <figure className="a11y-figure">
      <div className="anatomy-example">
        <div className="anatomy-stages">
          <div
            ref={stage}
            className="anatomy-stage"
            style={compact ? { paddingBottom: BOTTOM, paddingTop: marks.length > 1 ? BOTTOM : undefined } : { paddingInline: gutterFor(marks.map((_, i) => ({ label: ordinal(i + 1) }))) }}
          >
            <div ref={exampleRef} className="ds-example" data-component={name}>
              {sample}
            </div>
            <svg className="anatomy-svg" aria-hidden="true">
              {callouts.filter((c) => c.outline).map((c) => (
                <rect key={c.name} className="anatomy-outline" x={c.rect.x - OUTSET} y={c.rect.y - OUTSET} width={c.rect.w + 2 * OUTSET} height={c.rect.h + 2 * OUTSET} rx={4} />
              ))}
              {callouts.map((c) => (
                <g key={c.name}>
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
        </div>
      </div>
      <figcaption>{entry.labeling.caption}</figcaption>
      {rows.length > 0 && (
        <div className="a11y-table-wrap">
        <table className="a11y-table">
          <thead>
            <tr><th scope="col">Reading order</th><th scope="col">Code</th><th scope="col">Announcement</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td><code>{r.code}</code></td>
                <td>{r.says}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </figure>
  )
}

// Focus order: badges sit in one row above the sample, in focus order, joined
// by a dashed line; each drops a hairline leader, like the Spec anatomy's, to
// the top of the element that draws the stop's ring. With `orderNearest`, a
// stop in the sample's lower half gets its badge in a second row below,
// leader rising to its bottom edge, so no leader crosses the sample.
type Stop = { badge: string; w: number; bx: number; tx: number; ty: number; row: number; edge: number }

function orderLayout(rings: Element[], origin: DOMRect, sample: DOMRect, nearest: boolean): Stop[] {
  const mid = (sample.top + sample.bottom) / 2
  const items = rings.map((ring, i) => {
    const box = ring.getBoundingClientRect()
    const below = nearest && (box.top + box.bottom) / 2 > mid
    // A link that wraps has one rect per line: point at the line nearest the badge.
    const lines = ring.getClientRects()
    const r = lines.length > 1 ? lines[below ? lines.length - 1 : 0] : box
    const row = below ? origin.height - BOTTOM / 2 : BOTTOM / 2
    const x = r.left - origin.left
    const badge = ordinal(i + 1)
    const w = badgeW(badge)
    return {
      badge, w, row,
      edge: below ? row - H / 2 : row + H / 2,
      ty: (below ? r.bottom : r.top) - origin.top,
      slot: { pref: x + r.width / 2, lo: x + 4, hi: x + r.width - 4, size: w },
    }
  })
  // Each row spaces its own badges.
  const bx: number[] = []
  for (const row of new Set(items.map((i) => i.row))) {
    const inRow = items.flatMap((item, i) => (item.row === row ? [i] : []))
    const { pos } = place(inRow.map((i) => items[i].slot))
    inRow.forEach((i, k) => (bx[i] = pos[k]))
  }
  return items.map(({ badge, w, ty, row, edge }, i) => ({ badge, w, bx: bx[i], tx: bx[i], ty, row, edge }))
}

// The dashed order line, one segment per row of badges.
const rowPaths = (stops: Stop[]) =>
  [...new Set(stops.map((s) => s.row))].flatMap((row) => {
    const xs = stops.filter((s) => s.row === row).map((s) => s.bx)
    return xs.length > 1 ? [`M${Math.min(...xs)} ${row}H${Math.max(...xs)}`] : []
  })

function Focus({ name, entry }: { name: string; entry: AccessibilityEntry }) {
  const { keyboard } = entry
  const sample = useMemo(() => keyboard.render(), [keyboard])
  const stage = useRef<HTMLDivElement>(null)
  const [stops, setStops] = useState<Stop[]>([])
  const [rows, setRows] = useState<Row[]>([])

  useLayoutEffect(() => {
    const el = stage.current!
    const target = el.querySelector(keyboard.focusTarget ?? FOCUSABLE)
    const demo = target ? (keyboard.ringOn?.(target) ?? target) : null
    demo?.classList.add('is-focus-demo')
    if (!keyboard.order) return () => demo?.classList.remove('is-focus-demo')

    const measure = () => {
      // The SVG covers the padded stage, not the sample, so measure from there.
      const origin = el.parentElement!.getBoundingClientRect()
      // Only stops on screen: a staged overlay's hidden trigger isn't one.
      const found = [...el.querySelectorAll(FOCUSABLE)].filter((stop) => stop.getClientRects().length > 0)
      const next = orderLayout(found.map((stop) => keyboard.ringOn?.(stop) ?? stop), origin, el.getBoundingClientRect(), !!keyboard.orderNearest)
      setStops((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
      // Stops numbered in order, disabled controls in place as "Skipped";
      // `tableRows` counts stops, so a cut never splits off a skipped row.
      const onScreen = (n: Element) => n.getClientRects().length > 0
      const nextRows: Row[] = []
      let n = 0
      for (const node of el.querySelectorAll(`${FOCUSABLE}, ${SKIPPED}`)) {
        if (!onScreen(node)) continue
        if (node.matches(SKIPPED)) {
          nextRows.push({ label: 'Skipped', code: markup(node), says: `${announce(node)} (reading mode only)` })
          continue
        }
        if (keyboard.tableRows !== undefined && n === keyboard.tableRows) break
        nextRows.push({ label: ordinal(++n), code: markup(node), says: announce(node) })
      }
      setRows((prev) => (JSON.stringify(prev) === JSON.stringify(nextRows) ? prev : nextRows))
    }
    measure()
    let live = true
    document.fonts.ready.then(() => live && measure())
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      live = false
      observer.disconnect()
      demo?.classList.remove('is-focus-demo')
    }
  }, [keyboard])

  return (
    <figure className="a11y-figure">
      <div className="a11y-canvas">
        <div className="a11y-stage" style={keyboard.order ? (keyboard.orderNearest ? { paddingBlock: BOTTOM } : { paddingTop: BOTTOM }) : undefined}>
          {/* The sample's links point nowhere; keep a click from jumping the page. */}
          <div
            ref={stage}
            className="ds-example"
            data-component={name}
            onClick={(e) => (e.target as Element).closest('a') && e.preventDefault()}
          >
            {sample}
          </div>
          {stops.length > 0 && (
            <svg className="anatomy-svg" aria-hidden="true">
              {rowPaths(stops).map((d) => <path key={d} className="a11y-order-path" d={d} />)}
              {stops.map((s) => (
                <g key={s.badge}>
                  <g className="anatomy-leader">
                    <path d={`M${s.bx},${s.edge}V${s.ty}`} />
                    <circle className="anatomy-dot" cx={s.tx} cy={s.ty} r={2} />
                  </g>
                  <rect className="anatomy-badge" x={s.bx - s.w / 2} y={s.row - H / 2} width={s.w} height={H} rx={H / 2} />
                  <text x={s.bx} y={s.row}>{s.badge}</text>
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>
      <figcaption>{keyboard.caption}</figcaption>
      {rows.length > 0 && (
        <div className="a11y-table-wrap">
          <table className="a11y-table">
            <thead>
              <tr><th scope="col">Focus order</th><th scope="col">Code</th><th scope="col">Announcement</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td><code>{r.code}</code></td>
                  <td>{r.says}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  )
}

export default function AccessibilityFigure({ name, figure }: { name: string; figure: 'names' | 'focus' }) {
  const entry = files[`../accessibility/${name}.tsx`].accessibility
  return figure === 'names' ? <Names name={name} entry={entry} /> : <Focus name={name} entry={entry} />
}
