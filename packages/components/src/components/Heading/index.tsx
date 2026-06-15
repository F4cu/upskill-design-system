import type { HTMLAttributes, CSSProperties } from 'react'
import styles from './Heading.module.css'

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
type HeadingSize = 'title-small' | 'subheader' | 'headline' | 'headline-serif' | 'display'
type HeadingColor = 'default' | 'subtle' | 'brand'

export type HeadingProps = {
  as?: HeadingTag
  size?: HeadingSize
  color?: HeadingColor
  className?: string
  style?: CSSProperties
  children?: React.ReactNode
} & Omit<HTMLAttributes<HTMLHeadingElement>, 'style'>

const colorVars: Record<HeadingColor, string> = {
  default: 'var(--ds-color-text-default)',
  subtle: 'var(--ds-color-text-subtle)',
  brand: 'var(--ds-color-text-brand)',
}

export function Heading({
  as: Tag = 'h2',
  size = 'headline',
  color,
  className,
  style,
  children,
  ...rest
}: HeadingProps) {
  const cssVars: CSSProperties = {
    '--_color': color ? colorVars[color] : undefined,
    ...style,
  }

  return (
    <Tag
      className={[styles.heading, styles[size], className].filter(Boolean).join(' ')}
      style={cssVars}
      {...rest}
    >
      {children}
    </Tag>
  )
}
