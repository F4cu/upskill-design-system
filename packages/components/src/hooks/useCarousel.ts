import { useState, useCallback } from 'react'
import type { FocusEvent } from 'react'

export type UseCarouselReturn = {
  offset: number
  canPrev: boolean
  canNext: boolean
  prev: () => void
  next: () => void
  reset: () => void
  /** Moves the window so the item at `index` is fully visible. */
  reveal: (index: number) => void
  /** Spread on the clip container: keeps a focused card inside the visible window (ADR-006 amendment 2026-11-12). */
  onFocus: (event: FocusEvent<HTMLElement>) => void
  /** Visible range after an arrow press ("Showing 2 to 4 of 6"), else empty. Render it in a polite live region. */
  announcement: string
}

/**
 * Manages offset-based carousel pagination state.
 *
 * The caller is responsible for the required DOM contract:
 * - Clip container: `overflow: hidden`, receives `onFocus`.
 * - Track: a `<ul role="list">` inside the clip, applying `transform: translateX(...)` from `offset`.
 * - Items: one `<li>` per card, direct children of the track.
 * - Arrows: `ButtonArrow` with an `aria-label` naming the carousel ("Previous saved courses").
 * - Live region: `<p aria-live="polite" className="visually-hidden">{announcement}</p>`.
 *
 * @example
 * <div style={{ overflow: 'hidden' }} onFocus={carousel.onFocus}>
 *   <ul role="list" aria-labelledby="saved-heading" style={{ display: 'flex', transform: `translateX(calc(-${offset} * (${CARD_WIDTH}px + gap)))`, transition: 'transform 300ms ease' }}>
 *     {items.map((item) => <li key={item.id}>…</li>)}
 *   </ul>
 * </div>
 */
export function useCarousel(itemCount: number, visibleCount: number): UseCarouselReturn {
  const maxOffset = Math.max(0, itemCount - visibleCount)
  const [offset, setOffset] = useState(0)
  const [moved, setMoved] = useState(false)

  const prev = useCallback(() => {
    setOffset((o) => Math.max(0, o - 1))
    setMoved(true)
  }, [])
  const next = useCallback(() => {
    setOffset((o) => Math.min(maxOffset, o + 1))
    setMoved(true)
  }, [maxOffset])
  const reset = useCallback(() => {
    setOffset(0)
    setMoved(false)
  }, [])

  const reveal = useCallback(
    (index: number) => {
      setOffset((o) => {
        if (index < o) return index
        if (index >= o + visibleCount) return Math.min(maxOffset, index - visibleCount + 1)
        return o
      })
      setMoved(false)
    },
    [visibleCount, maxOffset],
  )

  const onFocus = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const clip = event.currentTarget
      const overflowX = getComputedStyle(clip).overflowX
      // Native scroll (the mobile override): the browser already scrolls focus into view.
      if (overflowX === 'auto' || overflowX === 'scroll') return
      // overflow: hidden is still programmatically scrollable; focus would scroll it out of sync with the transform.
      clip.scrollLeft = 0
      const item = (event.target as HTMLElement).closest('li')
      if (!item?.parentElement || !clip.contains(item)) return
      reveal(Array.prototype.indexOf.call(item.parentElement.children, item))
    },
    [reveal],
  )

  const first = Math.min(offset + 1, itemCount)
  const last = Math.min(offset + visibleCount, itemCount)

  return {
    offset,
    canPrev: offset > 0,
    canNext: offset < maxOffset,
    prev,
    next,
    reset,
    reveal,
    onFocus,
    announcement: moved ? `Showing ${first} to ${last} of ${itemCount}` : '',
  }
}
