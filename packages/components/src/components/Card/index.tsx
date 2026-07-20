import type { CSSProperties, HTMLAttributes } from 'react'
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
  const cssVars = {
    '--_card-inset': padding !== 'none' ? `var(--ds-space-inset-${padding})` : '0',
    ...style,
  } as CSSProperties

  return (
    <div
      role={ariaLabel || ariaLabelledBy ? 'region' : undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={[styles.card, styles[variant], className].filter(Boolean).join(' ')}
      style={cssVars}
      {...rest}
    >
      {children}
    </div>
  )
}
