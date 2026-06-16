import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import styles from './TextField.module.css'
import utilStyles from '../../styles/utilities.module.css'

export type TextFieldProps = {
  label: string
  hideLabel?: boolean
  error?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'children'>

export function TextField({ label, hideLabel, error, id: idProp, className, ...rest }: TextFieldProps) {
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
      <input
        id={id}
        className={[styles.input, error && styles.hasError].filter(Boolean).join(' ')}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error && (
        <span id={errorId} className={styles.errorMessage} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
