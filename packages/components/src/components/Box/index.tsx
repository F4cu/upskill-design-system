import type { ElementType, HTMLAttributes, CSSProperties } from 'react'
import styles from './Box.module.css'

type SpaceInset = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl'

export type BoxProps = {
  as?: ElementType
  padding?: SpaceInset
  paddingX?: SpaceInset
  paddingY?: SpaceInset
  className?: string
  style?: CSSProperties
  children?: React.ReactNode
} & Omit<HTMLAttributes<HTMLElement>, 'style'>

export function Box({
  as: Tag = 'div',
  padding,
  paddingX,
  paddingY,
  className,
  style,
  children,
  ...rest
}: BoxProps) {
  const cssVars: CSSProperties = {
    '--_padding': padding ? `var(--ds-space-inset-${padding})` : undefined,
    '--_padding-x': paddingX ? `var(--ds-space-inset-${paddingX})` : undefined,
    '--_padding-y': paddingY ? `var(--ds-space-inset-${paddingY})` : undefined,
    ...style,
  }

  return (
    <Tag
      className={[styles.box, className].filter(Boolean).join(' ')}
      style={cssVars}
      {...rest}
    >
      {children}
    </Tag>
  )
}
