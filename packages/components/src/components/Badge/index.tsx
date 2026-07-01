import type { HTMLAttributes } from 'react'
import { Text } from '../Text'
import styles from './Badge.module.css'

export type BadgeVariant = 'outline' | 'filled'

export type BadgeProps = {
  label: string
  variant?: BadgeVariant
} & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>

export function Badge({ label, variant = 'outline', className, ...rest }: BadgeProps) {
  return (
    <Text
      {...rest}
      as="span"
      size="body-small"
      color="subtle"
      className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')}
    >
      {label}
    </Text>
  )
}
