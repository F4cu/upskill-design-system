import type { HTMLAttributes, CSSProperties } from 'react'
import styles from './Stack.module.css'

type StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
type StackJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'

export type StackProps = {
  gap?: StackGap
  align?: StackAlign
  justify?: StackJustify
  className?: string
  style?: CSSProperties
  children?: React.ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'style'>

const alignMap: Record<StackAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
}

const justifyMap: Record<StackJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
  'space-around': 'space-around',
  'space-evenly': 'space-evenly',
}

export function Stack({
  gap,
  align,
  justify,
  className,
  style,
  children,
  ...rest
}: StackProps) {
  const cssVars: CSSProperties = {
    '--_gap': gap ? `var(--ds-space-stack-${gap})` : undefined,
    '--_align': align ? alignMap[align] : undefined,
    '--_justify': justify ? justifyMap[justify] : undefined,
    ...style,
  }

  return (
    <div
      className={[styles.stack, className].filter(Boolean).join(' ')}
      style={cssVars}
      {...rest}
    >
      {children}
    </div>
  )
}
