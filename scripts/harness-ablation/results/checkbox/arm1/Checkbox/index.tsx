import type { InputHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import { Text } from '../Text'
import styles from './Checkbox.module.css'

export type CheckboxProps = {
  label: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children' | 'size'>

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <Text as="label" className={[styles.root, rest.disabled && styles.disabled, className].filter(Boolean).join(' ')}>
      <span className={styles.control}>
        <input type="checkbox" className={styles.input} {...rest} />
        <Icon name="check" size="sm" className={styles.check} />
      </span>
      {label}
    </Text>
  )
}
