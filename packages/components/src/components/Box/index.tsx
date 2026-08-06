import type { ElementType, HTMLAttributes, CSSProperties } from 'react'
import styles from './Box.module.css'

type SpaceInset = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl'
type Overflow = 'hidden' | 'auto' | 'scroll' | 'visible' | 'clip'
export type BoxBackground = 'canvas' | 'inverted' | 'transparent' | 'elevated'
export type BoxBorderTop = 'default' | 'inverted'

export type BoxProps = {
  as?: ElementType
  padding?: SpaceInset
  paddingX?: SpaceInset
  paddingY?: SpaceInset
  overflow?: Overflow
  background?: BoxBackground
  borderTop?: BoxBorderTop
  minWidth?: string | number
  maxWidth?: string | number
  minHeight?: string | number
  maxHeight?: string | number
  grow?: number
  className?: string
  style?: CSSProperties
  children?: React.ReactNode
} & Omit<HTMLAttributes<HTMLElement>, 'style'>

export function Box({
  as: Tag = 'div',
  padding,
  paddingX,
  paddingY,
  overflow,
  background,
  borderTop,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  grow,
  className,
  style,
  children,
  ...rest
}: BoxProps) {
  const resolvedX = paddingX ?? padding
  const resolvedY = paddingY ?? padding
  const layoutStyle: CSSProperties = {
    ...(overflow && { overflow }),
    ...(minWidth !== undefined && { minWidth }),
    ...(maxWidth !== undefined && { maxWidth }),
    ...(minHeight !== undefined && { minHeight }),
    ...(maxHeight !== undefined && { maxHeight }),
    ...(grow !== undefined && { flex: `${grow} 0 0` }),
    ...style,
  }

  return (
    <Tag
      className={[styles.box, background && styles[background], className].filter(Boolean).join(' ')}
      data-px={resolvedX}
      data-py={resolvedY}
      data-border-top={borderTop}
      style={layoutStyle}
      {...rest}
    >
      {children}
    </Tag>
  )
}
