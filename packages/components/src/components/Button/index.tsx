import type { ButtonHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import type { IconName } from '../Icon'
import styles from './Button.module.css'

export type ButtonVariant = 'default' | 'outlined'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonShape = 'square' | 'round'

export type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  shape?: ButtonShape
  icon?: IconName
  children?: React.ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export function Button({
  variant = 'default',
  size = 'md',
  shape,
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[styles.button, styles[variant], styles[size], shape && styles[shape], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 'sm' : 'md'} />}
      {!shape && children}
    </button>
  )
}
