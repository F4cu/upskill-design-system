import type { ButtonHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import styles from './ButtonArrow.module.css'

export type ButtonArrowDirection = 'left' | 'right'

export type ButtonArrowProps = {
  direction: ButtonArrowDirection
} & ButtonHTMLAttributes<HTMLButtonElement>

export function ButtonArrow({ direction, className, ...rest }: ButtonArrowProps) {
  return (
    <button
      type="button"
      aria-label={direction === 'left' ? 'Previous' : 'Next'}
      className={[styles.button, className].filter(Boolean).join(' ')}
      {...rest}
    >
      <Icon
        name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
        size="md"
        className={direction === 'left' ? styles.iconLeft : styles.iconRight}
      />
    </button>
  )
}
