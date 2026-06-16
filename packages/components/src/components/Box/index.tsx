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
  const resolvedX = paddingX ?? padding
  const resolvedY = paddingY ?? padding
  const cssVars: CSSProperties = {
    '--_box-px': resolvedX ? `var(--ds-space-inset-${resolvedX})` : '0',
    '--_box-py': resolvedY ? `var(--ds-space-inset-${resolvedY})` : '0',
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
