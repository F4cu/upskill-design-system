import type { ButtonHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import type { IconName } from '../Icon'
import styles from './Button.module.css'

export type ButtonVariant = 'default' | 'outlined'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonShape = 'square' | 'round'

export type ButtonProps = {
  /** Visual style of the button. Use `default` for primary actions, `outlined` for secondary or low-emphasis actions. */
  variant?: ButtonVariant
  /** Size of the button. `md` suits most contexts; use `sm` in dense UIs and `lg` for prominent calls to action. */
  size?: ButtonSize
  /** When set, renders an icon-only button. `square` keeps right-angle corners; `round` fully rounds them. Requires an `icon` prop — `children` is ignored. */
  shape?: ButtonShape
  /** Icon to render. When combined with `children`, appears to the left of the label. When `shape` is set, this is the sole visible content. */
  icon?: IconName
  /** Button label. Ignored when `shape` is set (icon-only mode). */
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
