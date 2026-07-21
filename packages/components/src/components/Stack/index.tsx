import type { ElementType, HTMLAttributes, CSSProperties } from 'react'
import styles from './Stack.module.css'

type StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
type StackJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'

export type StackProps = {
  as?: ElementType
  gap?: StackGap
  align?: StackAlign
  justify?: StackJustify
  fullWidth?: boolean
  minWidth?: string | number
  maxWidth?: string | number
  minHeight?: string | number
  maxHeight?: string | number
  grow?: number
  className?: string
  style?: CSSProperties
  children?: React.ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'style'>

export function Stack({
  as: Tag = 'div',
  gap,
  align,
  justify,
  fullWidth,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  grow,
  className,
  style,
  children,
  ...rest
}: StackProps) {
  const layoutStyle: CSSProperties = {
    ...(minWidth !== undefined && { minWidth }),
    ...(maxWidth !== undefined && { maxWidth }),
    ...(minHeight !== undefined && { minHeight }),
    ...(maxHeight !== undefined && { maxHeight }),
    ...(grow !== undefined && { flex: `${grow} 0 0` }),
    ...style,
  }

  return (
    <Tag
      className={[styles.stack, fullWidth && styles.fullWidth, className].filter(Boolean).join(' ')}
      data-gap={gap}
      data-align={align}
      data-justify={justify}
      style={layoutStyle}
      {...rest}
    >
      {children}
    </Tag>
  )
}
