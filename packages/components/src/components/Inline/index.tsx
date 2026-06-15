import type { HTMLAttributes, CSSProperties } from 'react'
import styles from './Inline.module.css'

type InlineGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
type InlineAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
type InlineJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'

export type InlineProps = {
  gap?: InlineGap
  align?: InlineAlign
  justify?: InlineJustify
  wrap?: boolean
  className?: string
  style?: CSSProperties
  children?: React.ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'style'>

const alignMap: Record<InlineAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
}

const justifyMap: Record<InlineJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
  'space-around': 'space-around',
  'space-evenly': 'space-evenly',
}

export function Inline({
  gap,
  align,
  justify,
  wrap = true,
  className,
  style,
  children,
  ...rest
}: InlineProps) {
  const cssVars: CSSProperties = {
    '--_gap': gap ? `var(--ds-space-inline-${gap})` : undefined,
    '--_align': align ? alignMap[align] : undefined,
    '--_justify': justify ? justifyMap[justify] : undefined,
    ...style,
  }

  return (
    <div
      className={[styles.inline, !wrap && styles.noWrap, className].filter(Boolean).join(' ')}
      style={cssVars}
      {...rest}
    >
      {children}
    </div>
  )
}
