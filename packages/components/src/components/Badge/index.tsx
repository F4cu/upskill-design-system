import type { HTMLAttributes } from 'react'
import styles from './Badge.module.css'

export type BadgeVariant = 'outline' | 'filled'

export type BadgeProps = {
  label: string
  variant?: BadgeVariant
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>

export function Badge({ label, variant = 'outline', className, ...rest }: BadgeProps) {
  return (
    <span
      className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {label}
    </span>
  )
}
