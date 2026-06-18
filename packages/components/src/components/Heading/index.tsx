import type { HTMLAttributes, CSSProperties } from 'react'
import styles from './Heading.module.css'

export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
export type HeadingSize = 'title-small' | 'subheader' | 'headline' | 'headline-serif' | 'display'
export type HeadingColor = 'default' | 'subtle' | 'brand'

export type HeadingProps = {
  as?: HeadingTag
  size?: HeadingSize
  color?: HeadingColor
  className?: string
  style?: CSSProperties
  children?: React.ReactNode
} & Omit<HTMLAttributes<HTMLHeadingElement>, 'style'>

export function Heading({
  as: Tag = 'h2',
  size = 'headline',
  color,
  className,
  style,
  children,
  ...rest
}: HeadingProps) {
  return (
    <Tag
      className={[styles.root, styles[size], color && color !== 'default' && styles[color], className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  )
}
