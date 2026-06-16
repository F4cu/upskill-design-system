import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import styles from './Checkbox.module.css'

export type CheckboxProps = {
  label: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'type'>

export function Checkbox({ label, id: idProp, className, ...rest }: CheckboxProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId

  return (
    <label htmlFor={id} className={[styles.root, className].filter(Boolean).join(' ')}>
      <input type="checkbox" id={id} className={styles.checkbox} {...rest} />
      <span className={styles.label}>{label}</span>
    </label>
  )
}
