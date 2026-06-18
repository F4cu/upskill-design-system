import { useState, useCallback } from 'react'

export type UseCarouselReturn = {
  offset: number
  canPrev: boolean
  canNext: boolean
  prev: () => void
  next: () => void
  reset: () => void
}

export function useCarousel(itemCount: number, visibleCount: number): UseCarouselReturn {
  const maxOffset = Math.max(0, itemCount - visibleCount)
  const [offset, setOffset] = useState(0)

  const prev = useCallback(() => setOffset((o) => Math.max(0, o - 1)), [])
  const next = useCallback(() => setOffset((o) => Math.min(maxOffset, o + 1)), [maxOffset])
  const reset = useCallback(() => setOffset(0), [])

  return {
    offset,
    canPrev: offset > 0,
    canNext: offset < maxOffset,
    prev,
    next,
    reset,
  }
}
