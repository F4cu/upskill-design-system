import type { HTMLAttributes } from 'react'
import styles from './Badge.module.css'

export type BadgeVariant = 'bordered' | 'filled'

export type BadgeProps = {
  variant?: BadgeVariant
  children: React.ReactNode
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>

export function Badge({ variant = 'bordered', children, className, ...rest }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </span>
  )
}
