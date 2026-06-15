import type { ElementType, HTMLAttributes, CSSProperties } from 'react'
import styles from './Text.module.css'

type TextSize = 'body-default' | 'body-small' | 'metadata' | 'label'
type TextColor = 'default' | 'subtle' | 'brand' | 'disabled'

export type TextProps = {
  as?: ElementType
  size?: TextSize
  color?: TextColor
  className?: string
  style?: CSSProperties
  children?: React.ReactNode
} & Omit<HTMLAttributes<HTMLElement>, 'style'>

const colorVars: Record<TextColor, string> = {
  default: 'var(--ds-color-text-default)',
  subtle: 'var(--ds-color-text-subtle)',
  brand: 'var(--ds-color-text-brand)',
  disabled: 'var(--ds-color-text-disabled)',
}

export function Text({
  as: Tag = 'p',
  size = 'body-default',
  color,
  className,
  style,
  children,
  ...rest
}: TextProps) {
  const cssVars: CSSProperties = {
    '--_color': color ? colorVars[color] : undefined,
    ...style,
  }

  return (
    <Tag
      className={[styles.text, styles[size], className].filter(Boolean).join(' ')}
      style={cssVars}
      {...rest}
    >
      {children}
    </Tag>
  )
}
