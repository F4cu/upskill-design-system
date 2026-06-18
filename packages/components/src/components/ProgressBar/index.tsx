import type { CSSProperties, HTMLAttributes } from 'react'
import styles from './ProgressBar.module.css'

export type ProgressBarProps = {
  value: number
} & HTMLAttributes<HTMLDivElement>

export function ProgressBar({ value, className, style, ...rest }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  const cssVars = {
    '--_fill': `${clamped}%`,
    ...style,
  } as CSSProperties

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={[styles.track, className].filter(Boolean).join(' ')}
      style={cssVars}
      {...rest}
    >
      <div className={styles.fill} />
    </div>
  )
}
