import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import styles from './Select.module.css'
import utilStyles from '../../styles/utilities.module.css'

export type SelectOption = { value: string; label: string }

export type SelectProps = {
  label: string
  hideLabel?: boolean
  options: SelectOption[]
  placeholder?: string
  error?: string
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'>

export function Select({
  label,
  hideLabel,
  options,
  placeholder,
  error,
  id: idProp,
  className,
  ...rest
}: SelectProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const errorId = `${id}-error`

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <label
        htmlFor={id}
        className={[utilStyles.label, hideLabel && utilStyles.visuallyHidden].filter(Boolean).join(' ')}
      >
        {label}
      </label>
      <div className={styles.wrapper}>
        <select
          id={id}
          className={[styles.select, error && styles.hasError].filter(Boolean).join(' ')}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(({ value, label: optionLabel }) => (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          ))}
        </select>
        <span className={styles.arrow} aria-hidden="true">
          <Icon name="chevron-down" size="sm" />
        </span>
      </div>
      {error && (
        <span id={errorId} className={styles.errorMessage} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
