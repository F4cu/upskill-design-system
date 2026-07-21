import type { ElementType, HTMLAttributes, CSSProperties } from 'react'
import styles from './Inline.module.css'

type InlineGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
type InlineAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
type InlineJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'

export type InlineProps = {
  as?: ElementType
  gap?: InlineGap
  align?: InlineAlign
  justify?: InlineJustify
  wrap?: boolean
  fullWidth?: boolean
  className?: string
  style?: CSSProperties
  children?: React.ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'style'>

export function Inline({
  as: Tag = 'div',
  gap,
  align,
  justify,
  wrap = true,
  fullWidth,
  className,
  style,
  children,
  ...rest
}: InlineProps) {
  return (
    <Tag
      className={[styles.inline, !wrap && styles.noWrap, fullWidth && styles.fullWidth, className].filter(Boolean).join(' ')}
      data-gap={gap}
      data-align={align}
      data-justify={justify}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  )
}
