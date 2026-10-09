import type { HTMLAttributes } from 'react'
import { Text } from '../Text'
import styles from './Badge.module.css'

export type BadgeVariant = 'outline' | 'filled'

export type BadgeProps = {
  variant?: BadgeVariant
  children: React.ReactNode
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'color' | 'onClick' | 'tabIndex' | 'role'>

export function Badge({ variant = 'outline', children, className, ...rest }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')} {...rest}>
      <Text as="span" size="body-small" color="subtle">
        {children}
      </Text>
    </span>
  )
}
