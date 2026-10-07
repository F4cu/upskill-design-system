import type { ButtonHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import type { IconName } from '../Icon'
import styles from './Button.module.css'

export type ButtonVariant = 'accent' | 'neutral' | 'transparent' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonShape = 'square' | 'round'

type ButtonBaseProps = {
  /** Visual weight of the button. Names an absolute weight, not a rank — which weight to use depends on the container (ADR-024). `accent`: the one most important action in a decision region (form or dialog footer, hero); never inside a repeated item such as a card. `neutral` (default): everyday and supporting actions, and the lead action inside cards. `transparent`: lowest weight — a ghost button with no fill at rest and a subtle fill on hover ("Show more", Close). `danger`: destructive or irreversible actions. */
  variant?: ButtonVariant
  /** Size of the button. `md` suits most contexts; use `sm` in dense UIs and `lg` for prominent calls to action. */
  size?: ButtonSize
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

type ButtonWithLabelProps = ButtonBaseProps & {
  shape?: never
  /** Icon to render before the label. */
  icon?: IconName
  /** Icon to render after the label. Use for directional cues (e.g. chevron-down on a transparent toggle). */
  trailingIcon?: IconName
  /** Button label. */
  children?: React.ReactNode
}

// Icon-only: the glyph is the only visible content, so the icon and an
// accessible name are required and label content is a type error.
type ButtonIconOnlyProps = ButtonBaseProps & {
  /** Renders an icon-only button. `square` keeps right-angle corners; `round` fully rounds them. */
  shape: ButtonShape
  /** The button's only visible content. */
  icon: IconName
  /** Accessible name; nothing visible labels an icon-only button. */
  'aria-label': string
  trailingIcon?: never
  children?: never
}

export type ButtonProps = ButtonWithLabelProps | ButtonIconOnlyProps

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
