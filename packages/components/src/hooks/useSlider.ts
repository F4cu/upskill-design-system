import { useState, useCallback } from 'react'

export type UseSliderReturn = {
  currentIndex: number
  total: number
  goNext: () => void
  goPrev: () => void
  isFirst: boolean
  isLast: boolean
}

export function useSlider(total: number): UseSliderReturn {
  const [currentIndex, setCurrentIndex] = useState(0)

  const goNext = useCallback(() => setCurrentIndex((i) => Math.min(total - 1, i + 1)), [total])
  const goPrev = useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), [])

  return {
    currentIndex,
    total,
    goNext,
    goPrev,
    isFirst: currentIndex === 0,
    isLast: currentIndex === total - 1,
  }
}
