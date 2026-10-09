import type { InputHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import { Text } from '../Text'
import styles from './Checkbox.module.css'
import utilStyles from '../../styles/utilities.module.css'

export type CheckboxProps = {
  label: string
  hideLabel?: boolean
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children' | 'size'>

export function Checkbox({ label, hideLabel, disabled, className, ...rest }: CheckboxProps) {
  return (
    <label className={[styles.root, disabled && styles.disabled, className].filter(Boolean).join(' ')}>
      <span className={styles.control}>
        <input type="checkbox" className={styles.input} disabled={disabled} {...rest} />
        <span className={styles.check}>
          <Icon name="check" size="sm" />
        </span>
      </span>
      <Text as="span" color={disabled ? 'disabled' : undefined} className={hideLabel ? utilStyles.visuallyHidden : undefined}>
        {label}
      </Text>
    </label>
  )
}
