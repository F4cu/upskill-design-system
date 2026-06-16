import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import styles from './Select.module.css'

export type SelectOption = { value: string; label: string }

export type SelectProps = {
  label: string
  options: SelectOption[]
  placeholder?: string
  error?: string
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'>

export function Select({
  label,
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
      <label htmlFor={id} className={styles.label}>
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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
