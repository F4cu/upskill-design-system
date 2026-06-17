import type { HTMLAttributes } from 'react'
import styles from './Divider.module.css'

export type DividerProps = HTMLAttributes<HTMLHRElement>

export function Divider({ className, ...rest }: DividerProps) {
  return (
    <hr
      className={[styles.divider, className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}
