import type { InputHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import styles from './Checkbox.module.css'

export type CheckboxProps = {
  label: string
  onCheckedChange?: (checked: boolean) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children' | 'size'>

// A native <input type="checkbox"> inside its <label>: label clicks, Space,
// form submission/reset and controlled (checked) or uncontrolled
// (defaultChecked) use all come from the platform. The input sits invisibly
// over the drawn box so it stays the real hit target and focus target.
export function Checkbox({ label, onCheckedChange, onChange, disabled, className, ...rest }: CheckboxProps) {
  return (
    <label className={[styles.root, disabled && styles.disabled, className].filter(Boolean).join(' ')}>
      <span className={styles.control}>
        <input
          type="checkbox"
          className={styles.input}
          disabled={disabled}
          onChange={e => {
            onChange?.(e)
            onCheckedChange?.(e.target.checked)
          }}
          {...rest}
        />
        <span className={styles.box} aria-hidden="true">
          <Icon name="check" size="sm" className={styles.check} />
        </span>
      </span>
      <span className={styles.label}>{label}</span>
    </label>
  )
}
