import type { HTMLAttributes, ReactNode } from 'react'
import { Text } from '../Text'
import styles from './Badge.module.css'

export type BadgeVariant = 'outline' | 'filled'

export type BadgeProps = {
  variant?: BadgeVariant
  children: ReactNode
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>

export function Badge({ variant = 'outline', className, children, ...rest }: BadgeProps) {
  return (
    <Text
      {...rest}
      as="span"
      size="body-small"
      color="subtle"
      className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')}
    >
      {children}
    </Text>
  )
}
