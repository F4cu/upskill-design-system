import type { InputHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import { Text } from '../Text'
import styles from './Checkbox.module.css'

export type CheckboxProps = {
  label: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'type' | 'size'>

export function Checkbox({ label, disabled, className, ...rest }: CheckboxProps) {
  return (
    <label className={[styles.root, disabled && styles.disabled, className].filter(Boolean).join(' ')}>
      <span className={styles.control}>
        <input type="checkbox" className={styles.input} disabled={disabled} {...rest} />
        <span className={styles.mark} aria-hidden="true">
          <Icon name="check" size="sm" />
        </span>
      </span>
      <Text as="span" color={disabled ? 'disabled' : undefined}>
        {label}
      </Text>
    </label>
  )
}
