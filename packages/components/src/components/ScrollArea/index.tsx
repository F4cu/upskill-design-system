import type { HTMLAttributes } from 'react'
import styles from './ScrollArea.module.css'

export type ScrollAreaOrientation = 'horizontal' | 'vertical'

export type ScrollAreaProps = {
  orientation?: ScrollAreaOrientation
  maxHeight?: string | number
  children?: React.ReactNode
} & HTMLAttributes<HTMLDivElement>

export function ScrollArea({
  orientation = 'horizontal',
  maxHeight,
  className,
  style,
  children,
  ...rest
}: ScrollAreaProps) {
  return (
    <div
      className={[styles.scrollArea, styles[orientation], className].filter(Boolean).join(' ')}
      style={maxHeight !== undefined ? { maxHeight, ...style } : style}
      {...rest}
    >
      {children}
    </div>
  )
}
