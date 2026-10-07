import type { ButtonHTMLAttributes } from 'react'
import styles from './Chip.module.css'

export type ChipProps = {
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  children: React.ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-pressed'>

export function Chip({ pressed = false, onPressedChange, onClick, children, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={[styles.chip, pressed && styles.pressed, className].filter(Boolean).join(' ')}
      onClick={e => {
        onClick?.(e)
        onPressedChange?.(!pressed)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
