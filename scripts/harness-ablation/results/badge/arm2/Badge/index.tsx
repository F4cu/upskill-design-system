import type { HTMLAttributes } from 'react'
import { Text } from '../Text'
import styles from './Badge.module.css'

export type BadgeVariant = 'outlined' | 'filled'

export type BadgeProps = {
  variant?: BadgeVariant
  children: string
} & Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children' | 'color' | 'onClick' | 'role' | 'tabIndex' | 'aria-label' | 'aria-labelledby'
>

export function Badge({ variant = 'outlined', children, className, ...rest }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')} {...rest}>
      <Text as="span" size="body-default" color="subtle">
        {children}
      </Text>
    </span>
  )
}
