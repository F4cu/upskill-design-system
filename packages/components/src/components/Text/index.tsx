import type { ElementType, HTMLAttributes, CSSProperties } from 'react'
import styles from './Text.module.css'

export type TextSize = 'body-default' | 'body-small' | 'metadata' | 'label' | 'inherit'
export type TextColor = 'default' | 'subtle' | 'brand' | 'disabled' | 'inverted' | 'inverted-subtle' | 'accent-inverted'

export type TextProps = {
  as?: ElementType
  size?: TextSize
  color?: TextColor
  className?: string
  htmlFor?: string
  style?: CSSProperties
  children?: React.ReactNode
} & Omit<HTMLAttributes<HTMLElement>, 'style'>

export function Text({
  as: Tag = 'p',
  size = 'body-default',
  color,
  className,
  style,
  children,
  ...rest
}: TextProps) {
  return (
    <Tag
      className={[styles.text, styles[size], color && color !== 'default' && styles[color], className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  )
}
