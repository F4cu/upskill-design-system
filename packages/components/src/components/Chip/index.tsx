import type { ButtonHTMLAttributes } from 'react'
import styles from './Chip.module.css'

export type ChipProps = {
  selected?: boolean
  children: React.ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export function Chip({ selected = false, children, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={[styles.chip, selected && styles.selected, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
