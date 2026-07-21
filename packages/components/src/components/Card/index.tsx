import type { HTMLAttributes } from 'react'
import styles from './Card.module.css'

export type CardVariant = 'default' | 'elevated' | 'transparent'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export type CardProps = {
  variant?: CardVariant
  padding?: CardPadding
  children?: React.ReactNode
} & HTMLAttributes<HTMLDivElement>

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  style,
  children,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}: CardProps) {
  return (
    <div
      role={ariaLabel || ariaLabelledBy ? 'region' : undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={[styles.card, styles[variant], className].filter(Boolean).join(' ')}
      data-padding={padding}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
