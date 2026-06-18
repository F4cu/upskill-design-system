import type { HTMLAttributes } from 'react'
import styles from './ScrollArea.module.css'

export type ScrollAreaOrientation = 'horizontal' | 'vertical'

export type ScrollAreaProps = {
  orientation?: ScrollAreaOrientation
  children?: React.ReactNode
} & HTMLAttributes<HTMLDivElement>

export function ScrollArea({
  orientation = 'horizontal',
  className,
  children,
  ...rest
}: ScrollAreaProps) {
  return (
    <div
      className={[styles.scrollArea, styles[orientation], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
