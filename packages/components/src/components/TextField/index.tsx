import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import type { IconName } from '../Icon'
import { Text } from '../Text'
import styles from './TextField.module.css'
import utilStyles from '../../styles/utilities.module.css'

export type TextFieldSize = 'default' | 'large'
export type TextFieldShape = 'square' | 'round'

export type TextFieldProps = {
  label: string
  hideLabel?: boolean
  error?: string
  size?: TextFieldSize
  shape?: TextFieldShape
  icon?: IconName
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'size'>

export function TextField({ label, hideLabel, error, size = 'default', shape = 'square', icon, id: idProp, className, ...rest }: TextFieldProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const errorId = `${id}-error`

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <Text
        as="label"
        htmlFor={id}
        className={[utilStyles.label, hideLabel && utilStyles.visuallyHidden].filter(Boolean).join(' ')}
      >
        {label}
      </Text>
      <div className={styles.inputWrapper}>
        {icon && (
          <span className={styles.iconSlot}>
            <Icon name={icon} size="sm" />
          </span>
        )}
        <input
          id={id}
          className={[
            styles.input,
            size === 'large' && styles.sizeLarge,
            shape === 'round' && styles.shapeRound,
            icon && styles.hasIcon,
            error && styles.hasError,
          ].filter(Boolean).join(' ')}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
      </div>
      {error && (
        <Text as="span" id={errorId} className={styles.errorMessage} role="alert">
          {error}
        </Text>
      )}
    </div>
  )
}
