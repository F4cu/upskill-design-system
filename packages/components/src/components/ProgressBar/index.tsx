import type { CSSProperties, HTMLAttributes } from 'react'
import styles from './ProgressBar.module.css'

type ProgressBarName =
  | {
      /** Accessible name. Defaults to "Progress"; describe what is progressing when several bars share a page. */
      label?: string
      'aria-labelledby'?: never
    }
  | {
      /** Id of a visible element that names the bar (e.g. a card title). Replaces `label`. */
      'aria-labelledby': string
      label?: never
    }

export type ProgressBarProps = {
  value: number
} & ProgressBarName &
  Omit<HTMLAttributes<HTMLDivElement>, 'aria-label' | 'aria-labelledby'>

export function ProgressBar({
  value,
  label = 'Progress',
  'aria-labelledby': labelledBy,
  className,
  style,
  ...rest
}: ProgressBarProps) {
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
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className={[styles.track, className].filter(Boolean).join(' ')}
      style={cssVars}
      {...rest}
    >
      <div className={styles.fill} />
    </div>
  )
}
