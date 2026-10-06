import type { ButtonHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import type { IconName } from '../Icon'
import styles from './Button.module.css'

export type ButtonVariant = 'accent' | 'neutral' | 'transparent' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonShape = 'square' | 'round'

export type ButtonProps = {
  /** Visual weight of the button. Names an absolute weight, not a rank — which weight to use depends on the container (ADR-024). `accent`: the one most important action in a decision region (form or dialog footer, hero); never inside a repeated item such as a card. `neutral` (default): everyday and supporting actions, and the lead action inside cards. `transparent`: lowest weight — a ghost button with no fill at rest and a subtle fill on hover ("Show more", Close). `danger`: destructive or irreversible actions. */
  variant?: ButtonVariant
  /** Size of the button. `md` suits most contexts; use `sm` in dense UIs and `lg` for prominent calls to action. */
  size?: ButtonSize
  /** When set, renders an icon-only button. `square` keeps right-angle corners; `round` fully rounds them. Requires an `icon` prop — `children` is ignored. */
  shape?: ButtonShape
  /** Icon to render before the label. When `shape` is set, this is the sole visible content. */
  icon?: IconName
  /** Icon to render after the label. Use for directional cues (e.g. chevron-down on a transparent toggle). Ignored in icon-only mode. */
  trailingIcon?: IconName
  /** Button label. Ignored when `shape` is set (icon-only mode). */
  children?: React.ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export function Button({
  variant = 'neutral',
  size = 'md',
  shape,
  icon,
  trailingIcon,
  className,
  children,
  ...rest
}: ButtonProps) {
  const iconSize = size === 'sm' ? 'sm' : 'md'
  return (
    <button
      type="button"
      className={[styles.button, styles[variant], styles[size], shape && styles[shape], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon && <Icon name={icon} size={iconSize} />}
      {!shape && children}
      {!shape && trailingIcon && <Icon name={trailingIcon} size={iconSize} />}
    </button>
  )
}
